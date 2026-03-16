@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" (
  echo Cannot find Node.js at "%NODE_EXE%"
  echo Please install Node.js or update OPEN_Web_App.cmd
  pause
  exit /b 1
)

echo Starting Pinpoint local preview server...
start "Pinpoint Local Server" "%NODE_EXE%" "tools\local-server.mjs" 5500
ping 127.0.0.1 -n 3 >nul
start "" "http://localhost:5500/"
