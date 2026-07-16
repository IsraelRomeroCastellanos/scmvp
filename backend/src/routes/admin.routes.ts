// backend/src/routes/admin.routes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * ===============================
 * DEBUG — confirmar que el router carga (PROTEGIDO)
 * ===============================
 *
 * Antes estaba público y respondía 200 sin token.
 * Ahora requiere token válido y rol admin.
 */
router.get('/__debug', authenticate, authorizeRoles('admin'), (_req, res) => {
  res.json({ ok: true, router: 'admin' });
});

// ===============================
// LISTAR USUARIOS (ADMIN)
// ===============================
router.get(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        FROM usuarios
        ORDER BY id ASC
      `);

      res.json({ usuarios: result.rows });
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      res.status(500).json({ error: 'Error al listar usuarios' });
    }
  }
);

// ===============================
// CREAR USUARIO (ADMIN)
// ===============================
router.post(
  '/usuarios',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const nombre_completo = String(req.body?.nombre_completo ?? '').trim();
      const rol = String(req.body?.rol ?? '').trim().toLowerCase();
      const empresaIdRaw = req.body?.empresa_id;
      const activoRaw = req.body?.activo;

      const rolesPermitidos = ['admin', 'consultor', 'cliente'];

      if (!email) {
        return res.status(400).json({ error: 'email es obligatorio' });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'email invalido' });
      }

      if (!password) {
        return res.status(400).json({ error: 'password es obligatorio' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'password debe tener al menos 8 caracteres' });
      }

      if (!nombre_completo) {
        return res.status(400).json({ error: 'nombre_completo es obligatorio' });
      }

      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ error: 'rol invalido' });
      }

      let empresa_id: number | null = null;

      if (empresaIdRaw !== undefined && empresaIdRaw !== null && empresaIdRaw !== '') {
        const parsedEmpresaId = Number(empresaIdRaw);

        if (!Number.isInteger(parsedEmpresaId) || parsedEmpresaId <= 0) {
          return res.status(400).json({ error: 'empresa_id invalido' });
        }

        empresa_id = parsedEmpresaId;
      }

      if (rol === 'cliente' && !empresa_id) {
        return res.status(400).json({ error: 'empresa_id es obligatorio para rol cliente' });
      }

      let activo = true;

      if (activoRaw !== undefined) {
        if (typeof activoRaw !== 'boolean') {
          return res.status(400).json({ error: 'activo debe ser boolean' });
        }

        activo = activoRaw;
      }

      if (empresa_id !== null) {
        const empresaResult = await pool.query(
          'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
          [empresa_id]
        );

        if (empresaResult.rows.length === 0) {
          return res.status(400).json({ error: 'empresa_id no existe' });
        }
      }

      const existingUser = await pool.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'email ya registrado' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
        INSERT INTO usuarios (
          email,
          password_hash,
          nombre_completo,
          rol,
          empresa_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [email, password_hash, nombre_completo, rol, empresa_id, activo]
      );

      return res.status(201).json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
);



// ===============================
// EDITAR USUARIO MINIMO (ADMIN)
// ===============================
router.patch(
  '/usuarios/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const nombre_completo = String(req.body?.nombre_completo ?? '').trim();
      const rol = String(req.body?.rol ?? '').trim().toLowerCase();
      const empresaIdRaw = req.body?.empresa_id;

      const rolesPermitidos = ['admin', 'consultor', 'cliente'];
      const camposProhibidos = ['email', 'password', 'password_hash', 'activo'];

      for (const campo of camposProhibidos) {
        if (Object.prototype.hasOwnProperty.call(req.body ?? {}, campo)) {
          return res.status(400).json({ error: `${campo} no puede modificarse en este endpoint` });
        }
      }

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'id invalido' });
      }

      if (!nombre_completo) {
        return res.status(400).json({ error: 'nombre_completo es obligatorio' });
      }

      if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ error: 'rol invalido' });
      }

      let empresa_id: number | null = null;

      if (rol === 'cliente') {
        if (empresaIdRaw === undefined || empresaIdRaw === null || empresaIdRaw === '') {
          return res.status(400).json({ error: 'empresa_id es obligatorio para rol cliente' });
        }

        const parsedEmpresaId = Number(empresaIdRaw);

        if (!Number.isInteger(parsedEmpresaId) || parsedEmpresaId <= 0) {
          return res.status(400).json({ error: 'empresa_id invalido' });
        }

        empresa_id = parsedEmpresaId;
      } else if (empresaIdRaw !== undefined && empresaIdRaw !== null && empresaIdRaw !== '') {
        return res.status(400).json({ error: 'empresa_id debe ser null para rol admin o consultor' });
      }

      const existingUser = await pool.query(
        'SELECT id, rol FROM usuarios WHERE id = $1 LIMIT 1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ error: 'usuario no encontrado' });
      }

      const authenticatedUserId = Number((req as any).user?.id);

      if (
        Number.isInteger(authenticatedUserId) &&
        authenticatedUserId === id &&
        existingUser.rows[0].rol === 'admin' &&
        rol !== 'admin'
      ) {
        return res.status(400).json({ error: 'no puedes cambiar tu propio rol fuera de admin' });
      }

      if (empresa_id !== null) {
        const empresaResult = await pool.query(
          'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
          [empresa_id]
        );

        if (empresaResult.rows.length === 0) {
          return res.status(400).json({ error: 'empresa_id no existe' });
        }
      }

      const result = await pool.query(
        `
        UPDATE usuarios
        SET
          nombre_completo = $1,
          rol = $2,
          empresa_id = $3
        WHERE id = $4
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [nombre_completo, rol, empresa_id, id]
      );

      return res.json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al editar usuario:', error);
      return res.status(500).json({ error: 'Error al editar usuario' });
    }
  }
);


