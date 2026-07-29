'use client';

import { useEffect, useRef, useState } from 'react';
import api, {
  getApiErrorMessage,
  isApiRequestCanceled,
} from '@/lib/api';

export type EmpresaDomicilio = {
  pais: string;
  codigo_postal: string;
  entidad: string;
  municipio: string;
  ciudad_delegacion: string;
  colonia: string;
  calle: string;
  numero: string;
  interior: string;
};

type CodigoPostalResultado = {
  colonia?: unknown;
  municipio?: unknown;
  ciudad?: unknown;
  estado?: unknown;
};

function isMexico(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'méxico'
    || normalized === 'mexico'
    || normalized === 'mx'
    || normalized === 'mex';
}

function normalizeCp(value: string) {
  return value.replace(/\D/g, '').slice(0, 5);
}

export function buildDomicilioCompleto(form: EmpresaDomicilio) {
  const exterior = [form.calle.trim(), form.numero.trim()].filter(Boolean).join(' ');
  const interior = form.interior.trim() ? `Int ${form.interior.trim()}` : '';
  const locality = [
    form.colonia.trim(),
    form.ciudad_delegacion.trim(),
    form.municipio.trim(),
    form.entidad.trim(),
    form.codigo_postal.trim(),
    form.pais.trim(),
  ].filter(Boolean);
  return [exterior, interior, ...locality].filter(Boolean).join(', ');
}

export function buildDomicilioLegacy(form: EmpresaDomicilio) {
  return [
    form.calle.trim(),
    form.numero.trim(),
    form.interior.trim() ? `Int ${form.interior.trim()}` : '',
  ].filter(Boolean).join(' ');
}

type DomicilioFieldsProps<T extends EmpresaDomicilio> = {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  lookupEnabled: boolean;
  onCpEdited?: () => void;
  disabled?: boolean;
};

export function EmpresaDomicilioConfirmacion<T extends EmpresaDomicilio>({
  form,
  setForm,
  lookupEnabled,
  onCpEdited,
  disabled = false,
}: DomicilioFieldsProps<T>) {
  const [colonias, setColonias] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    if (!lookupEnabled || !isMexico(form.pais)) {
      setColonias([]);
      setAviso('');
      setConsultando(false);
      return;
    }

    const cp = normalizeCp(form.codigo_postal);
    if (cp.length !== 5) {
      setColonias([]);
      setAviso(cp ? 'Para México, el código postal debe tener 5 dígitos.' : '');
      setConsultando(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setConsultando(true);
    setAviso('Consultando código postal…');

    void api.get<{ codigo_postal: string; resultados: CodigoPostalResultado[] }>(
      '/api/catalogos/codigos-postales',
      { params: { cp }, signal: controller.signal },
    ).then((response) => {
      if (!active) return;
      const resultados = Array.isArray(response.data?.resultados)
        ? response.data.resultados
        : [];
      if (resultados.length === 0) {
        setColonias([]);
        setAviso('Código postal no encontrado; captura manual habilitada.');
        return;
      }

      const first = resultados[0];
      const nextColonias = Array.from(new Set(
        resultados
          .map((item) => String(item.colonia ?? '').trim())
          .filter(Boolean),
      ));
      const entidad = String(first.estado ?? '').trim();
      const municipio = String(first.municipio ?? '').trim();
      const ciudad = String(first.ciudad ?? '').trim();

      setColonias(nextColonias);
      setForm((previous) => ({
        ...previous,
        entidad: entidad || previous.entidad,
        municipio: municipio || previous.municipio,
        ciudad_delegacion: ciudad || previous.ciudad_delegacion,
        colonia: nextColonias.length === 1
          ? nextColonias[0]
          : nextColonias.includes(previous.colonia)
            ? previous.colonia
            : '',
      }));
      setAviso('');
    }).catch((catalogError: unknown) => {
      if (!active || isApiRequestCanceled(catalogError)) return;
      setColonias([]);
      setAviso(
        `${getApiErrorMessage(catalogError, 'No se pudo consultar el código postal')}. Captura manual habilitada.`,
      );
    }).finally(() => {
      if (active) setConsultando(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [form.codigo_postal, form.pais, lookupEnabled, setForm]);

  const change =
    (key: keyof EmpresaDomicilio) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const rawValue = event.target.value;
      const value = key === 'codigo_postal' && isMexico(form.pais)
        ? normalizeCp(rawValue)
        : rawValue;
      if (key === 'codigo_postal') onCpEdited?.();
      setForm((previous) => ({ ...previous, [key]: value }));
    };

  const field = (
    key: keyof EmpresaDomicilio,
    label: string,
    required = false,
  ) => (
    <div>
      <label className="mb-1 block text-sm text-gray-600">
        {label}{required ? ' *' : ''}
      </label>
      <input
        value={form[key]}
        onChange={change(key)}
        className="w-full rounded border px-3 py-2"
        required={required}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {field('pais', 'País')}
      <div>
        <label className="mb-1 block text-sm text-gray-600">Código Postal *</label>
        <input
          value={form.codigo_postal}
          onChange={change('codigo_postal')}
          className="w-full rounded border px-3 py-2"
          required
          inputMode={isMexico(form.pais) ? 'numeric' : undefined}
          maxLength={isMexico(form.pais) ? 5 : undefined}
          disabled={disabled}
        />
        {aviso && (
          <p
            className={`mt-1 text-sm ${consultando ? 'text-gray-600' : 'text-amber-700'}`}
            role="status"
          >
            {aviso}
          </p>
        )}
      </div>
      {field('entidad', 'Entidad', true)}
      {field('municipio', 'Municipio', true)}
      {field('ciudad_delegacion', 'Ciudad o delegación')}
      <div>
        <label className="mb-1 block text-sm text-gray-600">Colonia</label>
        {colonias.length > 1 ? (
          <select
            value={form.colonia}
            onChange={change('colonia')}
            className="w-full rounded border px-3 py-2"
            disabled={disabled}
          >
            <option value="">Selecciona colonia</option>
            {colonias.map((colonia) => (
              <option key={colonia} value={colonia}>{colonia}</option>
            ))}
          </select>
        ) : (
          <input
            value={form.colonia}
            onChange={change('colonia')}
            className="w-full rounded border px-3 py-2"
            disabled={disabled}
          />
        )}
      </div>
      {field('calle', 'Calle', true)}
      {field('numero', 'Número exterior', true)}
      {field('interior', 'Interior (opcional)')}
    </div>
  );
}

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  busy: boolean;
  confirmLabel: string;
  busyLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
  cancelLabel?: string;
  hideCancel?: boolean;
};

export function EmpresaConfirmationModal({
  open,
  title,
  busy,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
  children,
  cancelLabel = 'Cancelar',
  hideCancel = false,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    if (hideCancel) {
      confirmRef.current?.focus();
    } else {
      cancelRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, hideCancel, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="empresa-confirmation-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="empresa-confirmation-title" className="text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          {!hideCancel ? (
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
