#!/usr/bin/env bash
# FIND MY CAR — .github/scripts/lancer-tests.sh   (Lot : P1, socle)
# Utilisé UNIQUEMENT par GitHub Actions (rien à installer sur vos postes).
# Ouvre la page de tests dans Chrome sans fenêtre, attend la fin, puis lit le
# résultat dans le titre de la page : « FMC-TESTS OK 71/71 » ou « FMC-TESTS KO … ».
set -u
URL="${1:-http://localhost:8080/tests/?auto=1}"
PORT=9222
PROFIL=$(mktemp -d)

google-chrome --headless=new --no-sandbox --disable-gpu --no-first-run \
  --user-data-dir="$PROFIL" --remote-debugging-port=$PORT "$URL" > /dev/null 2>&1 &
CHROME=$!

TITRE=""
for i in $(seq 1 150); do          # au plus 5 minutes
  sleep 2
  TITRE=$(curl -s "http://127.0.0.1:$PORT/json" | grep -o '"title": *"FMC-TESTS[^"]*"' | head -1)
  [ -n "$TITRE" ] && break
done
kill $CHROME 2> /dev/null

echo "Résultat : ${TITRE:-aucun résultat (délai dépassé)}"
echo "$TITRE" | grep -q 'FMC-TESTS OK' || {
  echo "::error::Des tests ont échoué. Ouvrez tests/ avec Live Server pour voir le détail."
  exit 1
}