// ===============================
// ACTIVAR / DESACTIVAR USUARIO (ADMIN)
// ===============================
router.patch(
  '/usuarios/:id/activo',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const activo = req.body?.activo;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'id invalido' });
      }

      if (typeof activo !== 'boolean') {
        return res.status(400).json({ error: 'activo debe ser boolean' });
      }

      const authenticatedUserId = Number((req as any).user?.id);

      if (
        Number.isInteger(authenticatedUserId) &&
        authenticatedUserId === id &&
        activo === false
      ) {
        return res.status(400).json({ error: 'no puedes desactivar tu propio usuario' });
      }

      const result = await pool.query(
        `
        UPDATE usuarios
        SET activo = $1
        WHERE id = $2
        RETURNING
          id,
          email,
          nombre_completo,
          rol,
          empresa_id,
          activo
        `,
        [activo, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'usuario no encontrado' });
      }

      return res.json({ usuario: result.rows[0] });
    } catch (error) {
      console.error('Error al cambiar estado de usuario:', error);
      return res.status(500).json({ error: 'Error al cambiar estado de usuario' });
    }
  }
);

/**
 * ===============================
 * LISTAR EMPRESAS
 * ===============================
 */
router.get(
  '/empresas',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          nombre_legal,
          rfc,
          tipo_entidad,
          estado,
          entidad,
          municipio,
          codigo_postal
        FROM empresas
        ORDER BY nombre_legal
      `);

      res.json({ empresas: result.rows });
    } catch (error) {
      console.error('Error al listar empresas:', error);
      res.status(500).json({ error: 'Error al listar empresas' });
    }
  }
);

const EMPRESA_SELECT_FIELDS = `
  id,
  nombre_legal,
  rfc,
  tipo_entidad,
  pais,
  domicilio,
  estado,
  entidad,
  municipio,
  colonia,
  codigo_postal,
  calle,
  numero,
  ciudad_delegacion,
  estado_provincia
`;

const TIPOS_ENTIDAD_EMPRESA = ['persona_fisica', 'persona_moral'];
const ESTADOS_EMPRESA = ['activo', 'suspendido', 'inactivo'];

function normalizarTextoEmpresa(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizarEmpresaBody(body: any, estadoPorDefecto: string) {
  const nombre_legal = normalizarTextoEmpresa(body?.nombre_legal);
  const rfcNormalizado = normalizarTextoEmpresa(body?.rfc);
  const tipo_entidad = normalizarTextoEmpresa(body?.tipo_entidad);
  const estadoRecibido = normalizarTextoEmpresa(body?.estado);

  return {
    nombre_legal,
    rfc: rfcNormalizado ? rfcNormalizado.toUpperCase() : null,
    tipo_entidad,
    pais: normalizarTextoEmpresa(body?.pais),
    domicilio: normalizarTextoEmpresa(body?.domicilio),
    estado: estadoRecibido ?? estadoPorDefecto,
    entidad: normalizarTextoEmpresa(body?.entidad),
    municipio: normalizarTextoEmpresa(body?.municipio),
    colonia: normalizarTextoEmpresa(body?.colonia),
    codigo_postal: normalizarTextoEmpresa(body?.codigo_postal),
    calle: normalizarTextoEmpresa(body?.calle),
    numero: normalizarTextoEmpresa(body?.numero),
    ciudad_delegacion: normalizarTextoEmpresa(body?.ciudad_delegacion),
    estado_provincia: normalizarTextoEmpresa(body?.estado_provincia)
  };
}

function validarEmpresaBody(
  res: any,
  empresa: ReturnType<typeof normalizarEmpresaBody>
): boolean {
  if (!empresa.nombre_legal) {
    res.status(400).json({ error: 'nombre_legal es obligatorio' });
    return false;
  }

  if (!empresa.tipo_entidad || !TIPOS_ENTIDAD_EMPRESA.includes(empresa.tipo_entidad)) {
    res.status(400).json({ error: 'tipo_entidad invalido' });
    return false;
  }

  if (!ESTADOS_EMPRESA.includes(empresa.estado)) {
    res.status(400).json({ error: 'estado invalido' });
    return false;
  }

  return true;
}

function responderConflictoEmpresa(res: any, error: any) {
  if (error?.code !== '23505') return false;

  const constraint = String(error?.constraint ?? '').toLowerCase();
  if (constraint.includes('nombre_legal')) {
    res.status(409).json({ error: 'nombre_legal ya registrado' });
    return true;
  }

  if (constraint.includes('rfc')) {
    res.status(409).json({ error: 'rfc ya registrado' });
    return true;
  }

  res.status(409).json({ error: 'Empresa duplicada' });
  return true;
}

// ===============================
// CONSULTAR EMPRESA (ADMIN / CONSULTOR)
// ===============================
router.get(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin', 'consultor'),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    try {
      const result = await pool.query(
        `SELECT ${EMPRESA_SELECT_FIELDS} FROM public.empresas WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      return res.json({ empresa: result.rows[0] });
    } catch (error) {
      console.error('Error al consultar empresa:', error);
      return res.status(500).json({ error: 'Error al consultar empresa' });
    }
  }
);

