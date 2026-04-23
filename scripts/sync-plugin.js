const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pluginDir = path.join(rootDir, 'packages', 'ts-plugin');
const extensionDir = path.join(rootDir, 'packages', 'vs-code');
const pluginNodeModulesDir = path.join(extensionDir, 'node_modules', 'ts-plugin-tagged-jsx');

console.log('Syncing ts-plugin-tagged-jsx to VS Code extension...');

console.log('Building parse-jsx...');
execSync('npm run build --workspace=parse-jsx', { cwd: rootDir, stdio: 'inherit' });

console.log('Building transform-jsx...');
execSync('npm run build --workspace=transform-jsx', { cwd: rootDir, stdio: 'inherit' });

console.log('Building ts-plugin-tagged-jsx...');
execSync('npm run build --workspace=ts-plugin-tagged-jsx', { cwd: rootDir, stdio: 'inherit' });

console.log('Copying plugin to extension node_modules...');
if (fs.existsSync(pluginNodeModulesDir)) {
  fs.rmSync(pluginNodeModulesDir, { recursive: true });
}
fs.mkdirSync(pluginNodeModulesDir, { recursive: true });

const pluginDistDir = path.join(pluginDir, 'dist');
const files = fs.readdirSync(pluginDistDir);
for (const file of files) {
  fs.copyFileSync(
    path.join(pluginDistDir, file),
    path.join(pluginNodeModulesDir, file)
  );
  console.log(`  Copied: ${file}`);
}

const pluginPackageJson = require(path.join(pluginDir, 'package.json'));
const bundledPackageJson = {
  name: 'ts-plugin-tagged-jsx',
  version: pluginPackageJson.version,
  description: pluginPackageJson.description,
  main: 'index.cjs',
  types: 'index.d.ts',
  peerDependencies: pluginPackageJson.peerDependencies,
};

fs.writeFileSync(
  path.join(pluginNodeModulesDir, 'package.json'),
  JSON.stringify(bundledPackageJson, null, 2)
);
console.log('Created package.json in node_modules/ts-plugin-tagged-jsx');

console.log('Done! Plugin synced to:', pluginNodeModulesDir);
