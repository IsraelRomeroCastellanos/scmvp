"use client";

import { useMemo, useState } from "react";
import type { CatalogItem } from "@/lib/catalogos";

function fmtItem(i: CatalogItem) {
  return `${i.descripcion} (${i.clave})`;
}

export default function SearchableSelect({
  label,
  required,
  value,
  items,
  placeholder,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  required?: boolean;
  value: string;
  items: CatalogItem[];
  placeholder?: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => {
      const a = (it.clave ?? "").toLowerCase();
      const b = (it.descripcion ?? "").toLowerCase();
      return a.includes(s) || b.includes(s);
    });
  }, [q, items]);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>

      <input
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? "Buscar..."}
        onBlur={onBlur}
      />

      <select
        className={`w-full rounded border px-3 py-2 text-sm ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">-- Selecciona --</option>
        {filtered.map((it) => (
          <option key={it.clave} value={it.clave}>
            {fmtItem(it)}
          </option>
        ))}
      </select>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
