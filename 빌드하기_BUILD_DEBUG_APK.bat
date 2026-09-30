@echo off
setlocal
cd /d "%~dp0"

if not defined JAVA_HOME (
  if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)

if not exist "android\local.properties" (
  if exist "%LOCALAPPDATA%\Android\Sdk" (
    >"android\local.properties" echo sdk.dir=%LOCALAPPDATA:\=/%/Android/Sdk
  )
)

cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo BUILD FAILED
  pause
  exit /b 1
)
cd ..

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
  copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "MoonSunFarm-debug.apk" >nul
  echo.
  echo BUILD OK: %CD%\MoonSunFarm-debug.apk
) else (
  echo APK output not found.
)
pause
