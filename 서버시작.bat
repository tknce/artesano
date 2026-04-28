@echo off
chcp 65001 > nul
title CROCINI 서버 시작

echo.
echo  ╔══════════════════════════════════╗
echo  ║     CROCINI 서버 시작 중...      ║
echo  ╚══════════════════════════════════╝
echo.

:: ── 1단계: MySQL 시작 ─────────────────────────────────
echo  [1/2] MySQL 시작 중...
start "MySQL 8.4" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\my.ini"

:: MySQL이 완전히 뜰 때까지 5초 대기
timeout /t 5 /nobreak > nul

:: ── 2단계: Node 서버 시작 ─────────────────────────────
echo  [2/2] Node 서버 시작 중...
start "CROCINI Node Server" cmd /k "cd /d C:\Users\박규택\Desktop\leather-website\backend && npm run dev"

:: ── 완료 메시지 ───────────────────────────────────────
echo.
echo  ✓ MySQL 실행 중
echo  ✓ Node 서버 시작 중 (http://localhost:3000)
echo.
echo  shop.html 을 브라우저에서 열면 됩니다.
echo  종료하려면 각 창을 직접 닫아주세요.
echo.
pause
