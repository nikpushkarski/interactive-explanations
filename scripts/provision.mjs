import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const count=Number(process.argv[2]||30);
if(!Number.isInteger(count)||count<1||count>100)throw new Error('Choose 1–100 student codes.');
const codes=Array.from({length:count},()=>randomBytes(12).toString('base64url'));
await writeFile('.env.local',`# PRIVATE: do not commit or share this file. Copy settings into Vercel.\nOPENAI_API_KEY=\nOPENAI_MODEL=gpt-4.1-mini\nUPSTASH_REDIS_REST_URL=\nUPSTASH_REDIS_REST_TOKEN=\nQUOTA_SECRET=${randomBytes(32).toString('hex')}\nSTUDENT_CODES=${codes.join(',')}\nAPP_ORIGIN=https://YOUR-PROJECT.vercel.app\nDAILY_GENERATION_LIMIT=30\n`,{flag:'wx'});
await writeFile('student-codes.local.txt',codes.map((code,i)=>`Student ${i+1}: ${code}`).join('\n')+'\n',{flag:'wx'});
console.log(`Created private .env.local and student-codes.local.txt with ${count} codes. Both are ignored by Git. No secret values were printed. Existing files are never overwritten.`);
