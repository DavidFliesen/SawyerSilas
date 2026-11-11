import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditSite } from '../scripts/audit-site.mjs';
import { renderReleaseLinks } from '../scripts/render-release-links.mjs';
import { serviceFor } from '../scripts/release-links.mjs';

test('all source and built pages have real stories, listening lists, and valid internal references', async () => {
  await auditSite('public');
  await auditSite('dist');
});
test('iTunes purchase URLs are not mistaken for Apple Music', () => {
  assert.equal(serviceFor('https://music.apple.com/us/album/caught-in-the-rise/6832419151?i=6832419153&app=itunes'), 'itunes');
});
test('audit rejects an uppercase Index.html before publishing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sawyer-case-'));
  try {
    await cp('public', dir, {recursive:true});
    await cp(join(dir,'index.html'), join(dir,'Index.html'));
    await assert.rejects(auditSite(dir), /Case-duplicate|lowercase index/);
  } finally { await rm(dir, {recursive:true, force:true}); }
});
test('rendering refuses to erase links or write a page with missing markers', async () => {
  const html = await readFile('public/index.html', 'utf8');
  assert.throws(() => renderReleaseLinks(html, [], './assets/'), /empty listening list/);
  assert.throws(() => renderReleaseLinks('<html></html>', [{service:'spotify',url:'https://open.spotify.com/album/test'}], './assets/'), /Exactly one/);
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
