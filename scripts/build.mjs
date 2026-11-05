import {mkdir,rm,copyFile} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});
await mkdir('public/code-cracker',{recursive:true});
await mkdir('public/loop-lab',{recursive:true});
await copyFile('index.html','public/index.html');
await copyFile('loop-lab/index.html','public/loop-lab/index.html');
for(const file of ['index.html','style.css','app.js','story.js','layout.js','runner-worker.js','main.py']) await copyFile(`code-cracker/${file}`,`public/code-cracker/${file}`);
console.log('Built static pages. API source, tests, and configuration are not published as static assets.');
