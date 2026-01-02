// backend/src/routes/cliente.routes.ts
import { Router, Request, Response } from 'express';
import pool from '../db';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

type ClienteTipo = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getUser(req: Request) {
  return (req as AuthRequest).user;
}

function isValidRFC(rfc: string) {
  // Validación mínima: 12 o 13, letras/números, sin espacios
  const s = (rfc ?? '').trim().toUpperCase();
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
}

function isValidCURP(curp: string) {
  const s = (curp ?? '').trim().toUpperCase();
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(s);
}

function isYYYYMMDD(v: string) {
  const s = (v ?? '').trim();
  if (!/^\d{8}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

function normalizePaisValue(v: any) {
  // Tu FE manda tipo "MEXICO,MX" o "CANADA,CA". Normalizamos mínimo.
  const s = String(v ?? '').trim().toUpperCase();
  return s || null;
}

function normalizeStr(v: any) {
  const s = String(v ?? '').trim();
  return s ? s : null;
}

function normalizeCatalogItem(v: any) {
  // Acepta:
  // - { clave, descripcion }
  // - o string (por compatibilidad)
  if (!v) return null;

  if (typeof v === 'string') {
    const s = v.trim();
    return s ? { clave: s, descripcion: s } : null;
  }

  const clave = String(v?.clave ?? '').trim();
  const descripcion = String(v?.descripcion ?? '').trim();
  if (!clave || !descripcion) return null;

  return { clave, descripcion };
}

function requireField(cond: any, msg: string) {
  if (!cond) return msg;
  return null;
}

function buildNombreCompleto(rep: any) {
  const nombres = String(rep?.nombres ?? '').trim();
  const apP = String(rep?.apellido_paterno ?? '').trim();
  const apM = String(rep?.apellido_materno ?? '').trim();
  const parts = [nombres, apP, apM].filter(Boolean);
  const full = parts.join(' ').trim();
  return full || null;
}

function validatePayloadByTipo(tipo: ClienteTipo, body: any) {
  const errs: string[] = [];

  const empresa_id = body?.empresa_id;
  const tipo_cliente = body?.tipo_cliente;
  const nombre_entidad = normalizeStr(body?.nombre_entidad);
  const nacionalidad = normalizePaisValue(body?.nacionalidad);

  const dc = body?.datos_completos ?? {};
  const contacto = dc?.contacto ?? {};
  const contactoPais = normalizePaisValue(contacto?.pais);
  const contactoTel = normalizeStr(contacto?.telefono);

  errs.push(
    requireField(Number.isInteger(empresa_id) && empresa_id > 0, 'empresa_id es obligatorio y debe ser entero > 0') ||
      ''
  );
  errs.push(requireField(tipo_cliente === tipo, 'tipo_cliente inválido') || '');
  errs.push(requireField(!!nombre_entidad, 'nombre_entidad es obligatorio') || '');
  errs.push(requireField(!!nacionalidad, 'nacionalidad es obligatoria') || '');

  // Contacto (mínimo)
  errs.push(requireField(!!contactoPais, 'datos_completos.contacto.pais es obligatorio') || '');
  errs.push(requireField(!!contactoTel, 'datos_completos.contacto.telefono es obligatorio') || '');

  if (tipo === 'persona_fisica') {
    const persona = dc?.persona ?? {};
    const nombres = normalizeStr(persona?.nombres);
    const apP = normalizeStr(persona?.apellido_paterno);
    // ap_materno lo dejamos opcional
    const actividad = normalizeCatalogItem(persona?.actividad_economica);

    errs.push(requireField(!!nombres, 'persona_fisica: persona.nombres es obligatorio') || '');
    errs.push(requireField(!!apP, 'persona_fisica: persona.apellido_paterno es obligatorio') || '');
    errs.push(
      requireField(
        !!actividad,
        'persona_fisica: persona.actividad_economica es obligatoria (catálogo: {clave, descripcion})'
      ) || ''
    );
  }

  if (tipo === 'persona_moral') {
    const empresa = dc?.empresa ?? {};
    const representante = dc?.representante ?? {};

    const rfcEmpresa = normalizeStr(empresa?.rfc);
    const fechaConst = normalizeStr(empresa?.fecha_constitucion);
    const giro =
      normalizeCatalogItem(empresa?.giro_mercantil) ??
      normalizeCatalogItem(empresa?.giro) ??
      (normalizeStr(empresa?.giro) ? { clave: String(empresa.giro), descripcion: String(empresa.giro) } : null);

    const repNombres = normalizeStr(representante?.nombres);
    const repApP = normalizeStr(representante?.apellido_paterno);
    const repApM = normalizeStr(representante?.apellido_materno);
    const repFecha = normalizeStr(representante?.fecha_nacimiento);
    const repRfc = normalizeStr(representante?.rfc);
    const repCurp = normalizeStr(representante?.curp);

    errs.push(requireField(!!rfcEmpresa, 'persona_moral: empresa.rfc es obligatorio') || '');
    if (rfcEmpresa) errs.push(requireField(isValidRFC(rfcEmpresa), 'persona_moral: empresa.rfc no tiene formato RFC') || '');

    errs.push(requireField(!!fechaConst, 'persona_moral: empresa.fecha_constitucion es obligatoria') || '');

    errs.push(requireField(!!giro, 'persona_moral: empresa.giro_mercantil es obligatorio (catálogo)') || '');

    // Representante obligatorio (mínimo)
    errs.push(requireField(!!repNombres, 'persona_moral: representante.nombres es obligatorio') || '');
    errs.push(requireField(!!repApP, 'persona_moral: representante.apellido_paterno es obligatorio') || '');
    errs.push(requireField(!!repApM, 'persona_moral: representante.apellido_materno es obligatorio') || '');
    errs.push(requireField(!!repFecha && isYYYYMMDD(repFecha), 'persona_moral: representante.fecha_nacimiento (AAAAMMDD) es obligatoria') || '');
    errs.push(requireField(!!repRfc && isValidRFC(repRfc), 'persona_moral: representante.rfc (formato RFC) es obligatorio') || '');
    errs.push(requireField(!!repCurp && isValidCURP(repCurp), 'persona_moral: representante.curp (formato CURP) es obligatorio') || '');
  }

  if (tipo === 'fideicomiso') {
    const fidei = dc?.fideicomiso ?? {};
    const rep = dc?.representante ?? {};

    const identificador = normalizeStr(fidei?.identificador);
    const rfcFiduciario = normalizeStr(fidei?.rfc_fiduciario);
    const denomFiduciario = normalizeStr(fidei?.denominacion_fiduciario);

    // Representante: aceptamos nombre_completo o (nombres+apellidos)
    const nombreCompleto = normalizeStr(rep?.nombre_completo) ?? buildNombreCompleto(rep);
    const repFecha = normalizeStr(rep?.fecha_nacimiento);
    const repRfc = normalizeStr(rep?.rfc);
    const repCurp = normalizeStr(rep?.curp);

    // Campos fideicomiso mínimos
    errs.push(requireField(!!identificador, 'fideicomiso: fideicomiso.identificador es obligatorio') || '');
    errs.push(requireField(!!rfcFiduciario && isValidRFC(rfcFiduciario), 'fideicomiso: fideicomiso.rfc_fiduciario (RFC) es obligatorio') || '');
    errs.push(requireField(!!denomFiduciario, 'fideicomiso: fideicomiso.denominacion_fiduciario es obligatoria') || '');

    // Representante obligatorio
    errs.push(requireField(!!nombreCompleto, 'fideicomiso: representante (nombres+apellidos o nombre_completo) es obligatorio') || '');
    errs.push(requireField(!!repFecha && isYYYYMMDD(repFecha), 'fideicomiso: representante.fecha_nacimiento (AAAAMMDD) es obligatoria') || '');
    errs.push(requireField(!!repRfc && isValidRFC(repRfc), 'fideicomiso: representante.rfc (RFC) es obligatorio') || '');
    errs.push(requireField(!!repCurp && isValidCURP(repCurp), 'fideicomiso: representante.curp (CURP) es obligatorio') || '');
  }

  return errs.filter(Boolean);
}

async function listClientesHandler(req: Request, res: Response) {
  try {
    const user = getUser(req);
    // admin puede listar por empresa_id query, si no, usa el del token
    const empresa_id = Number((req.query.empresa_id ?? user?.empresa_id) as any);

    if (!Number.isFinite(empresa_id) || empresa_id <= 0) {
      return res.status(400).json({ error: 'empresa_id inválido' });
    }

    const result = await pool.query(
      `
      SELECT id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresa_id]
    );

    return res.json({ clientes: result.rows });
  } catch (e) {
    console.error('Error list clientes:', e);
    return res.status(500).json({ error: 'Error listando clientes' });
  }
}

/**
 * GET /api/cliente/clientes
 */
router.get('/clientes', authenticate, listClientesHandler);

/**
 * GET /api/cliente/mis-clientes
 * Alias compatible (por lo que ya venías usando)
 */
router.get('/mis-clientes', authenticate, listClientesHandler);

/**
 * GET /api/cliente/clientes/:id
 */
router.get('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    // Si admin: puede ver cualquiera (opcional), si no: restringe por empresa_id del token
    const empresa_id = Number(user?.empresa_id);
    const isAdmin = user?.rol === 'admin';

    const q = isAdmin
      ? `SELECT * FROM clientes WHERE id = $1 LIMIT 1`
      : `SELECT * FROM clientes WHERE id = $1 AND empresa_id = $2 LIMIT 1`;

    const params = isAdmin ? [id] : [id, empresa_id];

    const result = await pool.query(q, params);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: result.rows[0] });
  } catch (e) {
    console.error('Error get cliente:', e);
    return res.status(500).json({ error: 'Error obteniendo cliente' });
  }
});

/**
 * POST /api/cliente/registrar-cliente
 * (y alias POST /api/cliente/clientes)
 */
async function createClienteHandler(req: Request, res: Response) {
  try {
    const user = getUser(req);
    const body = req.body ?? {};

    // empresa_id: admin puede mandarlo; si no, usar el del token
    const empresa_id = Number(body.empresa_id ?? user?.empresa_id);
    const tipo_cliente = String(body.tipo_cliente ?? '').trim() as ClienteTipo;

    const payload = {
      ...body,
      empresa_id,
      tipo_cliente
    };

    const errs = validatePayloadByTipo(tipo_cliente, payload);
    if (errs.length) return res.status(400).json({ error: errs[0], details: errs });

    // Duplicado: empresa_id + nombre_entidad
    const dup = await pool.query(
      `SELECT 1 FROM clientes WHERE empresa_id = $1 AND LOWER(nombre_entidad) = LOWER($2) LIMIT 1`,
      [empresa_id, String(body.nombre_entidad).trim()]
    );
    if (dup.rows.length) {
      return res.status(409).json({ error: 'Cliente duplicado para esa empresa (empresa_id + nombre_entidad)' });
    }

    // Normalizaciones (mínimas)
    const dc = body.datos_completos ?? {};
    dc.contacto = {
      ...(dc.contacto ?? {}),
      pais: normalizePaisValue(dc?.contacto?.pais),
      telefono: String(dc?.contacto?.telefono ?? '').trim()
    };

    if (tipo_cliente === 'persona_fisica') {
      dc.persona = {
        ...(dc.persona ?? {}),
        tipo: 'persona_fisica',
        actividad_economica: normalizeCatalogItem(dc?.persona?.actividad_economica)
      };
    }

    if (tipo_cliente === 'persona_moral') {
      dc.empresa = {
        ...(dc.empresa ?? {}),
        tipo: 'persona_moral',
        giro_mercantil:
          normalizeCatalogItem(dc?.empresa?.giro_mercantil) ??
          normalizeCatalogItem(dc?.empresa?.giro) ??
          (normalizeStr(dc?.empresa?.giro) ? { clave: String(dc.empresa.giro), descripcion: String(dc.empresa.giro) } : null)
      };
      dc.representante = {
        ...(dc.representante ?? {}),
        // opcional: nombre_completo calculado para facilitar vistas
        nombre_completo: buildNombreCompleto(dc?.representante) ?? normalizeStr(dc?.representante?.nombre_completo)
      };
    }

    if (tipo_cliente === 'fideicomiso') {
      const rep = dc?.representante ?? {};
      const nombreCompleto = normalizeStr(rep?.nombre_completo) ?? buildNombreCompleto(rep);

      dc.representante = {
        ...(rep ?? {}),
        nombre_completo: nombreCompleto
      };
    }

    const insert = await pool.query(
      `
      INSERT INTO clientes
        (empresa_id, nombre_entidad, tipo_cliente, nacionalidad, datos_completos, estado)
      VALUES
        ($1, $2, $3, $4, $5, 'activo')
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [
        empresa_id,
        String(body.nombre_entidad).trim(),
        tipo_cliente,
        normalizePaisValue(body.nacionalidad),
        dc
      ]
    );

    return res.status(201).json({ ok: true, cliente: insert.rows[0] });
  } catch (e: any) {
    console.error('Error crear cliente:', e);

    // Constraint check en DB (por si existe)
    if (String(e?.constraint ?? '').includes('clientes_tipo_cliente_check')) {
      return res.status(400).json({
        error: 'tipo_cliente aún no está habilitado en DB (constraint clientes_tipo_cliente_check)'
      });
    }

    return res.status(500).json({ error: 'Error creando cliente' });
  }
}

router.post('/registrar-cliente', authenticate, createClienteHandler);
router.post('/clientes', authenticate, createClienteHandler);

/**
 * PUT /api/cliente/clientes/:id
 */
router.put('/clientes/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    // Cargar actual
    const current = await pool.query(`SELECT * FROM clientes WHERE id = $1 LIMIT 1`, [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });

    const cliente = current.rows[0];

    // Seguridad (si no admin)
    const isAdmin = user?.rol === 'admin';
    if (!isAdmin) {
      const empresa_id = Number(user?.empresa_id);
      if (Number(cliente.empresa_id) !== empresa_id) return res.status(403).json({ error: 'Sin permiso' });
    }

    const body = req.body ?? {};
    const tipo_cliente = String(cliente.tipo_cliente) as ClienteTipo;
    const empresa_id = Number(cliente.empresa_id);

    const payload = {
      ...body,
      empresa_id,
      tipo_cliente,
      // Si no mandan nacionalidad, caemos a la actual (pero sigue siendo obligatoria: ya existe)
      nacionalidad: body.nacionalidad ?? cliente.nacionalidad
    };

    const errs = validatePayloadByTipo(tipo_cliente, payload);
    if (errs.length) return res.status(400).json({ error: errs[0], details: errs });

    // Merge datos_completos con lo que venga
    const dcPrev = cliente.datos_completos ?? {};
    const dcNext = body.datos_completos ?? {};

    // Normaliza contacto
    dcNext.contacto = {
      ...(dcPrev.contacto ?? {}),
      ...(dcNext.contacto ?? {}),
      pais: normalizePaisValue((dcNext.contacto ?? dcPrev.contacto)?.pais),
      telefono: String((dcNext.contacto ?? dcPrev.contacto)?.telefono ?? '').trim()
    };

    if (tipo_cliente === 'persona_fisica') {
      const persona = { ...(dcPrev.persona ?? {}), ...(dcNext.persona ?? {}) };
      persona.actividad_economica = normalizeCatalogItem(persona.actividad_economica);
      dcNext.persona = persona;
    }

    if (tipo_cliente === 'persona_moral') {
      const empresa = { ...(dcPrev.empresa ?? {}), ...(dcNext.empresa ?? {}) };
      empresa.giro_mercantil =
        normalizeCatalogItem(empresa.giro_mercantil) ??
        normalizeCatalogItem(empresa.giro) ??
        (normalizeStr(empresa.giro) ? { clave: String(empresa.giro), descripcion: String(empresa.giro) } : null);
      dcNext.empresa = empresa;

      const rep = { ...(dcPrev.representante ?? {}), ...(dcNext.representante ?? {}) };
      rep.nombre_completo = buildNombreCompleto(rep) ?? normalizeStr(rep.nombre_completo);
      dcNext.representante = rep;
    }

    if (tipo_cliente === 'fideicomiso') {
      const rep = { ...(dcPrev.representante ?? {}), ...(dcNext.representante ?? {}) };
      rep.nombre_completo = normalizeStr(rep.nombre_completo) ?? buildNombreCompleto(rep);
      dcNext.representante = rep;
    }

    const upd = await pool.query(
      `
      UPDATE clientes
      SET
        nombre_entidad = $1,
        nacionalidad = $2,
        datos_completos = $3,
        actualizado_en = NOW()
      WHERE id = $4
      RETURNING id, empresa_id, nombre_entidad, tipo_cliente, nacionalidad, estado, creado_en, actualizado_en
      `,
      [String(body.nombre_entidad ?? cliente.nombre_entidad).trim(), normalizePaisValue(payload.nacionalidad), dcNext, id]
    );

    return res.json({ ok: true, cliente: upd.rows[0] });
  } catch (e: any) {
    console.error('Error update cliente:', e);
    return res.status(500).json({ error: 'Error actualizando cliente' });
  }
});

export default router;
