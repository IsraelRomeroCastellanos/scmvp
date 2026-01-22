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







##	21-01-2026

# SCMVP — Contrato FE congelado (AS-IS)
Fuente: `frontend/src/app/cliente/registrar-cliente/page.tsx`

Este documento congela el contrato FE tal como está implementado en:
- `buildPayload()` (estructura del payload)
- validaciones (mensajes/paths literales)

> Nota crítica (AS-IS): Hay discrepancias literales entre:
> - paths usados en validaciones (ej. `contacto.domicilio.*`, `persona.estado_civil`)
> - estructura generada por `buildPayload()` (ej. `contacto.domicilio_mexico.*`, `datos_completos.estado_civil`)
> Estas discrepancias se listan en “Observaciones de consistencia”.

---

## 0) Envelope (común a todos los tipos) — `buildPayload()`
Campos top-level enviados:
- `empresa_id` (number; `parseInt(empresaId, 10)`)
- `tipo_cliente` (`"persona_fisica" | "persona_moral" | "fideicomiso"`)
- `nombre_entidad` (string; `trim()`)
- `nacionalidad` (string; `valueToCatalogKey(nacionalidad)`)
- `datos_completos` (object)

Validaciones / mensajes literales encontrados:
- "empresa_id inválido"
- "nombre_entidad es obligatorio"
- "nacionalidad es obligatoria"

---

## 1) Sección común: `datos_completos.contacto` — `buildContacto()`
Estructura enviada (común PF/PM/FIDE):
- `datos_completos.contacto.pais` (`valueToCatalogKey(contactoPais)`)
- `datos_completos.contacto.email` (`trim()`)
- `datos_completos.contacto.telefono.codigo_pais` (`trim()`)
- `datos_completos.contacto.telefono.numero` (`trim()`)
- `datos_completos.contacto.telefono.ext` (`trim() || null`)
- `datos_completos.contacto.domicilio_mexico.calle` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.numero` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.interior` (`trim() || null`)
- `datos_completos.contacto.domicilio_mexico.colonia` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.municipio` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.ciudad_delegacion` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.codigo_postal` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.estado` (`trim()`)
- `datos_completos.contacto.domicilio_mexico.pais` (`trim()`)

Mensajes/validaciones literales encontrados (contacto):
- "contacto.pais es obligatorio"
- "contacto.email es obligatorio"
- "contacto.email inválido"
- "contacto.telefono es obligatorio"
- "contacto.telefono.codigo_pais es obligatorio"
- "contacto.telefono.codigo_pais inválido"
- "contacto.telefono.ext inválida"
- (paths de domicilio en validación aparecen como `contacto.domicilio.*`, ver Observaciones)

---

## 2) PF — `tipo_cliente = "persona_fisica"` — `buildPayload()`

### 2.1 `datos_completos.persona`
Estructura enviada:
- `datos_completos.persona.tipo` = `"persona_fisica"`
- `datos_completos.persona.rfc` (upper)
- `datos_completos.persona.curp` (upper)
- `datos_completos.persona.fecha_nacimiento` (normalizada a `YYYYMMDD` si aplica)
- `datos_completos.persona.nombres`
- `datos_completos.persona.apellido_paterno`
- `datos_completos.persona.apellido_materno`
- `datos_completos.persona.actividad_economica`
  - si hay match en catálogo: `{ clave, descripcion }`
  - si no: string `pfActividad`

Mensajes/validaciones literales encontrados (persona PF):
- "persona.rfc inválido"
- "persona.curp inválido"
- "persona.fecha_nacimiento inválida (AAAAMMDD)"

### 2.2 PF extras en `datos_completos` (nivel raíz de `datos_completos`)
Estructura enviada:
- `datos_completos.calidad_migratoria` (string o null)
- `datos_completos.estado_civil` (string)
- `datos_completos.regimen_matrimonial` (string)
- `datos_completos.bienes_mancomunados` (string)

