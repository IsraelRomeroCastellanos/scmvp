// frontend/src/lib/catalogos.ts
export type CatalogItem = { clave: string; descripcion: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export async function loadPaises(): Promise<CatalogItem[]> {
  // viene de tu PaisesNacionalidad.xls (generado a c_pais.json)
  return fetchJson<CatalogItem[]>("/catalogos/sat/c_pais.json");
}

export async function loadActividadesEconomicas(): Promise<CatalogItem[]> {
  // viene de tu ActividadEconomica.xls (generado a c_actividad_economica.json)
  return fetchJson<CatalogItem[]>("/catalogos/sat/c_actividad_economica.json");
}

export async function loadGiroMercantil(): Promise<CatalogItem[]> {
  // viene de tu GiroMercantil.xls
  return fetchJson<CatalogItem[]>("/catalogos/internos/giro_mercantil.json");
}
