/**
 * Descarga y convierte catálogos SAT (XLS) a JSON para el frontend.
 * Requisitos:
 *   - Node 18+
 *   - npm i -D xlsx
 *
 * Salida:
 *   frontend/public/catalogos/sat/c_pais.json
 *   frontend/public/catalogos/sat/c_actividad_economica.json
 */

import fs from "fs";
import path from "path";
import https from "https";
import XLSX from "xlsx";

const URL_C_PAIS =
  "https://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/c_Pais.xls";
const URL_CAT_ACTIVIDAD =
  "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Cat_Actividad.xls";

const OUT_DIR = path.join(process.cwd(), "frontend", "public", "catalogos", "sat");
fs.mkdirSync(OUT_DIR, { recursive: true });

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

function sheetToRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c).trim())));
}

function pickColumns(headerRow, candidates) {
  // candidates: { key: ["c_pais","clave",...], desc: ["descripcion","descripción",...] }
  const header = headerRow.map(norm);

  const findIndex = (alts) => {
    for (const a of alts) {
      const idx = header.findIndex((h) => h === norm(a) || h.includes(norm(a)));
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

  // Busca una fila de encabezados “razonable”
  let headerRow = rows[0];
  let headerAt = 0;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
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
      `No pude detectar columnas. keyIdx=${keyIdx} descIdx=${descIdx}. Encabezado detectado: ${JSON.stringify(headerRow)}`
    );
  }

  const out = [];
  for (let i = headerAt + 1; i < rows.length; i++) {
    const row = rows[i];
    const clave = (row[keyIdx] ?? "").trim();
    const descripcion = (row[descIdx] ?? "").trim();

    if (!clave || !descripcion) continue;

    // Filtrar basura típica
    if (norm(clave).includes("clave") || norm(descripcion).includes("descripcion")) continue;

    out.push({ clave, descripcion });
  }

  // Deduplicar por clave
  const map = new Map();
  for (const it of out) {
    if (!map.has(it.clave)) map.set(it.clave, it);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.descripcion.localeCompare(b.descripcion, "es", { sensitivity: "base" })
  );
}

async function main() {
  console.log("Descargando c_Pais...");
  const paisBuf = await download(URL_C_PAIS);
  const paisRows = sheetToRows(paisBuf);
  const paisCatalog = rowsToCatalog(paisRows, {
    headerHints: ["c_pais", "pais", "descrip"],
    key: ["c_pais", "clave", "c pais"],
    desc: ["descripción", "descripcion"],
  });

  console.log(`OK c_Pais: ${paisCatalog.length} registros`);
  fs.writeFileSync(
    path.join(OUT_DIR, "c_pais.json"),
    JSON.stringify(paisCatalog, null, 2),
    "utf8"
  );

  console.log("Descargando Cat_Actividad...");
  const actBuf = await download(URL_CAT_ACTIVIDAD);
  const actRows = sheetToRows(actBuf);
  const actCatalog = rowsToCatalog(actRows, {
    headerHints: ["actividad", "descripcion", "clave"],
    key: ["clave", "c_actividad", "actividad", "id"],
    desc: ["descripción", "descripcion", "actividad"],
  });

  console.log(`OK Cat_Actividad: ${actCatalog.length} registros`);
  fs.writeFileSync(
    path.join(OUT_DIR, "c_actividad_economica.json"),
    JSON.stringify(actCatalog, null, 2),
    "utf8"
  );

  console.log("Listo ✅ Archivos en:", OUT_DIR);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