- `datos_completos.direccion_privada.calle`
- `datos_completos.direccion_privada.numero`
- `datos_completos.direccion_privada.colonia`
- `datos_completos.direccion_privada.municipio`
- `datos_completos.direccion_privada.ciudad_delegacion`
- `datos_completos.direccion_privada.codigo_postal`
- `datos_completos.direccion_privada.estado`
- `datos_completos.direccion_privada.pais`

- `datos_completos.ocupacion`
- `datos_completos.actividad_profesional`

- `datos_completos.cargo_publico.actual`
- `datos_completos.cargo_publico.previo`
- `datos_completos.cargo_publico.familiar`

- `datos_completos.terceros.manifiesta` (boolean)
- `datos_completos.terceros.actividad_giro` (string o null)
- `datos_completos.terceros.relacion` (string o null)
- `datos_completos.terceros.sin_documentacion` (boolean o null)

Mensajes/validaciones literales encontrados (PF extras; paths aparecen bajo `persona.*` en validación):
- "persona.estado_civil es obligatorio"
- "persona.regimen_matrimonial es obligatorio"
- "persona.bienes_mancomunados es obligatorio"
- "persona.direccion_privada.calle es obligatoria"
- "persona.direccion_privada.numero es obligatorio"
- "persona.direccion_privada.colonia es obligatoria"
- "persona.direccion_privada.municipio es obligatorio"
- "persona.direccion_privada.ciudad_delegacion es obligatoria"
- "persona.direccion_privada.codigo_postal es obligatorio"
- "persona.direccion_privada.estado es obligatorio"
- "persona.direccion_privada.pais es obligatorio"
- "persona.ocupacion es obligatoria"
- "persona.actividad_profesional es obligatoria"
- "persona.cargo_publico.actual es obligatorio"
- "persona.cargo_publico.previo es obligatorio"
- "persona.cargo_publico.familiar es obligatorio"
- "persona.terceros.actividad_giro es obligatoria"
- "persona.terceros.relacion es obligatoria"

### 2.3 Campos top-level adicionales presentes SOLO en PF (AS-IS en builder)
Estructura enviada:
- `beneficiario_controlador.nombres`
- `beneficiario_controlador.apellido_paterno`
- `beneficiario_controlador.apellido_materno`
- `representante_es_accionista` (boolean)
- `accionista_tercero` (null OR object):
  - `accionista_tercero.nombres`
  - `accionista_tercero.apellido_paterno`
  - `accionista_tercero.apellido_materno`
  - `accionista_tercero.fecha_nacimiento` (normalizada)
  - `accionista_tercero.porcentaje_accionario`
  - `accionista_tercero.nacionalidad` (`valueToCatalogKey`)
  - `accionista_tercero.actividad_giro`
  - `accionista_tercero.relacion`

Mensajes/validaciones literales encontrados (BC/accionista; aparecen bajo PM en validación):
- "beneficiario_controlador.nombres es obligatorio"
- "beneficiario_controlador.apellido_paterno es obligatorio"
- "beneficiario_controlador.apellido_materno es obligatorio"
- "accionista.nombres es obligatorio"
- "accionista.apellido_paterno es obligatorio"
- "accionista.apellido_materno es obligatorio"
- "accionista.fecha_nacimiento es obligatoria"
- "accionista.fecha_nacimiento inválida (AAAAMMDD)"
- "accionista.porcentaje es obligatorio"
- "accionista.porcentaje inválido"
- "accionista.nacionalidad es obligatoria"
- "accionista.actividad_giro es obligatoria"
- "accionista.relacion es obligatoria"

---

## 3) PM — `tipo_cliente = "persona_moral"` — `buildPayload()`

### 3.1 `datos_completos.empresa`
Estructura enviada:
- `datos_completos.empresa.tipo` = `"persona_moral"`
- `datos_completos.empresa.rfc` (upper)
- `datos_completos.empresa.regimen_capital`
- `datos_completos.empresa.fecha_constitucion` (normalizada `YYYYMMDD` si aplica)
- `datos_completos.empresa.giro_mercantil`
  - si hay match: `{ clave, descripcion }`
  - si no: string `pmGiro`

