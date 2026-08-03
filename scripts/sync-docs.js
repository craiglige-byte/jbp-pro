// Post-build script: sync dist/ → docs/ and update all HTML references
import { readdirSync, copyFileSync, unlinkSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distAssets = resolve(root, 'dist', 'assets');
const docsAssets = resolve(root, 'docs', 'assets');
const docsDir = resolve(root, 'docs');

// 1. Clean old assets and copy new ones
if (existsSync(docsAssets)) {
  for (const f of readdirSync(docsAssets)) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      unlinkSync(resolve(docsAssets, f));
    }
  }
}
if (existsSync(distAssets)) {
  for (const f of readdirSync(distAssets)) {
    copyFileSync(resolve(distAssets, f), resolve(docsAssets, f));
  }
  console.log('✓ Assets synced to docs/');
}

// 2. Find new asset hashes
const distFiles = readdirSync(distAssets);
const newJs = distFiles.find(f => f.endsWith('.js'));
const newCss = distFiles.find(f => f.endsWith('.css'));
if (!newJs || !newCss) {
  console.error('✗ Could not find JS/CSS in dist/assets/');
  process.exit(1);
}
console.log(`  JS:  ${newJs}`);
console.log(`  CSS: ${newCss}`);

// 3. Update ALL HTML files in docs/
const htmlFiles = readdirSync(docsDir).filter(f => f.endsWith('.html'));
let updated = 0;
for (const htmlFile of htmlFiles) {
  const path = resolve(docsDir, htmlFile);
  let content = readFileSync(path, 'utf-8');
  let changed = false;

  // Replace old JS reference (any index-*.js) with new one
  const jsResult = content.replace(/index-[A-Za-z0-9_-]+\.js/g, newJs);
  if (jsResult !== content) {
    content = jsResult;
    changed = true;
  }

  // Replace old CSS reference (any index-*.css) with new one
  const cssResult = content.replace(/index-[A-Za-z0-9_-]+\.css/g, newCss);
  if (cssResult !== content) {
    content = cssResult;
    changed = true;
  }

  if (changed) {
    writeFileSync(path, content, 'utf-8');
    console.log(`  ✓ ${htmlFile}`);
    updated++;
  }
}
console.log(`✓ ${updated} HTML files updated`);
