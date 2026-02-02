#!/usr/bin/env bash
set -euo pipefail

# doclog.sh
# Uso:
#   ./docs/ops/doclog.sh --tag stable-20260110-01 --commit 0559528 \
#     --mission docs/ops/mission/mission_20260110_133004.txt \
#     --note "feat(cliente): ..." --note "evidencia: ..." [--date YYYY-MM-DD]
#
# Efecto:
# - docs/CHANGELOG_CHAT.md: agrega sección (o añade a sección existente) para la fecha
# - docs/STATUS.md: agrega entrada en sección "Checkpoints" (histórico incremental)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHANGELOG="$ROOT/docs/CHANGELOG_CHAT.md"
STATUS="$ROOT/docs/STATUS.md"

TAG=""
COMMIT=""
MISSION=""
DATE="$(date +%F)"
NOTES=()

die() { echo "ERROR: $*" >&2; exit 1; }

need_file() {
  local f="$1"
  [[ -f "$f" ]] || die "No existe el archivo: $f"
}

# ---------------------------
# Parse args
# ---------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2;;
    --commit) COMMIT="${2:-}"; shift 2;;
    --mission) MISSION="${2:-}"; shift 2;;
    --note) NOTES+=("${2:-}"); shift 2;;
    --date) DATE="${2:-}"; shift 2;;
    -h|--help)
      sed -n '1,60p' "$0"
      exit 0
      ;;
    *) die "Argumento desconocido: $1";;
  esac
done

[[ -n "$TAG" ]] || die "Falta --tag"
[[ -n "$COMMIT" ]] || die "Falta --commit"
[[ -n "$MISSION" ]] || die "Falta --mission"
[[ "${#NOTES[@]}" -gt 0 ]] || die "Agrega al menos un --note"

need_file "$CHANGELOG"
need_file "$STATUS"
# MISSION puede no existir aún si apenas lo vas a generar; lo validamos suave:
if [[ ! -f "$ROOT/$MISSION" && ! -f "$MISSION" ]]; then
  echo "WARN: mission log no encontrado localmente: $MISSION (se registrará igual)" >&2
fi

# Normaliza misión a path relativo si viene absoluto dentro del repo
if [[ "$MISSION" == "$ROOT/"* ]]; then
  MISSION="${MISSION#"$ROOT/"}"
fi

# ---------------------------
# Helper: append to CHANGELOG
# ---------------------------
append_changelog() {
  local tmp
  tmp="$(mktemp)"
  local header="## $DATE"
  local exists="0"

  if grep -qE "^##[[:space:]]+$DATE\$" "$CHANGELOG"; then
    exists="1"
  fi

  if [[ "$exists" == "0" ]]; then
    {
      echo ""
      echo "$header"
      echo "- Tag: $TAG"
      echo "- Commit: $COMMIT"
      echo "- Mission log: $MISSION"
      for n in "${NOTES[@]}"; do
        echo "- $n"
      done
    } >> "$CHANGELOG"
    return
  fi

  # Si la sección ya existe, insertamos las entradas al final del bloque de esa sección.
  # Estrategia:
  # - Copiar hasta la cabecera encontrada
  # - Copiar la sección completa
  # - Antes de la siguiente cabecera "## " (o EOF), añadimos notas.
  awk -v date="$DATE" -v tag="$TAG" -v commit="$COMMIT" -v mission="$MISSION" \
      -v notes_count="${#NOTES[@]}" \
      "$(printf ' -v note_%d=%q' $(seq 0 $((${#NOTES[@]}-1))) "${NOTES[@]}")" \
      '
      function print_notes() {
        print "- Tag: " tag
        print "- Commit: " commit
        print "- Mission log: " mission
        for (i=0; i<notes_count; i++) {
          key = "note_" i
          print "- " ENVIRON[key]
        }
      }
      BEGIN { in=0; injected=0; }
      {
        if ($0 ~ ("^##[[:space:]]+" date "$")) {
          in=1
          print $0
          next
        }
        if (in==1 && $0 ~ "^##[[:space:]]+" && $0 !~ ("^##[[:space:]]+" date "$") && injected==0) {
          # Llegó el siguiente encabezado, inyecta antes de este
          print_notes()
          injected=1
          in=0
          print $0
          next
        }
        print $0
      }
      END {
        if (in==1 && injected==0) {
          print_notes()
        }
      }
      ' "$CHANGELOG" > "$tmp"

  mv "$tmp" "$CHANGELOG"
}

# ---------------------------
# Helper: append to STATUS (histórico)
# ---------------------------
append_status() {
  local tmp
  tmp="$(mktemp)"

  local section="## Checkpoints"
  local datehdr="### $DATE"

  if ! grep -qE "^##[[:space:]]+Checkpoints\$" "$STATUS"; then
    {
      echo ""
      echo ""
      echo "## Checkpoints"
    } >> "$STATUS"
  fi

  if ! grep -qE "^###[[:space:]]+$DATE\$" "$STATUS"; then
    {
      echo ""
      echo "$datehdr"
      echo "- Tag: $TAG"
      echo "- Commit: $COMMIT"
      echo "- Mission log: $MISSION"
      echo "- Contrato único (def.): payload normalizado por tipo_cliente con obligatorios/optativos; FE+BE validan igual"
      echo "- Admin sin empresa_id: 400 requerido; FE siempre envía empresa o maneja “Todas” internamente"
      echo "- Roles smoke: admin ✅ / consultor ✅ / cliente ✅"
      echo "- PUT parcial: FE no manda vacíos; BE rechaza null/\"\" en obligatorios; deepMerge preserva"
      echo "- Notas:"
      for n in "${NOTES[@]}"; do
        echo "  - $n"
      done
    } >> "$STATUS"
    return
  fi

  # Si ya existe la fecha en STATUS, añadimos SOLO bajo "Notas:" (o al final de la subsección)
  awk -v date="$DATE" -v notes_count="${#NOTES[@]}" \
      "$(printf ' -v note_%d=%q' $(seq 0 $((${#NOTES[@]}-1))) "${NOTES[@]}")" \
      '
      function print_notes_block() {
        for (i=0; i<notes_count; i++) {
          key = "note_" i
          print "  - " ENVIRON[key]
        }
      }
      BEGIN { in=0; injected=0; sawNotas=0; }
      {
        if ($0 ~ ("^###[[:space:]]+" date "$")) { in=1; sawNotas=0; print $0; next }
        if (in==1 && $0 ~ "^###[[:space:]]+" && $0 !~ ("^###[[:space:]]+" date "$") && injected==0) {
          # termina sección de la fecha, inyecta si no se hizo
          if (sawNotas==0) {
            print "- Notas:"
          }
          print_notes_block()
          injected=1
          in=0
          print $0
          next
        }
        if (in==1 && $0 ~ "^- Notas:" ) {
          sawNotas=1
          print $0
          next
        }
        print $0
      }
      END {
        if (in==1 && injected==0) {
          if (sawNotas==0) {
            print "- Notas:"
          }
          print_notes_block()
        }
      }
      ' "$STATUS" > "$tmp"

  mv "$tmp" "$STATUS"
}

append_changelog
append_status

echo "OK: actualizado incremental:"
echo "- $CHANGELOG"
echo "- $STATUS"
