/**
 * Convierte catálogos SAT (XLS) a JSON para el frontend.
 *
 * ENTRADAS (preferidas):
 *   docs/sat/c_Pais.xls
 *   docs/sat/Cat_Actividad.xls
 *
 * SALIDAS:
 *   frontend/public/catalogos/sat/c_pais.json
 *   frontend/public/catalogos/sat/c_actividad_economica.json
 *
 * Requisitos:
 *   npm i -D xlsx
 */

import fs from "fs";
import path from "path";
import https from "https";
import XLSX from "xlsx";

const LOCAL_DIR = path.join(process.cwd(), "docs", "sat");
const OUT_DIR = path.join(process.cwd(), "frontend", "public", "catalogos", "sat");
fs.mkdirSync(OUT_DIR, { recursive: true });

// URLs oficiales (fallback si NO hay archivos locales)
const URL_C_PAIS =
  "https://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/c_Pais.xls";
const URL_CAT_ACTIVIDAD =
  "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Cat_Actividad.xls";

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

function findLocalFile(regex) {
  if (!fs.existsSync(LOCAL_DIR)) return null;
  const files = fs.readdirSync(LOCAL_DIR);
  const hit = files.find((f) => regex.test(f));
  return hit ? path.join(LOCAL_DIR, hit) : null;
}

function sheetToRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c).trim())));
}

function pickColumns(headerRow, candidates) {
  const header = headerRow.map(norm);

  const findIndex = (alts) => {
    for (const a of alts) {
      const n = norm(a);
      const idx = header.findIndex((h) => h === n || h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  return {
    keyIdx: findIndex(candidates.key),
    descIdx: findIndex(candidates.desc),
  };
}

function rowsToCatalog(rows, candidates) {
  if (!rows.length) return [];

  // detectar fila de encabezado
  let headerRow = rows[0];
  let headerAt = 0;

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i].map(norm).join(" ");
    if (candidates.headerHints.some((h) => r.includes(norm(h)))) {
      headerRow = rows[i];
      headerAt = i;
      break;
    }
  }

  const { keyIdx, descIdx } = pickColumns(headerRow, candidates);
  if (keyIdx < 0 || descIdx < 0) {
    throw new Error(
      `No pude detectar columnas. keyIdx=${keyIdx} descIdx=${descIdx}. Encabezado: ${JSON.stringify(
        headerRow
      )}`
    );
  }

  const out = [];
  for (let i = headerAt + 1; i < rows.length; i++) {
    const row = rows[i];
    const clave = (row[keyIdx] ?? "").trim();
    const descripcion = (row[descIdx] ?? "").trim();
    if (!clave || !descripcion) continue;

    // filtrar basura
    if (norm(clave).includes("clave") || norm(descripcion).includes("descripcion")) continue;

    out.push({ clave, descripcion });
  }

  // dedupe por clave
  const map = new Map();
  for (const it of out) if (!map.has(it.clave)) map.set(it.clave, it);

  return Array.from(map.values());
}

async function loadXlsBuffer(localRegex, url) {
  const localPath = findLocalFile(localRegex);
  if (localPath) {
    console.log(`Usando local: ${localPath}`);
    return fs.readFileSync(localPath);
  }

  console.log(`No encontré local en ${LOCAL_DIR}. Intentando descargar: ${url}`);
  return await download(url);
}

async function main() {
  // c_Pais
  console.log("== c_Pais ==");
  const paisBuf = await loadXlsBuffer(/c[_-]?pais.*\.xls$/i, URL_C_PAIS);
  const paisRows = sheetToRows(paisBuf);
  const paisCatalog = rowsToCatalog(paisRows, {
    headerHints: ["c_pais", "pais", "descrip"],
    key: ["c_pais", "clave", "c pais"],
    desc: ["descripción", "descripcion"],
  })
    .map((x) => ({ clave: x.clave, descripcion: x.descripcion }))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es", { sensitivity: "base" }));

  fs.writeFileSync(
    path.join(OUT_DIR, "c_pais.json"),
    JSON.stringify(paisCatalog, null, 2),
    "utf8"
  );
  console.log(`OK: c_pais.json (${paisCatalog.length} registros)`);

  // Cat_Actividad
  console.log("== Cat_Actividad ==");
  const actBuf = await loadXlsBuffer(/cat[_-]?actividad.*\.xls$/i, URL_CAT_ACTIVIDAD);
  const actRows = sheetToRows(actBuf);
  const actCatalogRaw = rowsToCatalog(actRows, {
    headerHints: ["actividad", "descripcion", "clave"],
    key: ["clave", "c_actividad", "actividad", "id"],
    desc: ["descripción", "descripcion", "actividad"],
  });

  // Algunos catálogos traen clave numérica o texto; lo normalizamos a string
  const actCatalog = actCatalogRaw
    .map((x) => ({ clave: String(x.clave).trim(), descripcion: String(x.descripcion).trim() }))
    .filter((x) => x.clave && x.descripcion);

  fs.writeFileSync(
    path.join(OUT_DIR, "c_actividad_economica.json"),
    JSON.stringify(actCatalog, null, 2),
    "utf8"
  );
  console.log(`OK: c_actividad_economica.json (${actCatalog.length} registros)`);

  console.log("Listo ✅ Salida:", OUT_DIR);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
