// backend/src/routes/cliente.routes.ts
import { Router } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * ===============================
 * Helpers de validación
 * ===============================
 */

const isYYYYMMDD = (value: string) => /^\d{8}$/.test(value);

const isRFC = (value: string) =>
  /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(value.trim());

const isCURP = (value: string) =>
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/i.test(
    value.trim()
  );

const isPhone = (value: string) => /^\d{10,12}$/.test(value.trim());

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function normalizeTipoCliente(value: string): TipoCliente | null {
  const v = (value || '').trim().toLowerCase();
  if (v === 'persona_fisica') return 'persona_fisica';
  if (v === 'persona_moral') return 'persona_moral';
  if (v === 'fideicomiso') return 'fideicomiso';
  return null;
}

function buildNombreEntidad(tipo: TipoCliente, datos: any): string {
  if (tipo === 'persona_fisica') {
    const pf = datos?.persona_fisica || {};
    const nombres = (pf.nombres || '').trim();
    const ap = (pf.apellido_paterno || '').trim();
    const am = (pf.apellido_materno || '').trim();
    return [nombres, ap, am].filter(Boolean).join(' ').trim();
  }

  if (tipo === 'persona_moral') {
    const pm = datos?.persona_moral || {};
    return (pm.razon_social || '').trim();
  }

  // fideicomiso
  const f = datos?.fideicomiso || {};
  return (f.identificador || '').trim();
}

function buildActividadTexto(tipo: TipoCliente, datos: any): string | null {
  if (tipo === 'persona_fisica') {
    const act = datos?.persona_fisica?.actividad_economica;
    if (!act) return null;
    const c = (act.codigo || '').trim();
    const d = (act.descripcion || '').trim();
    return [c, d].filter(Boolean).join(' - ') || null;
  }

  if (tipo === 'persona_moral') {
    const giro = datos?.persona_moral?.giro_mercantil;
    if (!giro) return null;
    const c = (giro.codigo || '').trim();
    const d = (giro.descripcion || '').trim();
    return [c, d].filter(Boolean).join(' - ') || null;
  }

  return null;
}

function buildNacionalidadTexto(tipo: TipoCliente, datos: any): string | null {
  // Guardamos en columna nacionalidad un texto; en JSON guardamos {codigo, descripcion}
  let nat: any = null;
  if (tipo === 'persona_fisica') nat = datos?.persona_fisica?.nacionalidad;
  if (tipo === 'persona_moral') nat = datos?.persona_moral?.nacionalidad;
  // fideicomiso: por ahora no tiene nacionalidad propia, pero sí contacto país
  if (!nat) return null;

  const c = (nat.codigo || '').trim();
  const d = (nat.descripcion || '').trim();
  return [c, d].filter(Boolean).join(' - ') || null;
}

