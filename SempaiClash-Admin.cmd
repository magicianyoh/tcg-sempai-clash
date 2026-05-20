@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch-sempai.ps1" -Target admin
if errorlevel 1 pause
