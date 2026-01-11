# SCMVP — Contrato Único de Cliente (v0.7)

Fuente: evidencia por curl en PROD (Render) y validaciones reales del backend.

## Endpoint cubierto
- POST /api/cliente/registrar-cliente (protegido, Bearer)

## Principios
1) El backend valida principalmente dentro de `datos_completos`.
2) Códigos de país/nacionalidad deben ser claves de catálogo (ej. "MEX").
3) Errores son bloqueantes y regresan 400 con mensaje específico.
4) Para admin/consultor sin empresa asociada, `empresa_id` debe enviarse explícito.

---

# Estructura general del payload

## Campos obligatorios en raíz (comunes)
- empresa_id: number
- tipo_cliente: "persona_fisica" | "persona_moral" | "fideicomiso"
- nombre_entidad: string
- nacionalidad: string (clave catálogo; ej. "MEX")
- datos_completos: object

## datos_completos.contacto (común)
- contacto.pais: string (clave catálogo; ej. "MEX")
- contacto.telefono: string

---

# Mínimos por tipo (confirmados por evidencia)

## 1) Persona Física (tipo_cliente="persona_fisica")
Requeridos en datos_completos:
- persona.rfc: string
- persona.curp: string (obligatorio)
- persona.nombres: string
- persona.apellido_paterno: string
- persona.apellido_materno: string (obligatorio)
- persona.fecha_nacimiento: string AAAAMMDD (obligatorio)
- persona.actividad_economica: string o {clave, descripcion} (catálogo)

Notas:
- FE puede capturar fecha como YYYY-MM-DD pero debe normalizarla a AAAAMMDD antes de enviar.

## 2) Persona Moral (tipo_cliente="persona_moral")
Requeridos en datos_completos:
- empresa.rfc: string
- empresa.fecha_constitucion: string (fecha; formato UI definido en FE)
- empresa.giro_mercantil: string o {clave, descripcion} (catálogo interno)
- representante.nombre_completo: string

## 3) Fideicomiso (tipo_cliente="fideicomiso")
Requeridos en datos_completos:
- fideicomiso.fideicomiso_nombre: string (si aplica en UI)
- fideicomiso.identificador: string
- fideicomiso.denominacion_fiduciario: string
- fideicomiso.rfc_fiduciario: string
- representante.nombre_completo: string
- representante.rfc: string
- representante.curp: string
- representante.fecha_nacimiento: string AAAAMMDD (obligatorio)

---

# Validaciones y errores (convención actual)
- 400: {"error":"<mensaje específico>"}
- 401: token faltante/invalidado
- 409: duplicado empresa_id + nombre_entidad (si aplica)

## Diferencias GET vs PUT (clientes)
- GET /api/cliente/clientes/:id -> incluye datos_completos
- PUT /api/cliente/clientes/:id -> respuesta puede no incluir datos_completos (hacer GET posterior si se requiere refrescar UI)
