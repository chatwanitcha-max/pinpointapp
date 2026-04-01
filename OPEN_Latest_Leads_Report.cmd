@echo off
cd /d "%~dp0"
node scripts\export-recent-website-leads.mjs
start "" "%~dp0operations\runtime\recent-website-leads.html"
