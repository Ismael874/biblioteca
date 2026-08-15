@echo off
cd /d "%~dp0backend"
echo Iniciando servidor de Biblion en http://localhost:4000 ...
if not exist node_modules (
    echo Instalando dependencias por primera vez, un momento...
    call npm install
)
call npm start
echo.
echo El servidor se detuvo. Presiona una tecla para cerrar esta ventana.
pause >nul
