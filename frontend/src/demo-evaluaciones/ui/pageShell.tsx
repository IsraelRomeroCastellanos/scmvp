"use client";

import React from "react";

export function DemoPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-6">
        <div className="text-sm text-gray-500">DEMO / MAQUETA PARALELA (NO PRODUCCIÓN)</div>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
