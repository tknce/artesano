@echo off
chcp 65001 > nul
title CROCINI Server

echo.
echo  +==================================+
echo  ^|     CROCINI Server Starting...  ^|
echo  +==================================+
echo.

:: ── Step 1: Start MySQL ────────────────────────────────────
echo  [1/2] Starting MySQL...
start "MySQL 8.4" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\my.ini"

:: Wait 7 seconds for MySQL to fully start
timeout /t 7 /nobreak > nul

:: ── Step 2: Start Node Server ──────────────────────────────
echo  [2/2] Starting Node server...
start "CROCINI Node Server" cmd /k ""C:\Program Files\nodejs\npm.cmd" --prefix "C:\Users\박규택\Desktop\leather-website\backend" run dev"

:: ── Done ───────────────────────────────────────────────────
echo.
echo  OK  MySQL running
echo  OK  Node server starting (http://localhost:3000)
echo.
echo  Open shop.html in your browser.
echo  To stop: close each window manually.
echo.
pause
