import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EVIDENCE } from '../data.js';

const extract = '/workspace/games/dossier-baass/source/pages-extracted.txt';

function normalize(text) {
  return String(text ?? '')
    .replace(/\u00ad/g, '-')
    .replace(/\ufb01/g, 'fi')
    .replace(/\ufb02/g, 'fl')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/-\s+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
function lettersOnly(s) {
  return normalize(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

test('8 preuves, chacune vérifiée dans pages-extracted.txt à la page indiquée', () => {
  assert.equal(EVIDENCE.length, 8);
  assert.ok(existsSync(extract), 'pages-extracted.txt manquant (lecture seule, jeu 2D)');
  const src = readFileSync(extract, 'utf8');
  const pages = {};
  const parts = src.split(/========== PDF PAGE (\d+) ==========/);
  for (let i = 1; i < parts.length; i += 2) pages[Number(parts[i])] = parts[i + 1];
  const misses = [];
  for (const ev of EVIDENCE) {
    const page = pages[ev.pdfPage] || '';
    const q = normalize(ev.quote);
    const inPage = normalize(page).includes(q) || lettersOnly(page).includes(lettersOnly(q));
    if (!inPage) misses.push(ev.id + ' p.' + ev.pdfPage);
  }
  assert.equal(misses.length, 0, 'non vérifiées : ' + misses.join(', '));
});

test('la citation Roswell 1947 est réellement dans la source', () => {
  const ev = EVIDENCE.find((e) => e.id === 'roswell-pio');
  assert.ok(ev.quote.includes('July, 1947'));
  assert.ok(ev.quote.includes('Roswell'));
  assert.equal(ev.pdfPage, 45);
});
