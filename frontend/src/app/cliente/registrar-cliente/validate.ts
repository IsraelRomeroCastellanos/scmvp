// frontend/src/app/cliente/registrar-cliente/validate.ts
export type RegistrarClienteValidatorCtx = {
  // Lo mínimo para no romper:
  tipoCliente: string;

  // Estado/valores que hoy lee validateField/validateAll:
  // (puede ser un objeto grande; no pasa nada)
  values: Record<string, any>;

  // Para reportar errores como hoy:
  setErrors: (next: Record<string, string>) => void;

  // Helpers que ya existan en page.tsx y hoy se usan dentro de validaciones:
  isEmailValid: (email: string) => boolean;
  // agrega aquí cualquier helper existente que tu validateField use (RFC/CURP/fecha/etc.)
  helpers?: Record<string, any>;
};

export function createRegistrarClienteValidator(ctx: RegistrarClienteValidatorCtx) {
  // 👇 Pega aquí TU validateField actual, pero reemplazando
  // accesos directos a variables de page.tsx por ctx.values / ctx.tipoCliente / ctx.helpers
  function validateField(field: string): boolean {
    // --- PEGAR validateField EXISTENTE ---
    // IMPORTANTE: donde antes decía tipoCliente / personaRfc / contactoEmail, etc.,
    // cámbialo a lecturas desde ctx.values (para no pasar 100 params).
    // Ej: const email = ctx.values.contactoEmail;
    return true;
  }

  function validateAll(): boolean {
    // --- PEGAR validateAll EXISTENTE ---
    // reemplaza:
    // - tipoCliente -> ctx.tipoCliente
    // - setErrors(...) -> ctx.setErrors(...)
    // - validateField(...) -> validateField(...)
    return true;
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
      nested.relacion_con_cliente ??
      nested.relacion ??
      item?.relacion_con_cliente ??
      item?.relacion,
    porcentaje_participacion:
      nested.porcentaje_participacion ?? item?.porcentaje_participacion,
  };
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

    if (!isBeneficiarioPersonaFisica(item)) {
      errors[`${prefix}.tipo_entidad`] =
        "El Beneficiario Controlador debe ser Persona Física";
      return;
    }

    const bcRfc = normalizeBeneficiarioControladorIdentity(persona.rfc);
    const bcCurp = normalizeBeneficiarioControladorIdentity(persona.curp);

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

    if (!isNonEmptyString(persona.apellido_materno)) {
      errors[`${prefix}.apellido_materno`] = "Apellido materno es obligatorio";
    }

    if (!isNonEmptyString(persona.fecha_nacimiento)) {
      errors[`${prefix}.fecha_nacimiento`] =
        "Fecha de nacimiento es obligatoria";
    } else if (!isYyyyMmDd(persona.fecha_nacimiento)) {
      errors[`${prefix}.fecha_nacimiento`] =
        "Fecha de nacimiento inválida (AAAAMMDD)";
    }

    if (!isNonEmptyString(persona.nacionalidad)) {
      errors[`${prefix}.nacionalidad`] = "Nacionalidad es obligatoria";
    }

    if (!isNonEmptyString(persona.relacion_con_cliente)) {
      errors[`${prefix}.relacion_con_cliente`] =
        "Relación con cliente es obligatoria";
    }

    if (bcRfc && !isRfc(bcRfc) && !errors[`${prefix}.rfc`]) {
      errors[`${prefix}.rfc`] = "RFC inválido";
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
