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
