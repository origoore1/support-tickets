@echo off
echo ================================================
echo  Fixing server.js encoding issue for Windows
echo ================================================
echo.

echo Step 1: Pulling latest changes from repository...
git pull origin claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3
echo.

echo Step 2: Verifying server.js was updated...
git checkout origin/claude/lindgren-x-v2-setup-01KKJ3wURJpSu9xQJkPgRJR3 -- server.js
echo.

echo Step 3: Checking first line of server.js...
powershell -Command "Get-Content server.js -TotalCount 5"
echo.

echo ================================================
echo  Fix complete! Now try running: npm start
echo ================================================
pause
