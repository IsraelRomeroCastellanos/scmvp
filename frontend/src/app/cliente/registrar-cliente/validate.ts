// frontend/src/app/cliente/registrar-cliente/validate.ts
export type RegistrarClienteValidatorCtx = {
  // Lo mínimo para no romper:
  tipoCliente: string;

  // Estado/valores que hoy lee validateField/validateAll:
  // (puede ser un objeto grande; no pasa nada)
  values: Record<string, any>;

  // Para reportar errores como hoy:
  setErrors: (
    next:
      | Record<string, string>
      | ((previous: Record<string, string>) => Record<string, string>),
  ) => void;

  // Helpers que ya existan en page.tsx y hoy se usan dentro de validaciones:
  isEmailValid: (email: string) => boolean;
  // agrega aquí cualquier helper existente que tu validateField use (RFC/CURP/fecha/etc.)
  helpers?: Record<string, any>;
};

export function createRegistrarClienteValidator(ctx: RegistrarClienteValidatorCtx) {
  function normalizedDate(value: any): string {
    return String(value ?? "").trim().replaceAll("-", "");
  }

  function validatePersonaFisicaField(field: string): string | undefined {
    const values = ctx.values;
    const required: Record<string, string> = {
      empresa_id: "Empresa es obligatoria",
      tipoNacionalidad: "Tipo de nacionalidad es obligatorio",
      nacionalidad: "Nacionalidad es obligatoria",
      "contacto.pais": "País de nacimiento es obligatorio",
      "contacto.email": "Email es obligatorio",
      "contacto.telefono.codigo_pais":
        "Código de país telefónico es obligatorio",
      "contacto.telefono.numero": "Teléfono es obligatorio",
      "contacto.domicilio.calle": "Calle es obligatoria",
      "contacto.domicilio.numero": "Número exterior es obligatorio",
      "contacto.domicilio.colonia": "Colonia es obligatoria",
      "contacto.domicilio.municipio": "Municipio es obligatorio",
      ...(ctx.tipoCliente !== "persona_fisica"
        ? {
            "contacto.domicilio.ciudad_delegacion":
              "Ciudad o delegación es obligatoria",
          }
        : {}),
      "contacto.domicilio.codigo_postal": "Código postal es obligatorio",
      "contacto.domicilio.estado": "Estado es obligatorio",
      "contacto.domicilio.pais": "País del domicilio es obligatorio",
      "persona.fecha_nacimiento": "Fecha de nacimiento es obligatoria",
      "persona.nombres": "Nombre(s) es obligatorio",
      "persona.apellido_paterno": "Apellido paterno es obligatorio",
      "persona.actividad_economica": "Actividad económica es obligatoria",
      "persona.residencia": "Residencia es obligatoria",
      "persona.identificacion.tipo":
        "Tipo o nombre del documento es obligatorio",
      "persona.identificacion.autoridad":
        "Autoridad que expide es obligatoria",
      "persona.identificacion.numero":
        "Número de identificación es obligatorio",
      "persona.identificacion.expedicion":
        "Fecha de expedición es obligatoria",
      "persona.cargo_publico.actual":
        "Indica si desempeñas un cargo público actualmente",
      "persona.cargo_publico.previo":
        "Indica si desempeñaste un cargo público",
      "persona.cargo_publico.familiar":
        "Indica si un familiar desempeña o desempeñó un cargo público",
    };

    const value = values[field];

    if (
      field === "tipoNacionalidad" &&
      !["nacional", "extranjero"].includes(String(value ?? ""))
    ) {
      return "Selecciona nacional o extranjero";
    }

    if (
      field === "persona.apellido_materno" &&
      values.tipoNacionalidad === "nacional" &&
      !isNonEmptyString(value)
    ) {
      return "Apellido materno es obligatorio para una persona mexicana";
    }

    if (required[field] && !isNonEmptyString(value)) {
      return required[field];
    }

    if (field === "empresa_id") {
      const id = Number(value);
      if (!Number.isInteger(id) || id <= 0) return "Empresa inválida";
    }

    if (
      field === "persona.rfc" &&
      (values.tipoNacionalidad === "nacional" || isNonEmptyString(value)) &&
      !isRfc(value)
    ) {
      return values.tipoNacionalidad === "nacional" && !isNonEmptyString(value)
        ? "RFC es obligatorio para una persona mexicana"
        : "RFC inválido";
    }

    if (
      field === "persona.curp" &&
      (values.tipoNacionalidad === "nacional" || isNonEmptyString(value)) &&
      !isCurp(value)
    ) {
      return values.tipoNacionalidad === "nacional" && !isNonEmptyString(value)
        ? "CURP es obligatoria para una persona mexicana"
        : "CURP inválida";
    }

    if (
      [
        "persona.fecha_nacimiento",
        "persona.identificacion.expedicion",
      ].includes(field) &&
      isNonEmptyString(value) &&
      !isYyyyMmDd(normalizedDate(value))
    ) {
      return "Fecha inválida";
    }

    if (field === "persona.identificacion.expiracion") {
      if (values.pfIdSinVigencia === true) return undefined;
      if (!isNonEmptyString(value)) return "Fecha de expiración es obligatoria";
      if (!isYyyyMmDd(normalizedDate(value))) return "Fecha inválida";
    }

    if (
      field === "contacto.email" &&
      isNonEmptyString(value) &&
      !ctx.isEmailValid(String(value))
    ) {
      return "Email inválido";
    }

    if (
      field === "contacto.telefono.codigo_pais" &&
      isNonEmptyString(value) &&
      (values.tipoNacionalidad === "nacional"
        ? String(value).trim() !== "+52"
        : !/^\+\d{1,4}$/.test(String(value).trim()))
    ) {
      return values.tipoNacionalidad === "nacional"
        ? "Para una persona nacional el código de país debe ser +52"
        : "Código de país inválido";
    }

    if (
      field === "contacto.telefono.numero" &&
      isNonEmptyString(value) &&
      !(values.tipoNacionalidad === "nacional"
        ? /^\d{10}$/
        : /^\d{7,15}$/).test(String(value).trim())
    ) {
      return values.tipoNacionalidad === "nacional"
        ? "El teléfono nacional debe tener exactamente 10 dígitos"
        : "El teléfono extranjero debe tener de 7 a 15 dígitos";
    }

    if (
      field === "contacto.domicilio.codigo_postal" &&
      isMexicoKey(values["contacto.domicilio.pais"]) &&
      isNonEmptyString(value) &&
      !/^\d{5}$/.test(String(value).trim())
    ) {
      return "Para un domicilio en México el código postal debe tener 5 dígitos";
    }

    if (
      field === "contacto.telefono.ext" &&
      isNonEmptyString(value) &&
      !/^\d{1,6}$/.test(String(value).trim())
    ) {
      return "Extensión inválida";
    }

    return undefined;
  }

  function validateField(field: string): boolean {
    if (
      ctx.tipoCliente !== "persona_fisica" &&
      field !== "contacto.domicilio.ciudad_delegacion"
    ) return true;

    const message = validatePersonaFisicaField(field);
    ctx.setErrors((previous) => {
      const next = { ...previous };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
    return !message;
  }

  function validateAll(): boolean {
    if (ctx.tipoCliente !== "persona_fisica") {
      const field = "contacto.domicilio.ciudad_delegacion";
      const message = validatePersonaFisicaField(field);
      ctx.setErrors((previous) => {
        const next = { ...previous };
        if (message) next[field] = message;
        else delete next[field];
        return next;
      });
      return !message;
    }

    const fields = [
      "empresa_id",
      "tipoNacionalidad",
      "nacionalidad",
      "contacto.pais",
      "contacto.email",
      "contacto.telefono.codigo_pais",
      "contacto.telefono.numero",
      "contacto.telefono.ext",
      "contacto.domicilio.calle",
      "contacto.domicilio.numero",
      "contacto.domicilio.colonia",
      "contacto.domicilio.municipio",
      "contacto.domicilio.ciudad_delegacion",
      "contacto.domicilio.codigo_postal",
      "contacto.domicilio.estado",
      "contacto.domicilio.pais",
      "persona.rfc",
      "persona.curp",
      "persona.fecha_nacimiento",
      "persona.nombres",
      "persona.apellido_paterno",
      "persona.apellido_materno",
      "persona.actividad_economica",
      "persona.residencia",
      "persona.identificacion.tipo",
      "persona.identificacion.autoridad",
      "persona.identificacion.numero",
      "persona.identificacion.expedicion",
      "persona.identificacion.expiracion",
      "persona.cargo_publico.actual",
      "persona.cargo_publico.previo",
      "persona.cargo_publico.familiar",
    ];
    const next = Object.fromEntries(
      fields
        .map((field) => [field, validatePersonaFisicaField(field)])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );

    ctx.setErrors(next);
    return Object.keys(next).length === 0;
  }

  return { validateField, validateAll };
}

export type BeneficiarioControladorTipoCliente =
  | "persona_fisica"
  | "persona_moral"
  | "fideicomiso";

export type BeneficiarioControladorValidationInput = {
  tipoCliente: BeneficiarioControladorTipoCliente;
  aplica: boolean;
  beneficiarios: any[];
  clientePfRfc?: string;
  clientePfCurp?: string;
};

export type BeneficiarioControladorValidationResult = {
  ok: boolean;
  errors: Record<string, string>;
};

function isPlainObject(value: any): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: any): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isMexicoKey(value: any): boolean {
  return ["mx", "mex", "mexico-mx", "méxico", "mexico"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

export function normalizeBeneficiarioControladorIdentity(value: any): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function isRfc(value: any): boolean {
  const normalized = normalizeBeneficiarioControladorIdentity(value);
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(normalized);
}

function isCurp(value: any): boolean {
  const normalized = normalizeBeneficiarioControladorIdentity(value);
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(normalized);
}

function isYyyyMmDd(value: any): boolean {
  const text = String(value ?? "").trim();

  if (!/^\d{8}$/.test(text)) return false;

  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= 1900 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getBeneficiarioPersona(item: any): Record<string, any> {
  const nested = item?.datos_completos?.persona;

  if (!isPlainObject(nested)) {
    return isPlainObject(item) ? item : {};
  }

  return {
    ...(isPlainObject(item) ? item : {}),
    ...nested,
    nacionalidad: nested.nacionalidad ?? item?.nacionalidad,
    relacion_con_cliente:
      item?.relacion_con_cliente ??
      item?.relacion ??
      nested.relacion_con_cliente ??
      nested.relacion,
    porcentaje_participacion:
      nested.porcentaje_participacion ?? item?.porcentaje_participacion,
  };
}

function getBeneficiarioNacionalidad(item: any, persona: Record<string, any>): string {
  return String(item?.nacionalidad ?? persona?.nacionalidad ?? "").trim();
}

function getBeneficiarioRelacion(item: any, persona: Record<string, any>): string {
  return String(
    item?.relacion_con_cliente ??
    persona?.relacion_con_cliente ??
    item?.relacion ??
    persona?.relacion ??
    "",
  ).trim();
}

function isBeneficiarioPersonaFisica(item: any): boolean {
  const explicitType = String(
    item?.tipo_entidad ?? item?.tipo_tercero ?? item?.tipo ?? "",
  )
    .trim()
    .toLowerCase();

  if (explicitType && explicitType !== "persona_fisica") {
    return false;
  }

  if (
    isPlainObject(item?.empresa) ||
    isPlainObject(item?.fideicomiso) ||
    isPlainObject(item?.datos_completos?.empresa) ||
    isPlainObject(item?.datos_completos?.fideicomiso)
  ) {
    return false;
  }

  return true;
}

export function buildBeneficiariosControladoresContract(input: {
  tipoCliente: BeneficiarioControladorTipoCliente;
  aplica: boolean;
  beneficiarios: any[];
}) {
  const aplica =
    input.tipoCliente === "persona_fisica" ? input.aplica === true : true;

  return {
    beneficiarios_controladores_aplica: aplica,
    beneficiarios_controladores: aplica ? input.beneficiarios : [],
  };
}

export function validateBeneficiariosControladores(
  input: BeneficiarioControladorValidationInput,
): BeneficiarioControladorValidationResult {
  const contract = buildBeneficiariosControladoresContract(input);
  const errors: Record<string, string> = {};
  const lista = Array.isArray(contract.beneficiarios_controladores)
    ? contract.beneficiarios_controladores
    : [];

  if (
    input.tipoCliente === "persona_fisica" &&
    input.aplica !== true &&
    lista.length > 0
  ) {
    errors.beneficiarios_controladores =
      "La lista debe quedar vacía cuando no aplica";
  }

  if (contract.beneficiarios_controladores_aplica && lista.length === 0) {
    errors.beneficiarios_controladores =
      "Agrega al menos un Beneficiario Controlador";
  }

  const clienteRfc = normalizeBeneficiarioControladorIdentity(
    input.clientePfRfc,
  );
  const clienteCurp = normalizeBeneficiarioControladorIdentity(
    input.clientePfCurp,
  );

  lista.forEach((item, index) => {
    const prefix = `beneficiarios_controladores.${index}`;
    const persona = getBeneficiarioPersona(item);
    const nacionalidad = getBeneficiarioNacionalidad(item, persona);
    const relacionConCliente = getBeneficiarioRelacion(item, persona);

    if (!isBeneficiarioPersonaFisica(item)) {
      errors[`${prefix}.tipo_entidad`] =
        "El Beneficiario Controlador debe ser Persona Física";
      return;
    }

    const bcRfc = normalizeBeneficiarioControladorIdentity(persona.rfc);
    const bcCurp = normalizeBeneficiarioControladorIdentity(persona.curp);
    const tipoNacionalidad = String(
      persona.tipo_nacionalidad ?? persona.nacional_extranjero ?? "",
    ).trim().toLowerCase();
    const fullContract = input.tipoCliente === "persona_fisica";
    const nacional = fullContract && tipoNacionalidad === "nacional";
    const contacto = item?.datos_completos?.contacto ?? {};
    const telefono = contacto?.telefono_detalle ?? {};
    const domicilio = contacto?.domicilio ?? contacto?.domicilio_mexico ?? {};
    const identificacion = persona?.identificacion ?? {};
    const cargoPublico =
      item?.datos_completos?.cargo_publico ?? persona?.cargo_publico ?? {};

    if (
      input.tipoCliente === "persona_fisica" &&
      clienteRfc &&
      bcRfc &&
      clienteRfc === bcRfc
    ) {
      errors[`${prefix}.rfc`] =
        "El RFC del Beneficiario Controlador no puede coincidir con el RFC del cliente";
    }

    if (
      input.tipoCliente === "persona_fisica" &&
      clienteCurp &&
      bcCurp &&
      clienteCurp === bcCurp
    ) {
      errors[`${prefix}.curp`] =
        "La CURP del Beneficiario Controlador no puede coincidir con la CURP del cliente";
    }

    if (!isNonEmptyString(persona.nombres)) {
      errors[`${prefix}.nombres`] = "Nombres son obligatorios";
    }

    if (!isNonEmptyString(persona.apellido_paterno)) {
      errors[`${prefix}.apellido_paterno`] = "Apellido paterno es obligatorio";
    }

    if ((fullContract ? nacional : true) && !isNonEmptyString(persona.apellido_materno)) {
      errors[`${prefix}.apellido_materno`] = "Apellido materno es obligatorio";
    }

    if (!isNonEmptyString(persona.fecha_nacimiento)) {
      errors[`${prefix}.fecha_nacimiento`] =
        "Fecha de nacimiento es obligatoria";
    } else if (!isYyyyMmDd(persona.fecha_nacimiento)) {
      errors[`${prefix}.fecha_nacimiento`] =
        "Fecha de nacimiento inválida (AAAAMMDD)";
    }

    if (!isNonEmptyString(nacionalidad)) {
      errors[`${prefix}.nacionalidad`] = "Nacionalidad es obligatoria";
    }
    if (fullContract && !["nacional", "extranjero"].includes(tipoNacionalidad)) {
      errors[`${prefix}.tipo_nacionalidad`] =
        "Tipo de nacionalidad es obligatorio";
    }
    if (fullContract && !isNonEmptyString(persona.pais_nacimiento)) {
      errors[`${prefix}.pais_nacimiento`] =
        "País de nacimiento es obligatorio";
    }

    if (!isNonEmptyString(relacionConCliente)) {
      errors[`${prefix}.relacion_con_cliente`] =
        "Relación con cliente es obligatoria";
    }

    if (fullContract && tipoNacionalidad === "nacional" && !isMexicoKey(nacionalidad)) {
      errors[`${prefix}.nacionalidad`] =
        "Para nacional, la nacionalidad debe ser México";
    }
    if (fullContract && tipoNacionalidad === "extranjero" && isMexicoKey(nacionalidad)) {
      errors[`${prefix}.nacionalidad`] =
        "Para extranjero, la nacionalidad no puede ser México";
    }

    if (bcRfc && !isRfc(bcRfc) && !errors[`${prefix}.rfc`]) {
      errors[`${prefix}.rfc`] = "RFC inválido";
    }
    if (fullContract && !bcRfc) errors[`${prefix}.rfc`] = "RFC es obligatorio";
    if (fullContract && !bcCurp) errors[`${prefix}.curp`] = "CURP es obligatoria";

    const actividad = persona.actividad_economica;
    if (fullContract) {
    if (
      !isNonEmptyString(actividad) &&
      !(isPlainObject(actividad) &&
        isNonEmptyString(actividad.clave) &&
        isNonEmptyString(actividad.descripcion))
    ) errors[`${prefix}.actividad_economica`] = "Actividad económica es obligatoria";
    if (!isNonEmptyString(persona.residencia))
      errors[`${prefix}.residencia`] = "Residencia es obligatoria";

    if (!isNonEmptyString(contacto.email))
      errors[`${prefix}.contacto.email`] = "Email es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contacto.email.trim()))
      errors[`${prefix}.contacto.email`] = "Email inválido";
    if (!isNonEmptyString(contacto.pais))
      errors[`${prefix}.contacto.pais`] = "País de contacto es obligatorio";
    if (!/^\+\d{1,4}$/.test(String(telefono.codigo_pais ?? "").trim()))
      errors[`${prefix}.contacto.telefono_detalle.codigo_pais`] = "Código de país inválido";
    else if (nacional && telefono.codigo_pais.trim() !== "+52")
      errors[`${prefix}.contacto.telefono_detalle.codigo_pais`] = "Debe ser +52";
    if (!(nacional ? /^\d{10}$/ : /^\d{7,15}$/).test(String(telefono.numero ?? "").trim()))
      errors[`${prefix}.contacto.telefono_detalle.numero`] = nacional
        ? "Debe tener exactamente 10 dígitos"
        : "Debe tener de 7 a 15 dígitos";
    if (isNonEmptyString(telefono.ext) && !/^\d{1,6}$/.test(telefono.ext.trim()))
      errors[`${prefix}.contacto.telefono_detalle.ext`] = "Extensión inválida";

    ["pais", "codigo_postal", "colonia", "municipio", "estado", "calle", "numero"].forEach((key) => {
      if (!isNonEmptyString(domicilio[key]))
        errors[`${prefix}.contacto.domicilio.${key}`] = "Campo obligatorio";
    });
    if (isMexicoKey(domicilio.pais) && !/^\d{5}$/.test(String(domicilio.codigo_postal ?? "").trim()))
      errors[`${prefix}.contacto.domicilio.codigo_postal`] =
        "Para México debe tener 5 dígitos";

    ["tipo", "autoridad", "numero", "fecha_expedicion"].forEach((key) => {
      if (!isNonEmptyString(identificacion[key]))
        errors[`${prefix}.identificacion.${key}`] = "Campo obligatorio";
    });
    if (isNonEmptyString(identificacion.fecha_expedicion) &&
        !isYyyyMmDd(String(identificacion.fecha_expedicion).replaceAll("-", "")))
      errors[`${prefix}.identificacion.fecha_expedicion`] = "Fecha inválida";
    if (identificacion.sin_vigencia !== true) {
      if (!isNonEmptyString(identificacion.fecha_expiracion))
        errors[`${prefix}.identificacion.fecha_expiracion`] = "Campo obligatorio";
      else if (!isYyyyMmDd(String(identificacion.fecha_expiracion).replaceAll("-", "")))
        errors[`${prefix}.identificacion.fecha_expiracion`] = "Fecha inválida";
    }
    ["actual", "previo", "familiar"].forEach((key) => {
      if (!["si", "no"].includes(String(cargoPublico[key] ?? "")))
        errors[`${prefix}.cargo_publico.${key}`] = "Selecciona una opción";
    });
    }

    if (bcCurp && !isCurp(bcCurp) && !errors[`${prefix}.curp`]) {
      errors[`${prefix}.curp`] = "CURP inválida";
    }

    const porcentaje = persona.porcentaje_participacion;

    if (
      porcentaje !== undefined &&
      porcentaje !== null &&
      String(porcentaje).trim() !== ""
    ) {
      const numeric = Number(porcentaje);

      if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
        errors[`${prefix}.porcentaje_participacion`] =
          "Porcentaje de participación inválido";
      }
    }
  });

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
