import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {challenges} from '../lib/challenges.js';
import handler from '../api/challenge.js';
for(const c of challenges){
 test(`${c.id}: reference solution passes every test; starter needs a repair`,()=>{
  assert.equal(c.tests.length,5);assert.equal(c.hints.length,3);
  const program=`import json\nc=json.loads(input())\nfor field in ['solution','starter']:\n env={}\n exec(c[field],env)\n outcomes=[]\n for t in c['tests']:\n  try: outcomes.append(env[c['functionName']](*t['args']) == t['expected'])\n  except Exception: outcomes.append(False)\n print(json.dumps(outcomes))\n`;
  const r=spawnSync('python',['-c',program],{input:JSON.stringify(c),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const [solution,starter]=r.stdout.trim().split(/\r?\n/).map(JSON.parse);assert.ok(solution.every(Boolean));assert.ok(starter.some(x=>!x));
 });
}
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
test('endpoint rejects GET and fails closed without secrets',async()=>{const r=response();await handler({method:'GET'},r);assert.equal(r.code,405);const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;const s=response();await handler({method:'POST'},s);assert.equal(s.code,503);if(old)process.env.OPENAI_API_KEY=old;});
test('authenticated generation saves distinct challenges and caps slots at three',async()=>{
 const env={...process.env},oldFetch=global.fetch;Object.assign(process.env,{OPENAI_API_KEY:'test',UPSTASH_REDIS_REST_URL:'https://redis.invalid',UPSTASH_REDIS_REST_TOKEN:'test',QUOTA_SECRET:'test-only',STUDENT_CODES:'test-student',APP_ORIGIN:'https://lab.invalid'});let used=0,providerCalls=0;const saved={};
 global.fetch=async(url,options)=>{if(url.includes('openai.com')){providerCalls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({title:'A friendly exercise',introduction:'Try a repair.',encouragement:'You can do this.'})}}]})};}const cmd=JSON.parse(options.body);let result;if(cmd[0]==='HGETALL')result=Object.entries({...saved,used:String(used)}).flat();else if(cmd[0]==='EVAL')result=used>=3?-1:used++;else if(cmd[0]==='HSET'){saved[cmd[2]]=cmd[3];result=1;}return {ok:true,json:async()=>({result})};};
 try{const request=(action,code='test-student',origin='https://lab.invalid')=>({method:'POST',headers:{origin},body:{action,code}});let r=response();await handler(request('generate','bad'),r);assert.equal(r.code,403);r=response();await handler(request('generate','test-student','https://evil.invalid'),r);assert.equal(r.code,403);const ids=[];for(let i=0;i<3;i++){r=response();await handler(request('generate'),r);assert.equal(r.code,200);ids.push(r.data.challenge.id);}assert.equal(new Set(ids).size,3);r=response();await handler(request('generate'),r);assert.equal(r.code,429);assert.equal(providerCalls,3);r=response();await handler(request('status'),r);assert.equal(r.data.history.length,3);assert.equal(providerCalls,3);
 }finally{global.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
});
