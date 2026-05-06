#!/bin/bash
# Publish VS Code extension with vsce
# This script temporarily renames the root node_modules to avoid vsce picking up extraneous packages

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VSCODE_DIR="$ROOT_DIR/packages/vs-code"
NODE_MODULES="$ROOT_DIR/node_modules"
NODE_MODULES_BAK="$ROOT_DIR/node_modules.bak"

echo "Syncing plugin..."
node "$ROOT_DIR/scripts/sync-plugin.js"

echo "Temporarily hiding root node_modules..."
if [ -d "$NODE_MODULES" ]; then
  mv "$NODE_MODULES" "$NODE_MODULES_BAK"
fi

echo "Publishing from $VSCODE_DIR..."
cd "$VSCODE_DIR"
npx vsce publish

echo "Restoring root node_modules..."
if [ -d "$NODE_MODULES_BAK" ]; then
  mv "$NODE_MODULES_BAK" "$NODE_MODULES"
fi

echo "Done!"
