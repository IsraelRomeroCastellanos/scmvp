// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import pool from '../db';

const router = Router();

type Rol = 'admin' | 'consultor' | 'cliente';
type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getUser(req: Request) {
  return (req as any).user as { id: number; rol: Rol; empresa_id: number | null } | undefined;
}

function isPlainObject(x: any): x is Record<string, any> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function requireString(val: any) {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Validación mínima por tipo_cliente (iteración 1)
 * - NO bloquea PF/PM existentes con reglas excesivas
 * - Para fideicomiso: exige un set pequeño y claro
 */
function validateDatosCompletos(tipo: TipoCliente, datos: any): string | null {
  if (datos == null) return null; // permitimos null (DB lo permite); FE lo manda normalmente.
  if (!isPlainObject(datos)) return 'datos_completos debe ser un objeto';

  // Contacto mínimo (si viene)
  if (datos.contacto != null) {
    if (!isPlainObject(datos.contacto)) return 'datos_completos.contacto debe ser un objeto';
    const { pais, telefono } = datos.contacto;
    if (!requireString(pais)) return 'Contacto: país es obligatorio';
    if (!requireString(telefono)) return 'Contacto: teléfono es obligatorio';
  }

  // Reglas mínimas por tipo
  if (tipo === 'persona_fisica') {
    if (datos.persona != null) {
      if (!isPlainObject(datos.persona)) return 'datos_completos.persona debe ser un objeto';
      if (!requireString(datos.persona.nombres)) return 'Persona física: nombres es obligatorio';
      if (!requireString(datos.persona.apellido_paterno)) return 'Persona física: apellido_paterno es obligatorio';
    }
  }

  if (tipo === 'persona_moral') {
    if (datos.empresa != null) {
      if (!isPlainObject(datos.empresa)) return 'datos_completos.empresa debe ser un objeto';
      if (!requireString(datos.empresa.rfc)) return 'Persona moral: RFC es obligatorio';
    }
  }

  if (tipo === 'fideicomiso') {
    // Iteración 1 (mínimos)
    const f = datos.fideicomiso;
    if (!isPlainObject(f)) return 'Fideicomiso: datos_completos.fideicomiso es obligatorio';

    if (!requireString(f.denominacion_fiduciario)) {
      return 'Fideicomiso: denominacion_fiduciario es obligatorio';
    }
    if (!requireString(f.rfc_fiduciario)) {
      return 'Fideicomiso: rfc_fiduciario es obligatorio';
    }
    if (!requireString(f.identificador)) {
      return 'Fideicomiso: identificador es obligatorio';
    }

    const r = datos.representante;
    if (!isPlainObject(r)) return 'Fideicomiso: datos_completos.representante es obligatorio';
    if (!requireString(r.nombre_completo)) return 'Fideicomiso: representante.nombre_completo es obligatorio';
    if (!requireString(r.rfc)) return 'Fideicomiso: representante.rfc es obligatorio';
    if (!requireString(r.curp)) return 'Fideicomiso: representante.curp es obligatorio';
    if (!requireString(r.fecha_nacimiento)) return 'Fideicomiso: representante.fecha_nacimiento es obligatorio';
  }

  return null;
}

router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES
 * ===============================
 * - GET /api/cliente/clientes (canónico)
 * - GET /api/cliente/mis-clientes (alias histórico)
 */
const listarClientesHandler = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    let query = `
      SELECT
        id,
        nombre_entidad,
        tipo_cliente,
        nacionalidad,
        estado,
        creado_en
      FROM clientes
    `;
    const params: any[] = [];

    // Si es cliente: filtra por empresa
    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      query += ` WHERE empresa_id = $1`;
      params.push(user.empresa_id);
    }

    query += ` ORDER BY creado_en DESC`;

    const result = await pool.query(query, params);
    return res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'Error al listar clientes' });
  }
};

router.get('/clientes', authenticate, listarClientesHandler);
router.get('/mis-clientes', authenticate, listarClientesHandler);

/**
 * ===============================
 * OBTENER CLIENTE POR ID
 * ===============================
 * GET /api/cliente/clientes/:id
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const params: any[] = [id];
    let sql = `SELECT * FROM clientes WHERE id = $1`;

    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      sql += ` AND empresa_id = $2`;
      params.push(user.empresa_id);
    }

    const result = await pool.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

/**
 * ===============================
 * CREAR CLIENTE
 * ===============================
 * - POST /api/cliente/clientes (canónico)
 * - POST /api/cliente/registrar-cliente (alias histórico)
 */
