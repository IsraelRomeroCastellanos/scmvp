// scripts/update_sat_catalogs.mjs
import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs", "sat");
const OUT_SAT_DIR = path.join(ROOT, "frontend", "public", "catalogos", "sat");
const OUT_INT_DIR = path.join(ROOT, "frontend", "public", "catalogos", "internos");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function norm(s) {
  return String(s ?? "").trim();
}

function lower(s) {
  return norm(s).toLowerCase();
}

function findFirstFile(exactBaseName) {
  if (!fs.existsSync(DOCS_DIR)) return null;
  const files = fs.readdirSync(DOCS_DIR);

  // acepta .xls o .xlsx; el usuario nos dio el base name (sin extensión)
  const hit = files.find((f) => {
    const lf = f.toLowerCase();
    const base = exactBaseName.toLowerCase();
    return (lf === `${base}.xls` || lf === `${base}.xlsx`);
  });

  return hit ? path.join(DOCS_DIR, hit) : null;
}

function readFirstSheetRows(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(ws, { defval: "" });
}

function slugify(s) {
  // clave estable a partir de la descripción (sin acentos, sin símbolos raros)
  const base = norm(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

function dedupeByDesc(list) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const d = norm(it.descripcion);
    if (!d) continue;
    const k = d.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function buildCatalogFromOneColumn(rows, { headerHints = [] } = {}) {
  const out = [];

  for (const r of rows) {
    const keys = Object.keys(r || {});
    if (keys.length === 0) continue;

    // toma la primera columna del sheet
    const firstKey = keys[0];
    const desc = norm(r[firstKey]);

    if (!desc) continue;

    // evita headers típicos
    const descL = desc.toLowerCase();
    if (descL === "descripcion" || descL === "descripción") continue;
    if (headerHints.some((h) => descL.includes(h.toLowerCase()))) {
      // si la primera fila es "Giro Mercantil" etc, se filtra
      if (descL.length <= 40) continue;
    }

    out.push({ clave: "", descripcion: desc });
  }

  // dedupe por descripción
  const deduped = dedupeByDesc(out);

  // claves por slug + sufijo si duplica slug
  const slugCount = new Map();
  const finalList = deduped.map((it) => {
    const s = slugify(it.descripcion);
    const c = (slugCount.get(s) || 0) + 1;
    slugCount.set(s, c);
    const clave = c === 1 ? s : `${s}-${c}`;
    return { clave, descripcion: it.descripcion };
  });

  // orden alfabético por descripción
  finalList.sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
  return finalList;
}

function writeJson(outDir, name, data) {
  ensureDir(outDir);
  const outPath = path.join(outDir, name);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ Generado ${outPath} (${data.length ?? "?"} registros)`);
}

function main() {
  // === 1) Países (para nacionalidad y contacto) ===
  // Tu fuente: PaisesNacionalidad.xls -> salida: sat/c_pais.json (mismo nombre que el FE ya puede consumir)
  const paisFile = findFirstFile("PaisesNacionalidad");
  if (!paisFile) {
    console.error("❌ No encontré docs/sat/PaisesNacionalidad.xls(x)");
    process.exit(1);
  }
  console.log("Leyendo:", paisFile);
  const paisRows = readFirstSheetRows(paisFile);
  const paises = buildCatalogFromOneColumn(paisRows, { headerHints: ["pais", "país", "nacionalidad"] });
  writeJson(OUT_SAT_DIR, "c_pais.json", paises);

  // === 2) Actividad Económica PF ===
  // Tu fuente: ActividadEconomica.xls -> salida: sat/c_actividad_economica.json (mantiene nombre esperado)
  const actFile = findFirstFile("ActividadEconomica");
  if (!actFile) {
    console.error("❌ No encontré docs/sat/ActividadEconomica.xls(x)");
    process.exit(1);
  }
  console.log("Leyendo:", actFile);
  const actRows = readFirstSheetRows(actFile);
  const actividades = buildCatalogFromOneColumn(actRows, { headerHints: ["actividad"] });
  writeJson(OUT_SAT_DIR, "c_actividad_economica.json", actividades);

  // === 3) Giro Mercantil (PM) ===
  // Tu fuente: GiroMercantil.xls -> salida: internos/giro_mercantil.json
  const giroFile = findFirstFile("GiroMercantil");
  if (!giroFile) {
    console.error("❌ No encontré docs/sat/GiroMercantil.xls(x)");
    process.exit(1);
  }
  console.log("Leyendo:", giroFile);
  const giroRows = readFirstSheetRows(giroFile);
  const giros = buildCatalogFromOneColumn(giroRows, { headerHints: ["giro", "mercantil"] });
  writeJson(OUT_INT_DIR, "giro_mercantil.json", giros);

  // índice simple
  writeJson(OUT_INT_DIR, "index.json", {
    generated_at: new Date().toISOString(),
    sat_files: ["catalogos/sat/c_pais.json", "catalogos/sat/c_actividad_economica.json"],
    internos_files: ["catalogos/internos/giro_mercantil.json"],
  });

  console.log("✅ Listo.");
}

main();
