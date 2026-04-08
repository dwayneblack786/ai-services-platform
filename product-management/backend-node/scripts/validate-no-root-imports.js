const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanDirs = [
  path.join(root, 'src'),
  path.join(root, 'tests')
];

const blockedPattern = /(?:from\s+['"][^'"]*shared\/(?:types|keycloak-client)['"]|require\(\s*['"][^'"]*shared\/(?:types|keycloak-client)['"]\s*\))/g;
const allowedSuffixes = new Set(['.ts', '.tsx', '.js']);
const skipDirs = new Set(['node_modules', 'dist', 'coverage']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    if (!allowedSuffixes.has(path.extname(entry.name))) {
      continue;
    }

    if (entry.name.endsWith('.backup') || entry.name.includes('.backup.')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const offenders = [];
for (const dir of scanDirs) {
  const files = walk(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (blockedPattern.test(content)) {
      offenders.push(path.relative(root, file));
    }
  }
}

if (offenders.length > 0) {
  console.error('Found forbidden root shared runtime imports:');
  for (const offender of offenders) {
    console.error(` - ${offender}`);
  }
  process.exit(1);
}

console.log('No forbidden root shared runtime imports found.');