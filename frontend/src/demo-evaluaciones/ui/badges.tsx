"use client";

export function ColorBadge({ colorName }: { colorName: "Verde" | "Amarillo" | "Rojo" }) {
  const cls =
    colorName === "Verde"
      ? "bg-green-100 text-green-800 border-green-200"
      : colorName === "Rojo"
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {colorName}
    </span>
  );
}
