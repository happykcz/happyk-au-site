import { readFileSync, writeFileSync } from 'fs';

const file = new URL('./index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
const ts = Date.now();
// Force cache-busting on the module src
html = html.replace(/(src=\"\.\/assets\/index-[^\"]+\.js)(\")/, `$1?v=${ts}$2`);
// Stamp or update the GPE BUILD line
if (html.includes('GPE BUILD:')) {
  html = html.replace(/GPE BUILD:[^<\n]*/, `GPE BUILD: ${new Date(ts).toISOString()}`);
} else {
  html = html.replace('</title>', `</title>\n    <!-- GPE BUILD: ${new Date(ts).toISOString()} -->`);
}
writeFileSync(file, html, 'utf8');
console.log('[postbuild] cache-busted module src and updated build stamp');
