// scripts/update_sat_catalogs.mjs
import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs", "sat");
const OUT_DIR = path.join(ROOT, "frontend", "public", "catalogos", "sat");

// busca archivos por prefijo (acepta .xls/.xlsx)
function findFirstFile(prefix) {
  if (!fs.existsSync(DOCS_DIR)) return null;
  const files = fs.readdirSync(DOCS_DIR);
  const hit = files.find((f) => f.toLowerCase().startsWith(prefix.toLowerCase()));
  return hit ? path.join(DOCS_DIR, hit) : null;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function norm(s) {
  return String(s ?? "").trim();
}

function lower(s) {
  return norm(s).toLowerCase();
}

function pickKey(row, candidates) {
  const keys = Object.keys(row || {});
  const found = keys.find((k) => candidates.some((c) => lower(k).includes(lower(c))));
  return found || null;
}

function readFirstSheetRows(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  // defval para no perder columnas
  return xlsx.utils.sheet_to_json(ws, { defval: "" });
}

function dedupeSort(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const clave = norm(it.clave);
    const descripcion = norm(it.descripcion);
    if (!clave || !descripcion) continue;
    const k = `${clave}||${descripcion}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ clave, descripcion });
  }
  out.sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
  return out;
}

/**
 * c_Pais:
 * Normalmente trae algo como:
 * - "c_Pais" / "Clave" / "Código"
 * - "Descripción"
 */
function buildPaises(rows) {
  const out = [];
  for (const r of rows) {
    const keyClave =
      pickKey(r, ["c_pais", "clave", "código", "codigo"]) || Object.keys(r)[0] || null;
    const keyDesc =
      pickKey(r, ["descripción", "descripcion", "país", "pais"]) || Object.keys(r)[1] || null;

    if (!keyClave || !keyDesc) continue;

    const clave = norm(r[keyClave]);
    const descripcion = norm(r[keyDesc]);

    // evita headers repetidos
    if (lower(clave).includes("c_pais") || lower(descripcion).includes("descrip")) continue;

    out.push({ clave, descripcion });
  }
  return dedupeSort(out);
}

/**
 * Cat_Actividad:
 * Debe traer una clave SAT y descripción.
 * Buscamos columnas tipo:
 * - "Clave" / "c_Actividad" / "Código"
 * - "Descripción"
 */
function buildActividades(rows) {
  const out = [];
  for (const r of rows) {
    const keyClave =
      pickKey(r, ["clave", "c_actividad", "actividad", "código", "codigo"]) || Object.keys(r)[0] || null;
    const keyDesc =
      pickKey(r, ["descripción", "descripcion"]) || Object.keys(r)[1] || null;

    if (!keyClave || !keyDesc) continue;

    const clave = norm(r[keyClave]);
    const descripcion = norm(r[keyDesc]);

    if (lower(clave).includes("clave") || lower(descripcion).includes("descrip")) continue;

    out.push({ clave, descripcion });
  }
  return dedupeSort(out);
}

function writeJson(name, data) {
  ensureDir(OUT_DIR);
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ Generado ${outPath} (${data.length} registros)`);
}

function main() {
  const paisFile = findFirstFile("c_Pais");
  const actFile = findFirstFile("Cat_Actividad");

  if (!paisFile) {
    console.error("❌ No encontré archivo que empiece con c_Pais en docs/sat");
    process.exit(1);
  }
  if (!actFile) {
    console.error("❌ No encontré archivo que empiece con Cat_Actividad en docs/sat");
    process.exit(1);
  }

  console.log("Leyendo:", paisFile);
  const paisRows = readFirstSheetRows(paisFile);
  const paises = buildPaises(paisRows);
  writeJson("c_pais.json", paises);

  console.log("Leyendo:", actFile);
  const actRows = readFirstSheetRows(actFile);
  const actividades = buildActividades(actRows);
  writeJson("c_actividad_economica.json", actividades);

  // índice simple (opcional)
  writeJson("index.json", {
    generated_at: new Date().toISOString(),
    files: ["c_pais.json", "c_actividad_economica.json"],
  });

  console.log("✅ Listo.");
}

main();
