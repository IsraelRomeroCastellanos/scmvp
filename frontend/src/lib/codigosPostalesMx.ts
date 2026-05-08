export type CodigoPostalMx = {
  codigo_postal: string;
  estado: string;
  municipio: string;
  ciudad_delegacion: string;
  colonias: string[];
};

let cache: CodigoPostalMx[] | null = null;

export function normalizeCodigoPostalMx(value: string) {
  return (value ?? '').replace(/\D/g, '').slice(0, 5);
}

function normalizeItem(raw: any): CodigoPostalMx | null {
  const codigo_postal = normalizeCodigoPostalMx(String(raw?.codigo_postal ?? ''));
  const estado = String(raw?.estado ?? '').trim();
  const municipio = String(raw?.municipio ?? '').trim();
  const ciudad_delegacion = String(raw?.ciudad_delegacion ?? '').trim();

  const colonias = Array.isArray(raw?.colonias)
    ? raw.colonias
        .map((x: any) => String(x ?? '').trim())
        .filter(Boolean)
    : [];

  if (!codigo_postal || !estado || !municipio || !ciudad_delegacion) return null;

  return {
    codigo_postal,
    estado,
    municipio,
    ciudad_delegacion,
    colonias,
  };
}

export async function loadCodigosPostalesMx(): Promise<CodigoPostalMx[]> {
  if (cache) return cache;

  const res = await fetch('/catalogos/internos/codigos_postales_mx.json', {
    cache: 'force-cache',
  });

  if (!res.ok) {
    throw new Error(`No se pudo cargar catálogo de códigos postales MX (${res.status})`);
  }

  const data = await res.json();
  const items = Array.isArray(data)
    ? data.map(normalizeItem).filter((x): x is CodigoPostalMx => !!x)
    : [];

  cache = items;
  return items;
}

export function findCodigoPostalMx(items: CodigoPostalMx[], codigoPostal: string) {
  const cp = normalizeCodigoPostalMx(codigoPostal);
  if (cp.length !== 5) return null;

  return items.find((item) => item.codigo_postal === cp) ?? null;
}
