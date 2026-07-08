@echo off
echo Server ishga tushmoqda... Darchani yopmang!
start /b node server.js
timeout /t 2 /nobreak > nul
start http://localhost:3000
start http://localhost:3000/admin.html
