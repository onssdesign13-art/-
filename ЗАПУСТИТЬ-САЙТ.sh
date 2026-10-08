#!/usr/bin/env bash
# Двойной клик (или ./ЗАПУСТИТЬ-САЙТ.sh) запускает сайт на Linux.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Установите LTS: https://nodejs.org"
  read -n 1 -s -r -p "Нажмите любую клавишу…"
  exit 1
fi

node scripts/launch.mjs "$@"
code=$?
if [ $code -ne 0 ]; then
  read -n 1 -s -r -p "Нажмите любую клавишу…"
fi
exit $code
