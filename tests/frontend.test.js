import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Code Cracker markup has no CSP-blocked inline handlers or executable URLs',async()=>{
 const html=await readFile('code-cracker/index.html','utf8');
 assert.doesNotMatch(html,/<[^>]+\son[a-z]+\s*=/i);
 assert.doesNotMatch(html,/\b(?:href|src)\s*=\s*["']\s*javascript:/i);
 assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i);
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 const policy=config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.ok(!policy.includes("'unsafe-inline'"));
});
test('Homepage and both apps expose the table of contents',async()=>{
 const home=await readFile('index.html','utf8');
 assert.ok(home.includes('href="loop-lab/"'));
 assert.ok(home.includes('href="code-cracker/"'));
 for(const folder of ['loop-lab','code-cracker']){
  const html=await readFile(`${folder}/index.html`,'utf8');
  assert.ok(html.includes('aria-label="Learning apps"'));
  for(const href of ['../','../loop-lab/','../code-cracker/'])assert.ok(html.includes(`href="${href}"`));
 }
 const build=await readFile('scripts/build.mjs','utf8');
 assert.ok(build.includes("'public/loop-lab/index.html'"));
});

test('View controls, resize controls, and loading feedback are accessible',async()=>{
 const html=await readFile('code-cracker/index.html','utf8');
 for(const id of ['viewDefault','viewDense','panelWidth','panelDivider','loadingOverlay','loadingCancel','workbench'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/role="separator"[^>]*aria-orientation="vertical"/);
 assert.match(html,/id="loadingOverlay"[\s\S]*?role="status"/);
 const app=await readFile('code-cracker/app.js','utf8');
 assert.ok(!app.includes('Choose Next step, Animate, or Run to end'));
 assert.ok(!app.includes('Use Next step or Animate'));
 const build=await readFile('scripts/build.mjs','utf8');
 assert.ok(build.includes("'layout.js'"));
});