function validatePayloadOrThrow(tipo: TipoCliente, datos: any) {
  // Contacto siempre obligatorio
  const contacto = datos?.contacto || {};
  const pais = contacto?.pais || {};
  const paisDesc = (pais.descripcion || '').trim();
  const telefono = (contacto.telefono || '').trim();

  if (!paisDesc) throw new Error('Contacto: país es obligatorio');
  if (!telefono) throw new Error('Contacto: teléfono es obligatorio');
  if (!isPhone(telefono))
    throw new Error('Contacto: teléfono debe tener 10 a 12 dígitos');

  if (tipo === 'persona_fisica') {
    const pf = datos?.persona_fisica || {};
    if (!(pf.nombres || '').trim()) throw new Error('Nombre(s) es obligatorio');
    if (!(pf.apellido_paterno || '').trim())
      throw new Error('Apellido paterno es obligatorio');
    if (!(pf.apellido_materno || '').trim())
      throw new Error('Apellido materno es obligatorio');

    if (!(pf.fecha_nacimiento || '').trim())
      throw new Error('Fecha de nacimiento es obligatoria');
    if (!isYYYYMMDD(pf.fecha_nacimiento))
      throw new Error('Fecha de nacimiento debe ser AAAAMMDD');

    if (!(pf.rfc || '').trim()) throw new Error('RFC es obligatorio');
    if (!isRFC(pf.rfc)) throw new Error('RFC no tiene formato válido');

    if (!(pf.curp || '').trim()) throw new Error('CURP es obligatoria');
    if (!isCURP(pf.curp)) throw new Error('CURP no tiene formato válido');

    const nat = pf.nacionalidad || {};
    if (!(nat.descripcion || '').trim())
      throw new Error('País de nacionalidad es obligatorio');

    const act = pf.actividad_economica || {};
    if (!(act.codigo || '').trim() || !(act.descripcion || '').trim())
      throw new Error('Actividad económica (código + descripción) es obligatoria');
  }

  if (tipo === 'persona_moral') {
    const pm = datos?.persona_moral || {};
    if (!(pm.razon_social || '').trim())
      throw new Error('Razón social es obligatoria');

    if (!(pm.fecha_constitucion || '').trim())
      throw new Error('Fecha de constitución es obligatoria');
    if (!isYYYYMMDD(pm.fecha_constitucion))
      throw new Error('Fecha de constitución debe ser AAAAMMDD');

    if (!(pm.rfc || '').trim()) throw new Error('RFC es obligatorio');
    if (!isRFC(pm.rfc)) throw new Error('RFC no tiene formato válido');

    const nat = pm.nacionalidad || {};
    if (!(nat.descripcion || '').trim())
      throw new Error('País de nacionalidad es obligatorio');

    const giro = pm.giro_mercantil || {};
    if (!(giro.codigo || '').trim() || !(giro.descripcion || '').trim())
      throw new Error('Giro mercantil (código + descripción) es obligatorio');

    // Representante obligatorio (solo 1)
    const rep = datos?.representante || {};
    if (!(rep.nombres || '').trim())
      throw new Error('Representante: nombre(s) es obligatorio');
    if (!(rep.apellido_paterno || '').trim())
      throw new Error('Representante: apellido paterno es obligatorio');
    if (!(rep.apellido_materno || '').trim())
      throw new Error('Representante: apellido materno es obligatorio');

    if (!(rep.fecha_nacimiento || '').trim())
      throw new Error('Representante: fecha de nacimiento es obligatoria');
    if (!isYYYYMMDD(rep.fecha_nacimiento))
      throw new Error('Representante: fecha de nacimiento debe ser AAAAMMDD');

    if (!(rep.rfc || '').trim())
      throw new Error('Representante: RFC es obligatorio');
    if (!isRFC(rep.rfc))
      throw new Error('Representante: RFC no tiene formato válido');

    if (!(rep.curp || '').trim())
      throw new Error('Representante: CURP es obligatoria');
    if (!isCURP(rep.curp))
      throw new Error('Representante: CURP no tiene formato válido');
  }

  if (tipo === 'fideicomiso') {
    const f = datos?.fideicomiso || {};
    if (!(f.rfc || '').trim()) throw new Error('RFC (fideicomiso) es obligatorio');
    if (!isRFC(f.rfc)) throw new Error('RFC (fideicomiso) no tiene formato válido');

    if (!(f.identificador || '').trim())
      throw new Error('Identificador del fideicomiso es obligatorio');

    // Representante obligatorio (solo 1)
    const rep = datos?.representante || {};
    if (!(rep.nombres || '').trim())
      throw new Error('Representante: nombre(s) es obligatorio');
    if (!(rep.apellido_paterno || '').trim())
      throw new Error('Representante: apellido paterno es obligatorio');
    if (!(rep.apellido_materno || '').trim())
      throw new Error('Representante: apellido materno es obligatorio');

    if (!(rep.fecha_nacimiento || '').trim())
      throw new Error('Representante: fecha de nacimiento es obligatoria');
    if (!isYYYYMMDD(rep.fecha_nacimiento))
      throw new Error('Representante: fecha de nacimiento debe ser AAAAMMDD');

    if (!(rep.rfc || '').trim())
      throw new Error('Representante: RFC es obligatorio');
    if (!isRFC(rep.rfc))
      throw new Error('Representante: RFC no tiene formato válido');

    if (!(rep.curp || '').trim())
      throw new Error('Representante: CURP es obligatoria');
    if (!isCURP(rep.curp))
      throw new Error('Representante: CURP no tiene formato válido');
  }
}

async function assertClienteScopeOrThrow(
  user: { rol: string; empresa_id: number | null },
  clienteId: number
) {
  // Si es rol cliente: solo puede tocar clientes de su empresa
  if (user.rol !== 'cliente') return;

  if (!user.empresa_id) throw new Error('Usuario cliente sin empresa asignada');

  const check = await pool.query(
    'SELECT id FROM clientes WHERE id = $1 AND empresa_id = $2',
    [clienteId, user.empresa_id]
  );

  if (check.rowCount === 0) {
    const err: any = new Error('Acceso denegado');
    err.status = 403;
    throw err;
  }
}

