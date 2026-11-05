import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

test('the main Watch it work click visits every execution event, not only letter milestones',async()=>{
 const source=await readFile('code-cracker/app.js','utf8');
 assert.ok(source.includes("$('play').onclick=play;"));
 assert.ok(source.includes("$('detailPlay').addEventListener('click',play);"));
 const start=source.indexOf('async function play(');
 const end=source.indexOf('\nfunction setMode',start);
 assert.ok(start>=0&&end>start);
 const play=source.slice(start,end);
 const visited=await runInNewContext(`
  let pos=-1, timer=null, busy=false;
  const trace={events:Array.from({length:8},()=>({}))};
  const visited=[],pending=[];
  const buttons={play:{},detailPlay:{},speed:{value:'5'}};
  const $=id=>buttons[id];
  const ensureTrace=async()=>true;
  const render=()=>visited.push(pos);
  const pause=()=>{timer=null;};
  const setTimeout=fn=>{pending.push(fn);return pending.length;};
  const followingMoment=()=>{throw new Error('Main autoplay skipped loop instructions');};
  ${play}
  (async()=>{
   await play({type:'click'});
   while(pending.length)pending.shift()();
   return visited;
  })();
 `);
 assert.deepEqual(Array.from(visited),[0,1,2,3,4,5,6,7]);
});