### 3.2 `datos_completos.representante`
Estructura enviada:
- `datos_completos.representante.nombre_completo` (derivado o concatenado)
- `datos_completos.representante.nombres`
- `datos_completos.representante.apellido_paterno`
- `datos_completos.representante.apellido_materno`
- `datos_completos.representante.fecha_nacimiento` (normalizada)
- `datos_completos.representante.nacionalidad` (`valueToCatalogKey`)
- `datos_completos.representante.regimen_estancia_mexico` (string o null)
- `datos_completos.representante.curp` (upper)
- `datos_completos.representante.rfc` (upper)
- `datos_completos.representante.telefono_casa`
- `datos_completos.representante.celular`

- `datos_completos.representante.domicilio_mexico.calle`
- `datos_completos.representante.domicilio_mexico.numero`
- `datos_completos.representante.domicilio_mexico.interior` (string o null)
- `datos_completos.representante.domicilio_mexico.colonia`
- `datos_completos.representante.domicilio_mexico.municipio`
- `datos_completos.representante.domicilio_mexico.ciudad_delegacion`
- `datos_completos.representante.domicilio_mexico.codigo_postal`
- `datos_completos.representante.domicilio_mexico.estado`
- `datos_completos.representante.domicilio_mexico.pais`

- `datos_completos.representante.identificacion.tipo`
- `datos_completos.representante.identificacion.autoridad`
- `datos_completos.representante.identificacion.numero`
- `datos_completos.representante.identificacion.fecha_expedicion` (normalizada)
- `datos_completos.representante.identificacion.fecha_expiracion` (normalizada)

Mensajes/validaciones literales encontrados (representante PM; paths en validación usan `representante.*`):
- "representante.nombre_completo es obligatorio"
- (domicilio representante: mensajes existen con `representante.domicilio.*`, ver Observaciones)
- (identificación representante: mensajes existen con `representante.identificacion.*`, ver Observaciones)

---

## 4) FIDEICOMISO — `tipo_cliente = "fideicomiso"` — `buildPayload()`

### 4.1 `datos_completos.fideicomiso`
Estructura enviada:
- `datos_completos.fideicomiso.identificador`
- `datos_completos.fideicomiso.denominacion_fiduciario`
- `datos_completos.fideicomiso.rfc_fiduciario` (upper)

Mensajes/validaciones literales encontrados:
- "fideicomiso.rfc_fiduciario inválido"

### 4.2 `datos_completos.representante` (Fideicomiso)
Estructura enviada:
- `datos_completos.representante.nombre_completo` (concatenado)
- `datos_completos.representante.rfc` (upper)
- `datos_completos.representante.curp` (upper)
- `datos_completos.representante.fecha_nacimiento` (normalizada)

Mensajes/validaciones literales encontrados:
- "representante.nombre_completo es obligatorio"

---

## 5) Respuesta / errores literales de submit (sin interpretación)
- "Error HTTP ${res.status}"
- "Registrado, pero no se recibió id. Revisa respuesta del backend."

---

## 6) Observaciones de consistencia (AS-IS, literal)
Estas discrepancias aparecen tal cual en el archivo:
- `buildPayload()` envía `contacto.domicilio_mexico.*`, pero las validaciones incluyen mensajes con path `contacto.domicilio.*`.
- `buildPayload()` envía `datos_completos.estado_civil` / `regimen_matrimonial` / `bienes_mancomunados` / `direccion_privada.*`, pero las validaciones incluyen mensajes con path `persona.estado_civil`, `persona.regimen_matrimonial`, `persona.bienes_mancomunados`, `persona.direccion_privada.*`.
- `buildPayload()` (PF) incluye top-level `beneficiario_controlador` / `representante_es_accionista` / `accionista_tercero`, mientras validaciones de `beneficiario_controlador.*` están condicionadas a tipo `"persona_moral"` en el código.

(Estas observaciones no cambian el contrato; solo registran discrepancias AS-IS.)

