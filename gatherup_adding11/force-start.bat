@echo off
echo [GatherUp] Force killing existing processes on ports 5000 and 5173...

:: Kill processes on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [GatherUp] Killing backend process with PID %%a...
    taskkill /F /PID %%a
)

:: Kill processes on port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [GatherUp] Killing frontend process with PID %%a...
    taskkill /F /PID %%a
)

:: Kill any other node processes
echo [GatherUp] Cleaning up remaining Node processes...
taskkill /IM node.exe /F 2>nul

echo.
echo [GatherUp] Ports are clear! Starting the project...
npm run dev