const crearClienteHandler = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const body = req.body ?? {};

    // Resolver empresa_id según rol
    const resolvedEmpresaId =
      user.rol === 'cliente'
        ? user.empresa_id
        : body.empresa_id !== undefined && body.empresa_id !== null
          ? Number(body.empresa_id)
          : null;

    if (user.rol === 'cliente') {
      if (!resolvedEmpresaId) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
    } else {
      if (!resolvedEmpresaId || Number.isNaN(resolvedEmpresaId)) {
        return res.status(400).json({ error: 'empresa_id es obligatorio para admin/consultor' });
      }
    }

    const nombre_entidad = typeof body.nombre_entidad === 'string' ? body.nombre_entidad.trim() : '';
    if (!nombre_entidad) return res.status(400).json({ error: 'nombre_entidad es obligatorio' });

    const tipo_cliente = body.tipo_cliente as TipoCliente;
    const allowedTipo: TipoCliente[] = ['persona_fisica', 'persona_moral', 'fideicomiso'];
    if (!tipo_cliente || !allowedTipo.includes(tipo_cliente)) {
      return res.status(400).json({ error: `tipo_cliente inválido (${allowedTipo.join('|')})` });
    }

    // ✅ YA NO BLOQUEAMOS fideicomiso EN CÓDIGO
    const msgDatos = validateDatosCompletos(tipo_cliente, body.datos_completos);
    if (msgDatos) return res.status(400).json({ error: msgDatos });

    const insertSQL = `
      INSERT INTO clientes (
        empresa_id,
        cliente_id_externo,
        nombre_entidad,
        alias,
        fecha_nacimiento_constitucion,
        tipo_cliente,
        nacionalidad,
        domicilio_mexico,
        ocupacion,
        actividad_economica,
        datos_completos,
        estado
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
    `;

    const values = [
      resolvedEmpresaId,
      body.cliente_id_externo ?? null,
      nombre_entidad,
      body.alias ?? null,
      body.fecha_nacimiento_constitucion ?? null,
      tipo_cliente,
      body.nacionalidad ?? null,
      body.domicilio_mexico ?? null,
      body.ocupacion ?? null,
      body.actividad_economica ?? null,
      body.datos_completos ?? null,
      body.estado ?? 'activo'
    ];

    const result = await pool.query(insertSQL, values);
    return res.status(201).json({ ok: true, cliente: result.rows[0] });
  } catch (error: any) {
    // duplicado empresa_id + nombre_entidad (idx_clientes_empresa_nombre)
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }

    // violación de CHECK constraint (por ejemplo tipo_cliente)
    if (error?.code === '23514') {
      return res.status(400).json({ error: `Datos inválidos (constraint): ${error?.constraint ?? 'CHECK'}` });
    }

    console.error('Error al crear cliente:', error);
    return res.status(500).json({ error: 'Error al crear cliente' });
  }
};

router.post('/clientes', authenticate, crearClienteHandler);
router.post('/registrar-cliente', authenticate, crearClienteHandler);

/**
 * ===============================
 * ACTUALIZAR CLIENTE
 * ===============================
 * - PUT /api/cliente/clientes/:id (canónico)
 * - PUT /api/cliente/:id (alias histórico)
 */
const actualizarClienteHandler = async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    const body = req.body ?? {};

    // Cliente: sólo su empresa
    let empresaGuardSQL = '';
    const paramsGuard: any[] = [id];

    if (user.rol === 'cliente') {
      if (!user.empresa_id) return res.status(400).json({ error: 'Empresa no asociada al usuario' });
      empresaGuardSQL = ' AND empresa_id = $2';
      paramsGuard.push(user.empresa_id);
    }

    // Validación tipo_cliente si lo mandan
    if (body.tipo_cliente) {
      const allowedTipo: TipoCliente[] = ['persona_fisica', 'persona_moral', 'fideicomiso'];
      if (!allowedTipo.includes(body.tipo_cliente)) {
        return res.status(400).json({ error: `tipo_cliente inválido (${allowedTipo.join('|')})` });
      }
      const msgDatos = validateDatosCompletos(body.tipo_cliente, body.datos_completos);
      if (msgDatos) return res.status(400).json({ error: msgDatos });
    }

    const sql = `
      UPDATE clientes SET
        cliente_id_externo = COALESCE($3, cliente_id_externo),
        nombre_entidad = COALESCE($4, nombre_entidad),
        alias = COALESCE($5, alias),
        fecha_nacimiento_constitucion = COALESCE($6, fecha_nacimiento_constitucion),
        tipo_cliente = COALESCE($7, tipo_cliente),
        nacionalidad = COALESCE($8, nacionalidad),
        domicilio_mexico = COALESCE($9, domicilio_mexico),
        ocupacion = COALESCE($10, ocupacion),
        actividad_economica = COALESCE($11, actividad_economica),
        datos_completos = COALESCE($12, datos_completos),
        estado = COALESCE($13, estado),
        actualizado_en = now()
      WHERE id = $1 ${empresaGuardSQL}
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
    `;

    const values = [
      ...paramsGuard,
      body.cliente_id_externo ?? null,
      body.nombre_entidad ?? null,
      body.alias ?? null,
      body.fecha_nacimiento_constitucion ?? null,
      body.tipo_cliente ?? null,
      body.nacionalidad ?? null,
      body.domicilio_mexico ?? null,
      body.ocupacion ?? null,
      body.actividad_economica ?? null,
      body.datos_completos ?? null,
      body.estado ?? null
    ];

    const result = await pool.query(sql, values);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ ok: true, cliente: result.rows[0] });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }
    if (error?.code === '23514') {
      return res.status(400).json({ error: `Datos inválidos (constraint): ${error?.constraint ?? 'CHECK'}` });
    }
    console.error('Error al actualizar cliente:', error);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

router.put('/clientes/:id', authenticate, actualizarClienteHandler);
router.put('/:id', authenticate, actualizarClienteHandler);

export default router;