/**
 * ===============================
 * DEBUG
 * ===============================
 */
router.get('/__debug', (_req, res) => {
  res.json({ ok: true, router: 'cliente' });
});

/**
 * ===============================
 * LISTAR CLIENTES (según rol)
 * ===============================
 * GET /api/cliente/mis-clientes
 */
router.get(
  '/mis-clientes',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'No autenticado' });

      const params: any[] = [];
      let where = '';

      if (user.rol === 'cliente') {
        if (!user.empresa_id) {
          return res.status(400).json({ error: 'Usuario cliente sin empresa asignada' });
        }
        params.push(user.empresa_id);
        where = `WHERE c.empresa_id = $${params.length}`;
      }

      // Importante: usamos SIEMPRE nombre_entidad (no "nombre")
      const result = await pool.query(
        `
        SELECT
          c.id,
          c.nombre_entidad,
          c.tipo_cliente,
          c.actividad_economica,
          c.estado,
          c.empresa_id,
          e.nombre_legal AS empresa_nombre
        FROM clientes c
        JOIN empresas e ON e.id = c.empresa_id
        ${where}
        ORDER BY c.creado_en DESC, c.id DESC
        `,
        params
      );

      res.json({ clientes: result.rows });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error al listar clientes' });
    }
  }
);

/**
 * ===============================
 * OBTENER CLIENTE (para editar)
 * ===============================
 * GET /api/cliente/:id
 * GET /api/cliente/clientes/:id  (alias para compatibilidad)
 */
async function getClienteByIdHandler(req: AuthRequest, res: any) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autenticado' });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });

    await assertClienteScopeOrThrow(user, id);

    const result = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        tipo_cliente,
        nombre_entidad,
        estado,
        datos_completos
      FROM clientes
      WHERE id = $1
      `,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json({ cliente: result.rows[0] });
  } catch (error: any) {
    const status = error?.status || 500;
    console.error('Error al cargar cliente:', error);
    res.status(status).json({ error: status === 403 ? 'Acceso denegado' : 'Error al cargar cliente' });
  }
}

router.get(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  getClienteByIdHandler
);

router.get(
  '/clientes/:id',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  getClienteByIdHandler
);

/**
 * ===============================
 * CREAR CLIENTE
 * ===============================
 * POST /api/cliente
 * POST /api/cliente/clientes (alias)
 *
 * Reglas:
 * - estado inicial SIEMPRE 'activo'
 * - teléfono obligatorio
 * - actividad/giro = código + descripción (se guarda también en columna actividad_economica como texto)
 * - representante: solo 1 (PM / Fideicomiso)
 * - porcentaje_cumplimiento: NO se usa
 */
async function createClienteHandler(req: AuthRequest, res: any) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autenticado' });

    const tipo = normalizeTipoCliente(req.body?.tipo_cliente);
    if (!tipo) return res.status(400).json({ error: 'tipo_cliente inválido' });

    const datos = req.body?.datos_completos;
    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'datos_completos es obligatorio' });
    }

    // Validaciones estrictas según tipo
    validatePayloadOrThrow(tipo, datos);

    // Empresa scope:
    // - rol cliente => empresa_id = user.empresa_id
    // - admin/consultor => requiere empresa_id en body
    let empresaId: number | null = null;

    if (user.rol === 'cliente') {
      if (!user.empresa_id) {
        return res.status(400).json({ error: 'Usuario cliente sin empresa asignada' });
      }
      empresaId = user.empresa_id;
    } else {
      const bodyEmpresa = Number(req.body?.empresa_id);
      if (!Number.isFinite(bodyEmpresa) || bodyEmpresa <= 0) {
        return res.status(400).json({ error: 'empresa_id es obligatorio para admin/consultor' });
      }
      empresaId = bodyEmpresa;
    }

    const nombreEntidad = buildNombreEntidad(tipo, datos);
    if (!nombreEntidad) return res.status(400).json({ error: 'No se pudo construir nombre del cliente' });

    const actividadTexto = buildActividadTexto(tipo, datos);
    const nacionalidadTexto = buildNacionalidadTexto(tipo, datos);

    // Fecha “principal” (PF: nacimiento, PM: constitución, fideicomiso: null)
    let fechaPrincipal: string | null = null;
    if (tipo === 'persona_fisica') fechaPrincipal = (datos?.persona_fisica?.fecha_nacimiento || '').trim();
    if (tipo === 'persona_moral') fechaPrincipal = (datos?.persona_moral?.fecha_constitucion || '').trim();

    const estado = 'activo';

    await pool.query(
      `
      INSERT INTO clientes (
        empresa_id,
        nombre_entidad,
        tipo_cliente,
        fecha_nacimiento_constitucion,
        nacionalidad,
        actividad_economica,
        datos_completos,
        estado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        empresaId,
        nombreEntidad,
        tipo,
        fechaPrincipal ? `${fechaPrincipal.slice(0, 4)}-${fechaPrincipal.slice(4, 6)}-${fechaPrincipal.slice(6, 8)}` : null,
        nacionalidadTexto,
        actividadTexto,
        datos,
        estado
      ]
    );

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Error al crear cliente:', error);
    res.status(400).json({ error: error?.message || 'Error al crear cliente' });
  }
}

