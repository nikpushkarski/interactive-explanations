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
test('All pages load shared styles before lesson-specific styles',async()=>{
 for(const file of ['index.html','loop-lab/index.html','code-cracker/index.html']){
  const html=await readFile(file,'utf8');
  const href=file==='index.html'?'shared/styles.css':'../shared/styles.css';
  const shared=html.indexOf(`href="${href}" data-shared-styles`);
  assert.ok(shared>=0,`Missing shared stylesheet: ${file}`);
  const local=file==='code-cracker/index.html'?html.indexOf('href="style.css"'):html.indexOf('<style>');
  assert.ok(shared<local,`Shared styles must precede local styles: ${file}`);
  assert.doesNotMatch(html,/--(?:paper|ink|green|page-max)\s*:/);
 }
 const shared=await readFile('shared/styles.css','utf8');
 for(const selector of ['.app-header','.app-intro','.app-toc','.credits','.card','.field'])assert.ok(shared.includes(selector));
 assert.ok(shared.includes('--content-max: calc(var(--page-max) - 2 * var(--page-padding))'));
 const local=await readFile('code-cracker/style.css','utf8');
 assert.doesNotMatch(local,/--(?:paper|ink|green|page-max)\s*:/);
 assert.ok(local.includes('max-width:var(--wide-max)'));
 const build=await readFile('scripts/build.mjs','utf8');
 assert.ok(build.includes("'public/shared/styles.css'"));
});

test('Loop Lab keeps compact lesson controls and has no download or footer copy',async()=>{
 const html=await readFile('loop-lab/index.html','utf8');
 assert.doesNotMatch(html,/id="download"|Download HTML|Works offline after download|A little less abstract/);
 assert.ok(html.includes('height:30px;padding:0;display:grid;place-items:center'));
 assert.ok(html.includes('.tab:hover:not(:disabled){background:none;transform:none}'));
 const shared=await readFile('shared/styles.css','utf8');
 const buttonBase=shared.match(/:where\(button, \.btn\) \{([^}]+)\}/);
 assert.ok(buttonBase);
 assert.doesNotMatch(buttonBase[1],/padding:/);
 assert.ok(shared.includes('width: calc(100% - 2 * var(--shell-gutter))'));
 const code=await readFile('code-cracker/style.css','utf8');
 assert.doesNotMatch(code,/padding-left:146px/);
});

test('All three pages use the same self-contained SVG favicon',async()=>{
 const icons=[];
 for(const file of ['index.html','loop-lab/index.html','code-cracker/index.html']){
  const html=await readFile(file,'utf8');
  const icon=html.match(/<link rel="icon" href="([^"]+)"/);
  assert.ok(icon,`Missing favicon in ${file}`);
  assert.ok(icon[1].startsWith('data:image/svg+xml,'));
  icons.push(icon[1]);
 }
 assert.equal(new Set(icons).size,1);
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
