const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pluginDir = path.join(rootDir, 'packages', 'ts-plugin');
const extensionDir = path.join(rootDir, 'packages', 'vs-code');
const pluginNodeModulesDir = path.join(extensionDir, 'node_modules', '@tagged-jsx', 'ts-plugin');
const pluginPackageJsonPath = path.join(pluginDir, 'package.json');

console.log('Syncing @tagged-jsx/ts-plugin to VS Code extension...');

console.log('Building @tagged-jsx/parse...');
execSync('npm run build --workspace=@tagged-jsx/parse', { cwd: rootDir, stdio: 'inherit' });

console.log('Building @tagged-jsx/transform...');
execSync('npm run build --workspace=@tagged-jsx/transform', { cwd: rootDir, stdio: 'inherit' });

console.log('Building @tagged-jsx/ts-plugin...');
execSync('npm run build --workspace=@tagged-jsx/ts-plugin', { cwd: rootDir, stdio: 'inherit' });

console.log('Copying plugin to extension node_modules...');
if (fs.existsSync(pluginNodeModulesDir)) {
  fs.rmSync(pluginNodeModulesDir, { recursive: true });
}
fs.mkdirSync(pluginNodeModulesDir, { recursive: true });

// Copy dist files
const pluginDistDir = path.join(pluginDir, 'dist');
const files = fs.readdirSync(pluginDistDir);
for (const file of files) {
  fs.copyFileSync(
    path.join(pluginDistDir, file),
    path.join(pluginNodeModulesDir, file)
  );
  console.log(`  Copied: ${file}`);
}

// Create proper package.json that vsce will recognize
const pluginPackageJson = JSON.parse(fs.readFileSync(pluginPackageJsonPath, 'utf8'));
const bundledPackageJson = {
  name: '@tagged-jsx/ts-plugin',
  version: pluginPackageJson.version,
  description: pluginPackageJson.description,
  main: 'index.cjs',
  types: 'index.d.ts',
  peerDependencies: pluginPackageJson.peerDependencies,
  dependencies: {
    '@tagged-jsx/parse': 'file:../../parse',
    '@tagged-jsx/transform': 'file:../../transform'
  }
};

fs.writeFileSync(
  path.join(pluginNodeModulesDir, 'package.json'),
  JSON.stringify(bundledPackageJson, null, 2)
);
console.log('Created package.json in node_modules/@tagged-jsx/ts-plugin');

// Copy the actual dependency packages so vsce can resolve them
const parseNodeModulesDir = path.join(extensionDir, 'node_modules', '@tagged-jsx', 'parse');
const transformNodeModulesDir = path.join(extensionDir, 'node_modules', '@tagged-jsx', 'transform');

// Create @tagged-jsx/parse
if (!fs.existsSync(parseNodeModulesDir)) {
  fs.mkdirSync(parseNodeModulesDir, { recursive: true });
}
const parseDistDir = path.join(rootDir, 'packages', 'parse', 'dist');
if (fs.existsSync(parseDistDir)) {
  const parseFiles = fs.readdirSync(parseDistDir);
  for (const file of parseFiles) {
    fs.copyFileSync(
      path.join(parseDistDir, file),
      path.join(parseNodeModulesDir, file)
    );
  }
}
const parsePkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages', 'parse', 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(parseNodeModulesDir, 'package.json'),
  JSON.stringify({
    name: '@tagged-jsx/parse',
    version: parsePkgJson.version,
    main: 'index.mjs',
    types: 'index.d.mts'
  }, null, 2)
);

// Create @tagged-jsx/transform
if (!fs.existsSync(transformNodeModulesDir)) {
  fs.mkdirSync(transformNodeModulesDir, { recursive: true });
}
const transformDistDir = path.join(rootDir, 'packages', 'transform', 'dist');
if (fs.existsSync(transformDistDir)) {
  const transformFiles = fs.readdirSync(transformDistDir);
  for (const file of transformFiles) {
    fs.copyFileSync(
      path.join(transformDistDir, file),
      path.join(transformNodeModulesDir, file)
    );
  }
}
const transformPkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages', 'transform', 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(transformNodeModulesDir, 'package.json'),
  JSON.stringify({
    name: '@tagged-jsx/transform',
    version: transformPkgJson.version,
    main: 'index.mjs',
    types: 'index.d.mts',
    dependencies: {
      '@tagged-jsx/parse': 'file:../../parse'
    }
  }, null, 2)
);

console.log('Done! Plugin and dependencies synced to:', pluginNodeModulesDir);
