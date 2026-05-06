@echo off
REM Publish VS Code extension with vsce
REM This script temporarily renames the root node_modules to avoid vsce picking up extraneous packages

set ROOT_DIR=%~dp0..
set VSCODE_DIR=%ROOT_DIR%\packages\vs-code
set NODE_MODULES=%ROOT_DIR%\node_modules
set NODE_MODULES_BAK=%ROOT_DIR%\node_modules.bak

echo Syncing plugin...
node "%ROOT_DIR%\scripts\sync-plugin.js"

echo Temporarily hiding root node_modules...
if exist "%NODE_MODULES%" (
  rename "%NODE_MODULES%" "node_modules.bak"
)

echo Publishing from %VSCODE_DIR%...
cd "%VSCODE_DIR%"
npx vsce publish

echo Restoring root node_modules...
if exist "%NODE_MODULES_BAK%" (
  rename "%NODE_MODULES_BAK%" "node_modules"
)

echo Done!
