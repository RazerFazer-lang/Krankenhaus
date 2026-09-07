@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo      KRANKENHAUS - LOKALER START
echo ========================================
echo.

if not exist "node_modules" (
  echo [1/3] Abhaengigkeiten werden installiert ...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install ist fehlgeschlagen.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Abhaengigkeiten sind bereits installiert.
)

echo [2/3] Spiel wird gebaut ...
call npm run build
if errorlevel 1 (
  echo.
  echo Der Build ist fehlgeschlagen. Bitte die Fehlermeldung pruefen.
  pause
  exit /b 1
)

echo [3/3] Krankenhaus-Server wird gestartet ...
start "Krankenhaus Server" cmd /k "npm start"

timeout /t 3 /nobreak >nul
start "" "http://localhost:3001"

echo.
echo Das Spiel wurde geoeffnet:
echo http://localhost:3001
echo.
echo Dieses Fenster kann geschlossen werden. Der Server bleibt im zweiten Fenster offen.
echo Zum Beenden bitte das Fenster 'Krankenhaus Server' schliessen.
pause
