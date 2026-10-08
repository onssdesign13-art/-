@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Objet - passport pages

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js не найден.
  echo  Установите LTS-версию с https://nodejs.org и запустите этот файл снова.
  echo.
  start "" "https://nodejs.org/ru/download"
  pause
  exit /b 1
)

node "scripts\launch.mjs" %*
if errorlevel 1 (
  echo.
  echo  Запуск не удался - скопируйте текст выше.
  pause
)
exit /b %errorlevel%