router.post(
  '/',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  createClienteHandler
);

router.post(
  '/clientes',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  createClienteHandler
);

/**
 * ===============================
 * ACTUALIZAR CLIENTE (EDITAR)
 * ===============================
 * PUT /api/cliente/:id
 * PUT /api/cliente/clientes/:id (alias)
 *
 * - teléfono obligatorio siempre
 * - estado: solo admin/consultor (opcional)
 */
async function updateClienteHandler(req: AuthRequest, res: any) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No autenticado' });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });

    await assertClienteScopeOrThrow(user, id);

    const tipo = normalizeTipoCliente(req.body?.tipo_cliente);
    if (!tipo) return res.status(400).json({ error: 'tipo_cliente inválido' });

    const datos = req.body?.datos_completos;
    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'datos_completos es obligatorio' });
    }

    validatePayloadOrThrow(tipo, datos);

    const nombreEntidad = buildNombreEntidad(tipo, datos);
    if (!nombreEntidad) return res.status(400).json({ error: 'No se pudo construir nombre del cliente' });

    const actividadTexto = buildActividadTexto(tipo, datos);
    const nacionalidadTexto = buildNacionalidadTexto(tipo, datos);

    let fechaPrincipal: string | null = null;
    if (tipo === 'persona_fisica') fechaPrincipal = (datos?.persona_fisica?.fecha_nacimiento || '').trim();
    if (tipo === 'persona_moral') fechaPrincipal = (datos?.persona_moral?.fecha_constitucion || '').trim();

    // Estado: solo admin/consultor pueden cambiarlo (si viene en body)
    let estadoSql = '';
    const params: any[] = [];

    // Set base
    params.push(nombreEntidad); // $1
    params.push(tipo);          // $2
    params.push(
      fechaPrincipal
        ? `${fechaPrincipal.slice(0, 4)}-${fechaPrincipal.slice(4, 6)}-${fechaPrincipal.slice(6, 8)}`
        : null
    ); // $3
    params.push(nacionalidadTexto); // $4
    params.push(actividadTexto);    // $5
    params.push(datos);             // $6

    const setParts = [
      `nombre_entidad = $1`,
      `tipo_cliente = $2`,
      `fecha_nacimiento_constitucion = $3`,
      `nacionalidad = $4`,
      `actividad_economica = $5`,
      `datos_completos = $6`,
      `actualizado_en = NOW()`
    ];

    if (req.body?.estado && (user.rol === 'admin' || user.rol === 'consultor')) {
      const estado = String(req.body.estado).trim().toLowerCase();
      if (!['activo', 'inactivo', 'suspendido'].includes(estado)) {
        return res.status(400).json({ error: 'estado inválido' });
      }
      params.push(estado);
      setParts.push(`estado = $${params.length}`);
    }

    // where id
    params.push(id);

    await pool.query(
      `
      UPDATE clientes
      SET ${setParts.join(', ')}
      WHERE id = $${params.length}
      `,
      params
    );

    res.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 400;
    console.error('Error al actualizar cliente:', error);
    res.status(status).json({ error: error?.message || 'Error al actualizar cliente' });
  }
}

router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  updateClienteHandler
);

router.put(
  '/clientes/:id',
  authenticate,
  authorizeRoles('admin', 'consultor', 'cliente'),
  updateClienteHandler
);

export default router;
