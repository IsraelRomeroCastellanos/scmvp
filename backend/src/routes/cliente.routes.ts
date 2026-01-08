// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type AuthedUser = {
  id: number;
  email: string;
  rol: 'admin' | 'consultor' | 'cliente' | string;
  empresa_id: number | null;
};

type AuthedRequest = Request & { user?: AuthedUser };

const router = Router();

/** Helpers */
function isNonEmptyString(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function pickClienteRow(row: any) {
  // Mantén una respuesta pequeña/estable (id + básicos)
  return {
    id: row?.id,
    empresa_id: row?.empresa_id,
    nombre_entidad: row?.nombre_entidad,
    tipo_cliente: row?.tipo_cliente,
    nacionalidad: row?.nacionalidad,
    estado: row?.estado,
    creado_en: row?.creado_en,
    actualizado_en: row?.actualizado_en
  };
}

function pgErrorToHttp(e: any) {
  // Postgres error codes:
  // 23505 unique_violation
  // 23503 foreign_key_violation
  // 22P02 invalid_text_representation (ej. id inválido)
  const code = e?.code;

  if (code === '23505') {
    return { status: 409, body: { error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' } };
  }
  if (code === '23503') {
    return { status: 400, body: { error: 'empresa_id inválido (no existe o viola relación)' } };
  }
  if (code === '22P02') {
    return { status: 400, body: { error: 'Formato inválido (id/numero)' } };
  }
  return null;
}

/**
 * ===============================
 * GET /api/cliente/clientes
 * (lista “mis-clientes”: por empresa_id del token o por query ?empresa_id=)
 * ===============================
 */
router.get('/clientes', authenticate, async (req: AuthedRequest, res: Response) => {
  try {
    const empresaIdFromToken = req.user?.empresa_id ?? null;
    const empresaIdQuery = req.query?.empresa_id ? toInt(req.query.empresa_id) : null;

    const empresa_id = empresaIdQuery ?? empresaIdFromToken;
    if (!empresa_id) {
      // Para admin sin empresa activa, obligamos a pasar empresa_id explícito
      return res.status(400).json({ error: 'empresa_id es requerido (token sin empresa_id)' });
    }

    const result = await pool.query(
      `
      SELECT id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY id DESC
      LIMIT 200
      `,
      [empresa_id]
    );

    return res.json({ clientes: result.rows });
  } catch (e: any) {
    console.error('Error al listar clientes:', e);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
});

/**
 * ===============================
 * GET /api/cliente/clientes/:id
 * ===============================
 */
router.get('/clientes/:id', authenticate, async (req: AuthedRequest, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const result = await pool.query(`SELECT * FROM clientes WHERE id = $1 LIMIT 1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (e: any) {
    const mapped = pgErrorToHttp(e);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    console.error('Error al obtener cliente:', e);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * POST /api/cliente/registrar-cliente
 * ===============================
 */
router.post('/registrar-cliente', authenticate, async (req: AuthedRequest, res: Response) => {
  try {
    const {
      empresa_id: empresaIdBody,
      tipo_cliente,
      nombre_entidad,
      nacionalidad,
      datos_completos
    } = req.body ?? {};

    const empresa_id = toInt(empresaIdBody);
    if (!empresa_id) return res.status(400).json({ error: 'empresa_id inválido' });

    const tipo = String(tipo_cliente || '').trim() as TipoCliente;
    if (!['persona_fisica', 'persona_moral', 'fideicomiso'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo_cliente inválido' });
    }

    if (!isNonEmptyString(nombre_entidad)) {
      return res.status(400).json({ error: 'nombre_entidad es obligatorio' });
    }
    if (!isNonEmptyString(nacionalidad)) {
      return res.status(400).json({ error: 'nacionalidad es obligatoria' });
    }

    // datos_completos es requerido para esta iteración
    if (!datos_completos || typeof datos_completos !== 'object') {
      return res.status(400).json({ error: 'datos_completos es obligatorio' });
    }

    // Validaciones mínimas por tipo (bloqueantes)
    const contacto = (datos_completos as any).contacto ?? {};
    if (!isNonEmptyString(contacto?.pais)) {
      return res.status(400).json({ error: 'contacto.pais es obligatorio' });
    }
    if (!isNonEmptyString(contacto?.telefono)) {
      return res.status(400).json({ error: 'contacto.telefono es obligatorio' });
    }

    if (tipo === 'fideicomiso') {
      const fidei = (datos_completos as any).fideicomiso ?? {};
      const rep = (datos_completos as any).representante ?? {};

      if (!isNonEmptyString(fidei?.denominacion_fiduciario)) {
        return res.status(400).json({ error: 'fideicomiso.denominacion_fiduciario es obligatorio' });
      }
      if (!isNonEmptyString(fidei?.rfc_fiduciario)) {
        return res.status(400).json({ error: 'fideicomiso.rfc_fiduciario es obligatorio' });
      }
      if (!isNonEmptyString(fidei?.identificador)) {
        return res.status(400).json({ error: 'fideicomiso.identificador es obligatorio' });
      }

      // Tu requisito: representante mínimo (obligatorio)
      if (!isNonEmptyString(rep?.nombre_completo)) {
        return res.status(400).json({ error: 'representante.nombre_completo es obligatorio' });
      }
      if (!isNonEmptyString(rep?.fecha_nacimiento)) {
        return res.status(400).json({ error: 'representante.fecha_nacimiento es obligatorio (AAAAMMDD)' });
      }
      if (!isNonEmptyString(rep?.rfc)) {
        return res.status(400).json({ error: 'representante.rfc es obligatorio' });
      }
      if (!isNonEmptyString(rep?.curp)) {
        return res.status(400).json({ error: 'representante.curp es obligatorio' });
      }
    }

    // Inserta (si hay unique (empresa_id, nombre_entidad), lo mapeará a 409 en catch)
    const insert = await pool.query(
      `
      INSERT INTO clientes
        (empresa_id, tipo_cliente, nombre_entidad, nacionalidad, datos_completos, estado)
      VALUES
        ($1, $2, $3, $4, $5::jsonb, 'activo')
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [empresa_id, tipo, String(nombre_entidad).trim(), String(nacionalidad).trim(), JSON.stringify(datos_completos)]
    );

    return res.status(201).json({ ok: true, cliente: pickClienteRow(insert.rows[0]) });
  } catch (e: any) {
    const mapped = pgErrorToHttp(e);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    console.error('Error al registrar cliente:', e);
    return res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

/**
 * ===============================
 * PUT /api/cliente/clientes/:id
 * (mínimo: actualiza campos base y datos_completos)
 * ===============================
 */
router.put('/clientes/:id', authenticate, async (req: AuthedRequest, res: Response) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const { nombre_entidad, nacionalidad, datos_completos, estado } = req.body ?? {};

    const patchNombre = isNonEmptyString(nombre_entidad) ? String(nombre_entidad).trim() : null;
    const patchNac = isNonEmptyString(nacionalidad) ? String(nacionalidad).trim() : null;
    const patchEstado = isNonEmptyString(estado) ? String(estado).trim() : null;

    let patchDatos: string | null = null;
    if (datos_completos !== undefined) {
      if (!datos_completos || typeof datos_completos !== 'object') {
        return res.status(400).json({ error: 'datos_completos inválido' });
      }
      patchDatos = JSON.stringify(datos_completos);
    }

    const updated = await pool.query(
      `
      UPDATE clientes
      SET
        nombre_entidad = COALESCE($2, nombre_entidad),
        nacionalidad = COALESCE($3, nacionalidad),
        datos_completos = COALESCE($4::jsonb, datos_completos),
        estado = COALESCE($5, estado),
        actualizado_en = now()
      WHERE id = $1
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [id, patchNombre, patchNac, patchDatos, patchEstado]
    );

    if (updated.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: pickClienteRow(updated.rows[0]) });
  } catch (e: any) {
    const mapped = pgErrorToHttp(e);
    if (mapped) return res.status(mapped.status).json(mapped.body);

    console.error('Error al actualizar cliente:', e);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

export default router;