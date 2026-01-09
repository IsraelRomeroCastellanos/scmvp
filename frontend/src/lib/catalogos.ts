// frontend/src/lib/catalogos.ts
export type CatalogItem = {
  clave: string;
  descripcion: string;
};

function normalizeCatalogUrl(path: string) {
  if (!path) throw new Error('Path de catálogo vacío');

  if (path.startsWith('/')) {
    return path.endsWith('.json') ? path : `${path}.json`;
  }

  const withPrefix = path.startsWith('catalogos/')
    ? `/${path}`
    : `/catalogos/${path}`;

  return withPrefix.endsWith('.json') ? withPrefix : `${withPrefix}.json`;
}

/**
 * Carga un catálogo JSON desde /public/catalogos/...
 * Ejemplos:
 *  - "sat/c_pais"
 *  - "sat/c_pais.json"
 *  - "/catalogos/sat/c_pais.json"
 */
export async function loadCatalogo(path: string): Promise<CatalogItem[]> {
  const url = normalizeCatalogUrl(path);
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`No se pudo cargar catálogo (${res.status}): ${url}`);
  }

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data)) {
    throw new Error(`Catálogo inválido (se esperaba array): ${url}`);
  }

  return data
    .map((x: any) => ({
      clave: String(x?.clave ?? '').trim(),
      descripcion: String(x?.descripcion ?? '').trim()
    }))
    .filter((x: CatalogItem) => x.clave && x.descripcion);
}
