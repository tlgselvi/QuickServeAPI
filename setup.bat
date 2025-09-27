@echo off
echo 🚀 FinBot Local Setup
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Run setup script
echo 🔧 Running setup script...
call node setup.js
if %errorlevel% neq 0 (
    echo ❌ Setup failed
    pause
    exit /b 1
)

echo.
echo ✅ Setup completed successfully!
echo.
echo 📝 Manual steps remaining:
echo 1. Make sure PostgreSQL is installed and running
echo 2. Create a database named 'finbot_db' (or your chosen name)
echo 3. Update the DATABASE_URL in your .env file if needed
echo 4. Run: npm run db:push
echo 5. Run: npm run dev
echo.
pause

