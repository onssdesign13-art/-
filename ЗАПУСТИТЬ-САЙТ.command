#!/bin/bash
# Двойной клик по этому файлу запускает сайт на macOS.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export LANG="${LANG:-ru_RU.UTF-8}"
clear

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден."
  echo "Установите LTS-версию с https://nodejs.org и запустите этот файл снова."
  open "https://nodejs.org/ru/download" 2>/dev/null
  read -n 1 -s -r -p "Нажмите любую клавишу, чтобы закрыть…"
  exit 1
fi

node scripts/launch.mjs "$@"
code=$?
if [ $code -ne 0 ]; then
  echo
  read -n 1 -s -r -p "Нажмите любую клавишу, чтобы закрыть…"
fi
exit $code