// ===============================
// CREAR EMPRESA (ADMIN)
// ===============================
router.post(
  '/empresas',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const empresa = normalizarEmpresaBody(req.body, 'activo');
    if (!validarEmpresaBody(res, empresa)) return;

    try {
      const duplicateResult = await pool.query(
        `SELECT nombre_legal, rfc
         FROM public.empresas
         WHERE LOWER(nombre_legal) = LOWER($1)
            OR ($2::text IS NOT NULL AND UPPER(rfc) = $2)
         LIMIT 1`,
        [empresa.nombre_legal, empresa.rfc]
      );

      if (duplicateResult.rows.length > 0) {
        const duplicate = duplicateResult.rows[0];
        if (String(duplicate.nombre_legal).toLowerCase() === empresa.nombre_legal!.toLowerCase()) {
          return res.status(409).json({ error: 'nombre_legal ya registrado' });
        }

        return res.status(409).json({ error: 'rfc ya registrado' });
      }

      const result = await pool.query(
        `INSERT INTO public.empresas (
          nombre_legal, rfc, tipo_entidad, pais, domicilio, estado, entidad,
          municipio, colonia, codigo_postal, calle, numero, ciudad_delegacion,
          estado_provincia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING ${EMPRESA_SELECT_FIELDS}`,
        [
          empresa.nombre_legal,
          empresa.rfc,
          empresa.tipo_entidad,
          empresa.pais,
          empresa.domicilio,
          empresa.estado,
          empresa.entidad,
          empresa.municipio,
          empresa.colonia,
          empresa.codigo_postal,
          empresa.calle,
          empresa.numero,
          empresa.ciudad_delegacion,
          empresa.estado_provincia
        ]
      );

      return res.status(201).json({ empresa: result.rows[0] });
    } catch (error) {
      if (responderConflictoEmpresa(res, error)) return;

      console.error('Error al crear empresa:', error);
      return res.status(500).json({ error: 'Error al crear empresa' });
    }
  }
);

// ===============================
// EDITAR EMPRESA (ADMIN)
// ===============================
router.put(
  '/empresas/:id',
  authenticate,
  authorizeRoles('admin'),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    try {
      const existingResult = await pool.query(
        'SELECT id, estado FROM public.empresas WHERE id = $1 LIMIT 1',
        [id]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa no encontrada' });
      }

      const empresa = normalizarEmpresaBody(req.body, existingResult.rows[0].estado);
      if (!validarEmpresaBody(res, empresa)) return;

      const duplicateResult = await pool.query(
        `SELECT nombre_legal, rfc
         FROM public.empresas
         WHERE id <> $1
           AND (
             LOWER(nombre_legal) = LOWER($2)
             OR ($3::text IS NOT NULL AND UPPER(rfc) = $3)
           )
         LIMIT 1`,
        [id, empresa.nombre_legal, empresa.rfc]
      );

      if (duplicateResult.rows.length > 0) {
        const duplicate = duplicateResult.rows[0];
        if (String(duplicate.nombre_legal).toLowerCase() === empresa.nombre_legal!.toLowerCase()) {
          return res.status(409).json({ error: 'nombre_legal ya registrado' });
        }

        return res.status(409).json({ error: 'rfc ya registrado' });
      }

      const result = await pool.query(
        `UPDATE public.empresas
         SET nombre_legal = $1,
             rfc = $2,
             tipo_entidad = $3,
             pais = $4,
             domicilio = $5,
             estado = $6,
             entidad = $7,
             municipio = $8,
             colonia = $9,
             codigo_postal = $10,
             calle = $11,
             numero = $12,
             ciudad_delegacion = $13,
             estado_provincia = $14,
             actualizado_en = NOW()
         WHERE id = $15
         RETURNING ${EMPRESA_SELECT_FIELDS}`,
        [
          empresa.nombre_legal,
          empresa.rfc,
          empresa.tipo_entidad,
          empresa.pais,
          empresa.domicilio,
          empresa.estado,
          empresa.entidad,
          empresa.municipio,
          empresa.colonia,
          empresa.codigo_postal,
          empresa.calle,
          empresa.numero,
          empresa.ciudad_delegacion,
          empresa.estado_provincia,
          id
        ]
      );

      return res.json({ empresa: result.rows[0] });
    } catch (error) {
      if (responderConflictoEmpresa(res, error)) return;

      console.error('Error al editar empresa:', error);
      return res.status(500).json({ error: 'Error al editar empresa' });
    }
  }
);

export default router;
