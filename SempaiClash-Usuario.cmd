@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch-sempai.ps1" -Target user
if errorlevel 1 pause
