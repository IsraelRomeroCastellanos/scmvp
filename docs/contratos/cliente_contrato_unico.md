\# SCMVP — Contrato Único de Cliente (v0.6)



Fuente: evidencia por curl en PROD (Render) y validaciones reales del backend.



\## Objetivo

Unificar el “shape” de payload FE→BE para:

\- Registrar cliente (PF / PM / Fideicomiso)

\- Validaciones bloqueantes FE (onBlur + submit) y BE (siempre)

\- Errores 400 por campo específico



\## Endpoint cubierto

\- POST /api/cliente/registrar-cliente (protegido, Bearer)



\## Principios

1\) El backend valida principalmente dentro de `datos\_completos`.

2\) Códigos de país/nacionalidad deben ser \*\*claves de catálogo\*\* (ej. "MEX").

3\) Si falta un campo obligatorio: \*\*400\*\* con mensaje específico.

4\) Duplicado por empresa\_id + nombre\_entidad: \*\*409\*\* (si aplica).



---



\# Estructura general del payload



\## Campos obligatorios en raíz (comunes)

\- empresa\_id: number (obligatorio para admin/consultor sin empresa asociada)

\- tipo\_cliente: "persona\_fisica" | "persona\_moral" | "fideicomiso"

\- nombre\_entidad: string

\- nacionalidad: string (clave de catálogo; ej. "MEX")

\- datos\_completos: object (contenedor de datos por tipo)



\## datos\_completos.contacto (común)

\- contacto.pais: string (clave de catálogo; ej. "MEX")

\- contacto.telefono: string



---



\# Mínimos por tipo (confirmados por evidencia)



\## 1) Persona Moral (tipo\_cliente="persona\_moral")

Requeridos en datos\_completos:

\- empresa.rfc: string

\- empresa.fecha\_constitucion: string (fecha) \*(formato aún no estandarizado en BE; FE puede usar AAAAMMDD o ISO según UI)\*

\- empresa.giro\_mercantil: string (catálogo interno/definir clave)

\- representante.nombre\_completo: string



\### Ejemplo mínimo (PM)

{

&nbsp; "empresa\_id": 32,

&nbsp; "tipo\_cliente": "persona\_moral",

&nbsp; "nombre\_entidad": "EJEMPLO PM",

&nbsp; "nacionalidad": "MEX",

&nbsp; "datos\_completos": {

&nbsp;   "contacto": { "pais": "MEX", "telefono": "3333333333" },

&nbsp;   "empresa": {

&nbsp;     "rfc": "AAA010101AA1",

&nbsp;     "fecha\_constitucion": "20200101",

&nbsp;     "giro\_mercantil": "SERVICIOS"

&nbsp;   },

&nbsp;   "representante": { "nombre\_completo": "Representante PM" }

&nbsp; }

}



---



\## 2) Persona Física (tipo\_cliente="persona\_fisica")

Requeridos en datos\_completos:

\- persona.rfc: string

\- persona.curp: string (regla de negocio estandarizada)

\- persona.nombres: string

\- persona.apellido\_paterno: string

\- persona.fecha\_nacimiento: string \*\*AAAAMMDD\*\* (estandarizado)

\- persona.actividad\_economica: string o {clave, descripcion} (catálogo)



Opcional:

\- persona.apellido\_materno (si aplica en UI)



\### Ejemplo mínimo (PF)

{

&nbsp; "empresa\_id": 32,

&nbsp; "tipo\_cliente": "persona\_fisica",

&nbsp; "nombre\_entidad": "EJEMPLO PF",

&nbsp; "nacionalidad": "MEX",

&nbsp; "datos\_completos": {

&nbsp;   "contacto": { "pais": "MEX", "telefono": "3333333333" },

&nbsp;   "persona": {

&nbsp;     "rfc": "AAA010101AA2",

&nbsp;     "curp": "XEXX010101HNEXXXA4",

&nbsp;     "nombres": "Juan",

&nbsp;     "apellido\_paterno": "Pérez",

&nbsp;     "fecha\_nacimiento": "19900101",

&nbsp;     "actividad\_economica": "ACT-CLAVE"

&nbsp;   }

&nbsp; }

}



---



\## 3) Fideicomiso (tipo\_cliente="fideicomiso")

Requeridos en datos\_completos:

\- fideicomiso.fideicomiso\_nombre: string

\- fideicomiso.identificador: string

\- fideicomiso.denominacion\_fiduciario: string

\- fideicomiso.rfc\_fiduciario: string

\- representante.nombre\_completo: string

\- representante.rfc: string

\- representante.curp: string

\- representante.fecha\_nacimiento: string \*\*AAAAMMDD\*\*



\### Ejemplo mínimo (Fideicomiso)

{

&nbsp; "empresa\_id": 32,

&nbsp; "tipo\_cliente": "fideicomiso",

&nbsp; "nombre\_entidad": "EJEMPLO FID",

&nbsp; "nacionalidad": "MEX",

&nbsp; "datos\_completos": {

&nbsp;   "contacto": { "pais": "MEX", "telefono": "3333333333" },

&nbsp;   "fideicomiso": {

&nbsp;     "fideicomiso\_nombre": "FIDEICOMISO PRUEBA",

&nbsp;     "identificador": "FID-0001",

&nbsp;     "denominacion\_fiduciario": "FIDUCIARIO PRUEBA",

&nbsp;     "rfc\_fiduciario": "AAA010101AA3"

&nbsp;   },

&nbsp;   "representante": {

&nbsp;     "nombre\_completo": "Representante Fideicomiso",

&nbsp;     "rfc": "AAA010101AA4",

&nbsp;     "curp": "XEXX010101HNEXXXA4",

&nbsp;     "fecha\_nacimiento": "19900101"

&nbsp;   }

&nbsp; }

}



---



\# Validaciones y errores



\## Validaciones

\- FE: bloqueantes (onBlur + submit)

\- BE: bloqueantes (siempre)



\## Errores BE (convención actual)

\- 400: {"error":"<mensaje específico>"}

&nbsp; Ej: "persona.actividad\_economica es obligatoria"

\- 401: token faltante/invalidado

\- 409: duplicado empresa\_id + nombre\_entidad (si aplica)



\## Catálogos

\- pais / nacionalidad: claves del catálogo de países (ej. "MEX")

\- actividad\_economica: clave de catálogo SAT (o estructura {clave, descripcion})

\- giro\_mercantil: catálogo interno (definir clave)



