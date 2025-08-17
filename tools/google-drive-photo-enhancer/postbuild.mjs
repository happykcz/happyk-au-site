import { readFileSync, writeFileSync } from 'fs';

const file = new URL('./index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
const ts = Date.now();
html = html.replace(/(src=\"\.\/assets\/index-[^"]+\.js)(\")/, `$1?v=${ts}$2`);
html = html.replace('GPE BUILD MARKER: will be updated on build', `GPE BUILD: ${new Date(ts).toISOString()}`);
writeFileSync(file, html, 'utf8');
console.log('[postbuild] cache-busted module src and stamped build time');

