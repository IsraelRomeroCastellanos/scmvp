# Contrato JSON Cliente V2

## Objetivo

Definir la estructura canónica de `datos_completos` para clientes PLD.

Este contrato busca:

-   Mantener compatibilidad con JSONB actual.
-   Integrar catálogos oficiales.
-   Mejorar consistencia de datos.
-   Reducir captura manual cuando exista información catalogada.
-   Servir como fuente de verdad entre frontend y backend.

------------------------------------------------------------------------

# Estructura general

La propiedad `datos_completos` mantiene una estructura por tipo de
cliente:

``` json
{
  "contacto": {},
  "persona": {},
  "empresa": {},
  "fideicomiso": {}
}
```

Solo debe existir la sección correspondiente al tipo de cliente.

------------------------------------------------------------------------

# CONTACTO

Aplica para:

-   Persona Física.
-   Persona Moral.
-   Fideicomiso.

``` json
{
  "contacto": {
    "pais": "MEX",
    "email": "",
    "telefono": "",
    "telefono_detalle": {
      "codigo_pais": "+52",
      "numero": "",
      "ext": null
    },
    "domicilio": {
      "calle": "",
      "numero": "",
      "interior": null,
      "colonia": "",
      "municipio": "",
      "ciudad_delegacion": "",
      "codigo_postal": "",
      "estado": "",
      "pais": "",
      "catalogo": {
        "codigo_postal": "",
        "clave_estado": "",
        "clave_municipio": "",
        "tipo_asentamiento": ""
      }
    }
  }
}
```

------------------------------------------------------------------------

# PERSONA FÍSICA

``` json
{
  "persona": {
    "tipo": "persona_fisica",
    "nombres": "",
    "apellido_paterno": "",
    "apellido_materno": "",
    "fecha_nacimiento": "",
    "rfc": "",
    "curp": "",
    "actividad_economica": "",
    "actividad_economica_catalogo": {
      "clave": "",
      "descripcion": ""
    }
  }
}
```

------------------------------------------------------------------------

# PERSONA MORAL

``` json
{
  "empresa": {
    "tipo": "persona_moral",
    "rfc": "",
    "razon_social": "",
    "nombre_entidad": "",
    "fecha_constitucion": "",
    "giro_mercantil": "",
    "giro_mercantil_catalogo": {
      "clave": "",
      "descripcion": ""
    }
  }
}
```

------------------------------------------------------------------------

# FIDEICOMISO

``` json
{
  "fideicomiso": {
    "nombre_entidad": "",
    "denominacion": "",
    "nombre_fideicomiso": "",
    "identificador": "",
    "rfc_fiduciario": "",
    "denominacion_fiduciario": ""
  }
}
```

------------------------------------------------------------------------

# Reglas de implementación

1.  Los campos actuales de texto permanecen para compatibilidad.
2.  Los campos terminados en `_catalogo` contienen la información
    validada contra catálogos.
3.  No se eliminan propiedades existentes durante esta fase MVP.
4.  Los clientes existentes pueden no tener información de catálogo.
5.  Los nuevos registros deben llenar información de catálogo cuando
    aplique.
6.  La validación de existencia de catálogo será responsabilidad del
    backend.
7.  Frontend y backend deben alinearse a este contrato antes de cambios
    funcionales.

------------------------------------------------------------------------

# Catálogos relacionados

## Países

Tabla:

`cat_paises`

Uso:

-   País de contacto.
-   País de domicilio.

------------------------------------------------------------------------

## Actividades económicas

Tabla:

`cat_actividades_economicas`

Uso:

-   Persona Física.

------------------------------------------------------------------------

## Giros mercantiles

Tabla:

`cat_giros_mercantiles`

Uso:

-   Persona Moral.

------------------------------------------------------------------------

## Códigos postales

Tabla:

`cat_codigos_postales`

Uso:

-   Domicilio.
-   Estado.
-   Municipio.
-   Ciudad.
-   Colonia.
