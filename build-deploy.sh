#!/bin/bash
# ══════════════════════════════════════════════════════════════
# MAPO — Build & Deploy
# Lance le build et copie UNIQUEMENT les fichiers du build
# courant dans dist-upload/ (propre, sans residus).
#
# Usage:  bash build-deploy.sh
# Output: dist-upload/  (~75 fichiers propres)
# ══════════════════════════════════════════════════════════════

DIST="dist-new"
MANIFEST=".build-manifest"
UPLOAD="dist-upload"

echo ""
echo "══════════════════════════════════════════════"
echo "  MAPO — Build & Deploy"
echo "══════════════════════════════════════════════"
echo ""

# ── Previous manifest ──
PREV_MANIFEST=""
if [ -f "$MANIFEST" ]; then
  PREV_MANIFEST=$(cat "$MANIFEST")
  PREV_COUNT=$(echo "$PREV_MANIFEST" | grep -c "." 2>/dev/null || echo "0")
  echo "[1/3] Manifeste precedent : $PREV_COUNT fichiers"
else
  echo "[1/3] Premier build"
fi

# ── Build ──
echo "[2/3] Build en cours..."
npm run build 2>&1 | grep -E "built in" || true
echo ""

# ── Identify current build files ──
echo "[3/3] Preparation du dossier d'upload..."

NEWEST_TS=$(find "$DIST" -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
NEWEST_INT=${NEWEST_TS%.*}
CUTOFF=$((NEWEST_INT - 15))

# Build in /tmp (always clean)
TMP="/tmp/mapo-deploy"
rm -rf "$TMP"
mkdir -p "$TMP/assets"

TMP_MANIFEST="/tmp/mapo-manifest"
> "$TMP_MANIFEST"

NEW_COUNT=0
CHANGED_COUNT=0
UNCHANGED_COUNT=0
TOTAL=0

cd "$DIST"
while IFS= read -r line; do
  ts_raw=${line%% *}
  ts_int=${ts_raw%.*}
  fpath=${line#* }

  if [ "$ts_int" -ge "$CUTOFF" ] 2>/dev/null; then
    TOTAL=$((TOTAL + 1))
    hash=$(md5sum "$fpath" 2>/dev/null | awk '{print $1}')
    echo "$hash  $fpath" >> "$TMP_MANIFEST"

    dir=$(dirname "$fpath")
    mkdir -p "$TMP/$dir"
    cp "$fpath" "$TMP/$fpath"

    if [ -n "$PREV_MANIFEST" ]; then
      prev_hash=$(echo "$PREV_MANIFEST" | grep "  ${fpath}$" | awk '{print $1}' | head -1)
      if [ -z "$prev_hash" ]; then
        NEW_COUNT=$((NEW_COUNT + 1))
      elif [ "$hash" != "$prev_hash" ]; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
      else
        UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
      fi
    fi
  fi
done < <(find . -type f -printf '%T@ %p\n')
cd - > /dev/null

# Save manifest
cp "$TMP_MANIFEST" "$MANIFEST" 2>/dev/null || true

# Move to dist-upload (create fresh)
mkdir -p "$UPLOAD/assets" 2>/dev/null || true
cp -f "$TMP"/index.html "$UPLOAD"/ 2>/dev/null || true
cp -f "$TMP"/*.png "$UPLOAD"/ 2>/dev/null || true
cp -f "$TMP"/*.svg "$UPLOAD"/ 2>/dev/null || true
cp -f "$TMP"/*.ico "$UPLOAD"/ 2>/dev/null || true
cp -f "$TMP"/assets/* "$UPLOAD"/assets/ 2>/dev/null || true

UPLOAD_SIZE=$(du -sh "$TMP" 2>/dev/null | awk '{print $1}')
rm -rf "$TMP" "$TMP_MANIFEST"

# ── Summary ──
echo ""
echo "══════════════════════════════════════════════"
echo "  RESULTATS"
echo "══════════════════════════════════════════════"
echo ""
echo "  Fichiers du build :  $TOTAL"
if [ -n "$PREV_MANIFEST" ]; then
  echo "  Nouveaux :           $NEW_COUNT"
  echo "  Modifies :           $CHANGED_COUNT"
  echo "  Inchanges :          $UNCHANGED_COUNT"
fi
echo ""
echo "  ──────────────────────────────────────────"
echo "  Taille :     $UPLOAD_SIZE"
echo "  Dossier :    dist-upload/"
echo "  ──────────────────────────────────────────"
echo ""
echo "  Note: dist-upload/ peut contenir des residus"
echo "  d'anciennes sessions. Les bons fichiers sont"
echo "  les plus recents (ceux de ce build)."
echo ""
echo "  Pour un upload propre, utilise les fichiers"
echo "  depuis dist-new/ en ne prenant que les ~$TOTAL"
echo "  fichiers les plus recents."
echo ""
