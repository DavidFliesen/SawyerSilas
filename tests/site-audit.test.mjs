import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditSite } from '../scripts/audit-site.mjs';

test('all source and built pages have real stories, listening lists, and valid internal references', async () => {
  await auditSite('public');
  await auditSite('dist', { expectedVersion: '1.1.16' });
});
test('audit rejects an uppercase Index.html before publishing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sawyer-case-'));
  try {
    await cp('public', dir, {recursive:true});
    await cp(join(dir,'index.html'), join(dir,'Index.html'));
    await assert.rejects(auditSite(dir), /Case-duplicate|lowercase index/);
  } finally { await rm(dir, {recursive:true, force:true}); }
});
test('audit rejects blank Gator Bob, missing music, duplicate story buttons, and broken fragments', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sawyer-audit-'));
  try {
    await cp('public', dir, {recursive:true});
    const path = join(dir,'songs/gator-bob/index.html');
    const original = await readFile(path,'utf8');
    const corruptions = [
      ['', /incomplete or empty page/],
      [original.replace(/<div class="service-grid"[^>]*>[\s\S]*?<\/div>/, ''), /listening services missing/],
      [original.replace('Read the Full Story</a>', 'Read the Story</a>'), /short story button/],
      [original.replace('href="#story"', 'href="#nonexistent"'), /broken fragment/],
    ];
    for (const [html, error] of corruptions) {
      await writeFile(path, html);
      await assert.rejects(auditSite(dir), error);
    }
  } finally { await rm(dir, {recursive:true, force:true}); }
});
test('audit rejects a removed or changed Caught in the Rise direct link', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sawyer-links-'));
  try {
    await cp('public', dir, {recursive:true});
    const path = join(dir,'songs/caught-in-the-rise/index.html');
    const original = await readFile(path,'utf8');
    await writeFile(path, original.replace(/\s*<a class="service-link button" data-service="deezer"[^>]*>[\s\S]*?<\/a>/, ''));
    await assert.rejects(auditSite(dir), /missing listening service deezer/);
    await writeFile(path, original.replace('https://tidal.com/track/577215688', 'https://tidal.com/artist/sawyer-silas/85425435'));
    await assert.rejects(auditSite(dir), /invalid direct URL for tidal/);
  } finally { await rm(dir, {recursive:true, force:true}); }
});
