import {createHmac, timingSafeEqual} from 'node:crypto';
import {challenges, publicChallenge} from '../lib/challenges.js';

async function redis(...command) {
 const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});
 if (!r.ok) throw new Error('Storage unavailable');
 const data = await r.json(); if(data.error) throw new Error('Storage unavailable'); return data.result;
}
const hash = value => createHmac('sha256',process.env.QUOTA_SECRET).update(value).digest('hex');
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method !== 'POST') return res.status(405).json({error:'Use POST.'});
 const required=['OPENAI_API_KEY','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','QUOTA_SECRET','STUDENT_CODES','APP_ORIGIN'];
 if(required.some(k=>!process.env[k])) return res.status(503).json({error:'Challenge generation is not configured yet. The local lab still works.'});
 if(req.headers.origin !== process.env.APP_ORIGIN) return res.status(403).json({error:'Open the lab at its published address.'});
 const {code,action} = req.body || {};
 if(typeof code !== 'string' || code.length>100 || !['status','generate'].includes(action)) return res.status(400).json({error:'Enter your student access code.'});
 const digest=hash(code.trim());
 const valid=process.env.STUDENT_CODES.split(',').some(c=>timingSafeEqual(Buffer.from(hash(c.trim())),Buffer.from(digest)));
 if(!valid) return res.status(403).json({error:'That access code was not recognized. Ask your teacher for your code.'});
 const key=`cracker:v1:${digest}`;
 try {
  const saved=await redis('HGETALL',key);
  const fields={}; for(let i=0;i<saved.length;i+=2) fields[saved[i]]=saved[i+1];
  const history=[0,1,2].filter(i=>fields[`challenge${i}`]).map(i=>JSON.parse(fields[`challenge${i}`]));
  if(action==='status') return res.json({history,used:Number(fields.used||0)});
  // Atomic reservation: unique slots, a per-student lifetime cap, and a global daily spend guard.
  const daily=`cracker:daily:${new Date().toISOString().slice(0,10)}`;
  const fallbacks=challenges.map((_,i)=>JSON.stringify({...publicChallenge(i,{}),personalized:false}));
  const slot=Number(await redis('EVAL',`local n=tonumber(redis.call('HGET',KEYS[1],'used') or '0'); if n>=3 then return -1 end; local d=tonumber(redis.call('GET',KEYS[2]) or '0'); if d>=tonumber(ARGV[1]) then return -2 end; redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],172800); redis.call('HSET',KEYS[1],'used',n+1,'challenge'..n,ARGV[n+2]); return n`,2,key,daily,String(Number(process.env.DAILY_GENERATION_LIMIT)||30),...fallbacks));
  if(slot<0) return res.status(429).json({error:slot===-1?'All 3 challenges have been generated. Reopen them and run tests as often as you like.':'Today’s class generation allowance is used up. Please try another day.'});
  const base=challenges[slot];
  // Reserve before contacting OpenAI. Even a failed provider request consumes a slot;
  // a verified fallback is saved so the student always receives an exercise.
  let prose={}, personalized=false;
  try {
   const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',max_completion_tokens:800,messages:[{role:'system',content:'You write warm, clear Python exercises for beginners. Return JSON with title (max 90 characters), introduction (max 700 characters), and encouragement (max 200 characters). Invent a small friendly secret-message scenario. Do not change the requirements, provide code, add requirements, or claim tests passed.'},{role:'user',content:base.task}],response_format:{type:'json_object'}})});
   if(!r.ok) throw new Error('Provider unavailable');
   const data=await r.json(); const p=JSON.parse(data.choices[0].message.content);
   if(typeof p.title!=='string'||typeof p.introduction!=='string'||typeof p.encouragement!=='string') throw new Error('Invalid response');
   prose={title:p.title.slice(0,90),introduction:p.introduction.slice(0,700),encouragement:p.encouragement.slice(0,200)}; personalized=true;
  } catch { prose={introduction:'A secret message needs your help. Make a small repair, then inspect each test to see what changed.',encouragement:'Take your time. Hints and the solution are always available.'}; }
  const challenge={...publicChallenge(slot,prose),personalized};
  await redis('HSET',key,`challenge${slot}`,JSON.stringify(challenge));
  return res.json({challenge,used:slot+1});
 } catch { return res.status(503).json({error:'The challenge service is temporarily unavailable. Reload your saved challenges before trying again. Local runs and tests still work.'}); }
}
