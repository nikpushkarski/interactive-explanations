import {storyFrames, followingMoment} from './story.js';
import {syncCodeDrawer} from './layout.js';
const $=id=>document.getElementById(id);
const alphabet='abcdefghijklmnopqrstuvwxyz';
let original='',current=null,history=[],mode='explore',trace=null,pos=-1,timer=null,busy=false,worker=null,cancelRun=null,used=0;
const drafts=new Map();
function tiles(container,text,active=-1){
 text=String(text);
 if(text&&container.dataset.letters===text&&container.children.length===[...text].length){
  [...container.children].forEach((tile,i)=>tile.classList.toggle('selected',i===active));return;
 }
 container.dataset.letters=text;
 container.replaceChildren(...[...String(text)].map((letter,i)=>{const tile=document.createElement('span');tile.className='letter-tile'+(i===active?' selected':'')+(letter===' '?' space-tile':'');tile.textContent=letter===' '?'␣':letter;tile.setAttribute('aria-label',letter===' '?'space':letter);return tile;}));
}
function resetStory(message){
 const text=message??(mode==='explore'?$('message').value:current?.tests[0].args[0]??'');
 $('detailContext').textContent=`Message: ${JSON.stringify(text)}`;
 $('variables').replaceChildren();$('valuesEmpty').hidden=false;$('returnSection').hidden=true;$('printedSection').hidden=true;
 tiles($('incoming'),text);$('outgoing').replaceChildren();$('outgoing').textContent='Your letters will land here.';
 $('letterIn').textContent='?';$('letterOut').textContent='?';$('dialNumber').textContent='?';$('dialLabel').textContent='Which shift will unlock it?';$('storyTitle').textContent='Let’s open this message.';$('storyCaption').textContent='Watch a letter go in, move along, and land in a new message.';$('machineAction').textContent='Ready to turn';$('candidatesSection').hidden=true;$('candidates').replaceChildren();$('progress').textContent='';
 document.querySelector('.machine').classList.remove('turning');if(trace)trace.renderedPrinted=null;
}
function renderStory(){
 const frames=trace.story??(trace.story=storyFrames(trace));
 const frame=frames.findLast(f=>f.index<=pos);
 if(!frame){$('storyTitle').textContent=trace.error?'The machine needs a little help.':'Getting the letters ready…';$('storyCaption').textContent=trace.error||'The message is on its way.';return;}
 const done=frame.kind==='done';
 tiles($('incoming'),frame.message,done?-1:frame.letterIndex);
 tiles($('outgoing'),frame.result,frame.kind==='letter'?frame.result.length-1:-1);
 if(!frame.result)$('outgoing').textContent=done?'An empty message. Nothing to move.':'Your letters will land here.';
 $('dialNumber').textContent=frame.shift===null?'—':Math.abs(Number(frame.shift));
 $('dialLabel').textContent=Number(frame.shift)<0?'places back':'places forward';
 const display=c=>c===' '?'␣':c??'?';
 $('letterIn').textContent=done?'✉':display(frame.from);$('letterOut').textContent=done?(trace.error?'?':'✓'):display(frame.to);
 paintAlphabet(frame.from?alphabet.indexOf(frame.from.toLowerCase()):-1,frame.to?alphabet.indexOf(frame.to.toLowerCase()):-1);
 $('storyTitle').textContent=done?(trace.error?'A little snag to investigate.':'The message has arrived.'):frame.kind==='shift'?`Let’s try moving ${Math.abs(Number(frame.shift))} ${Math.abs(Number(frame.shift))===1?'place':'places'}.`:frame.kind==='letter'?(frame.from===frame.to?'This one stays just as it is.':`${display(frame.from)} becomes ${display(frame.to)}.`):'The message is changing.';
 $('storyCaption').textContent=done?(trace.error?'Open the lid for the clue. You can edit and try again.':mode==='explore'?'Look through the message cards below. Which one sounds right?':'That’s what your code made. Compare it with the message we wanted.'):frame.kind==='shift'?'Same message. A different turn of the dial.':frame.from===frame.to?'Some characters can pass straight through.':'One little change, then into the message it goes.';
 $('machineAction').textContent=done?'All done':frame.kind==='shift'?'Turning the dial':frame.from===frame.to?'Straight through':'A little shift';
 $('progress').textContent=done?'Finished · replay whenever you like':frame.kind==='letter'?`Letter ${frame.letterIndex+1} of ${frame.message.length}`:'A fresh attempt';
 const machine=document.querySelector('.machine');machine.classList.remove('turning');if(!done){void machine.offsetWidth;machine.classList.add('turning');}
 const printed=pos===trace.events.length-1?trace.output:trace.events.slice(0,pos+1).map(e=>e.output).join('');
 if(trace.renderedPrinted===printed)return;
 trace.renderedPrinted=printed;
 const candidates=[...printed.matchAll(/^Shift (\d+): (.*)$/gm)];
 // Reveal the shelf once the run finishes, not underneath a moving animation.
 $('candidatesSection').hidden=mode!=='explore'||pos!==trace.events.length-1||!candidates.length;
 if($('candidatesSection').hidden)return;
 $('candidates').replaceChildren(...candidates.map(([,shift,text])=>{const button=document.createElement('button');button.className='candidate';const label=document.createElement('span');label.textContent=`↻ ${shift} ${shift==='1'?'place':'places'}`;const message=document.createElement('strong');message.textContent=text||'(empty message)';button.append(label,message);button.onclick=()=>{if(busy)return;pause();const f=frames.find(f=>f.kind==='shift'&&Number(f.shift)===-Number(shift));if(f){pos=f.index;render();$('incoming').scrollIntoView({block:'center',behavior:'smooth'});}};return button;}));
}
const say=text=>$('status').textContent=text;
function pause(){clearTimeout(timer);timer=null;$('play').textContent='▶ Watch it work';$('detailPlay').textContent='▶ Watch letters';}
function source(){return mode==='explore'?original:$('editor').value;}
function drawCode(text){$('code').replaceChildren(...text.split('\n').map((line,i)=>{const div=document.createElement('div');div.className='code-line';const n=document.createElement('span');n.className='line-number';n.textContent=i+1;div.append(n,document.createTextNode(line||' '));return div;}));}
function clearTrace(){pause();trace=null;pos=-1;drawCode(source());$('output').textContent='Nothing printed yet.';$('variables').replaceChildren();$('frameTitle').textContent='Ready when you are.';$('explanation').textContent='Next line steps through Python. Watch letters plays the main animation.';$('movement').textContent='letter → index → shift → letter';$('progress').textContent='No trace yet';paintAlphabet();resetStory();}
function paintAlphabet(from=-1,to=-1){if($('alphabet').children.length===26){[...$('alphabet').children].forEach((cell,i)=>{cell.classList.toggle('from',i===from);cell.classList.toggle('to',i===to);});return;}$('alphabet').replaceChildren(...[...alphabet].map((letter,i)=>{const cell=document.createElement('span');cell.textContent=letter;cell.className=(i===from?'from ':'')+(i===to?'to':'');const n=document.createElement('small');n.textContent=i;cell.append(n);return cell;}));}
function render(){
 if(!trace)return;
 const e=trace.events[pos];
 [...$('code').children].forEach((el,i)=>el.classList.toggle('active',Boolean(e&&i===e.line-1)));
 const active=$('code').querySelector('.active');if(active){const box=$('code'),a=active.getBoundingClientRect(),b=box.getBoundingClientRect();if(a.top<b.top||a.bottom>b.bottom)box.scrollTop+=a.top-b.top-box.clientHeight/2;}
 renderStory();
 const visibleOutput=pos===trace.events.length-1?trace.output:trace.events.slice(0,pos+1).map(x=>x.output).join('');
 $('output').textContent=visibleOutput;$('printedSection').hidden=!visibleOutput;
 $('returnSection').hidden=mode!=='challenge'||pos!==trace.events.length-1||Boolean(trace.error);
 $('returnValue').textContent=JSON.stringify(trace.result);
 if(!e){$('explanation').textContent=trace.error?`Let’s inspect this: ${trace.error}`:'This run produced no trace events.';return;}
 $('frameTitle').textContent=`${e.function} · line ${e.line}`;
 const line=source().split('\n')[e.line-1]?.trim()||'';
 let text=e.kind==='return'?`Return from ${e.function}: ${e.returned}. Control goes back to the caller.`:e.kind==='exception'?'Python encountered a problem here. Inspect the variable values and the message below.':line.startsWith('for ')?'The loop is about to take its next value, or finish if there are no more.':line.startsWith('if ')||line.startsWith('else')?'Choose a branch. Python checks a condition to decide which instructions to run.':line.includes('result +=')?'Build the message: the next instruction appends a character to result.':line.includes('print(')?'Send a line to the printed output. Step once more to see it appear.':line.includes('return ')?'Calculate the value to send back to the function that called this one.':`About to execute: ${line}`;
 if(pos===trace.events.length-1)text=trace.error?`Let’s inspect this: ${trace.error}`:`Finished. ${mode==='challenge'?'Returned: '+JSON.stringify(trace.result):'Compare the candidate shifts in the output.'}`;
 $('explanation').textContent=text;
 $('valuesEmpty').hidden=Object.keys(e.values).length>0;
 $('variables').replaceChildren(...Object.entries(e.values).flatMap(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=JSON.stringify(v);return[dt,dd];}));
 const v=e.values,letter=v.letter??(v.message&&v.i!==undefined?v.message[Number(v.i)]:null);
 const from=letter?alphabet.indexOf(letter.toLowerCase()):-1,n=Number(v.n),to=from>=0&&Number.isFinite(n)?((from+n)%26+26)%26:-1;
 // The main alphabet shows actual observed input/output, not an idealized answer.
 $('movement').textContent=letter&&to>=0?`${JSON.stringify(letter)} · position ${from} ${n<0?'−':'+'} ${Math.abs(n)} → ${alphabet[to]} (ideal wrapped shift)`:'Follow the current letter, index, and growing result below.';
 if(letter&&v.letter_index==='-1')$('movement').textContent=`${JSON.stringify(letter)} was not found: actual letter_index = −1. The original case-sensitive lookup is the clue!`;
}
function loading(value){$('detailStatus').hidden=!value;$('detailStatus').classList.toggle('loading',value);$('detailStatus').textContent=value?'Loading animations…':'';$('loadingOverlay').hidden=!value;$('machine').setAttribute('aria-busy',String(value));if(value){$('loadingLabel').textContent='Loading animations…';$('loadingNote').textContent='First time can take a moment.';}}
function lock(value){busy=value;if(!value)loading(false);$('access').disabled=value;$('message').disabled=value;for(const id of ['run','step','play','nextShift','reset','detailStep','detailPlay','detailReset','detailRun','submit','generate','load','explore','challengeTab','restore','useSolution'])$(id).disabled=value;$('generate').disabled=value||used>=3;$('editor').readOnly=value;$('cancel').hidden=true;}
function execute(data){return new Promise((resolve,reject)=>{
 loading(true);
 worker=new Worker('runner-worker.js');let timeout;
 const finish=(err,result)=>{clearTimeout(timeout);worker?.terminate();worker=null;cancelRun=null;loading(false);err?reject(new Error(err)):resolve(result);};
 const deadline=ms=>{clearTimeout(timeout);timeout=setTimeout(()=>finish('This run took too long. Check for a loop that never finishes, then try again. The first Python download also needs an internet connection.'),ms);};
 cancelRun=()=>finish('Python stopped. You can edit and try again.');deadline(90000);
 worker.onmessage=({data:m})=>{if(m.type==='ready'){$('loadingLabel').textContent='Preparing the animation…';$('loadingNote').textContent='Running your message in this browser.';deadline(6000);return;}if(m.type==='result')finish(null,m.data);if(m.type==='error')finish(m.error);};
 worker.onerror=()=>finish('Python could not load. Check your internet connection and reload the page.');worker.postMessage(data);
 });}
function input(){return mode==='explore'?{source:original,mode:'main',message:$('message').value}:{source:source(),mode:'test',functionName:current.functionName,args:current.tests[0].args};}
async function ensureTrace(){if(trace)return true;if(mode==='challenge'&&!current){say('Generate or load a challenge first.');return false;}lock(true);say('Warming up the machine… First use may take a moment to download Python.');try{trace=await execute(input());trace.story=storyFrames(trace);pos=-1;say(trace.error?`Let’s investigate: ${trace.error}`:'Ready to watch. Everything ran right here—no API credits used.');return true;}catch(e){say(e.message);return false;}finally{lock(false);}}
async function next(){if(busy)return;if(!await ensureTrace())return;pos=followingMoment(trace,pos);render();}
async function play(){if(timer){pause();return;}if(busy||!await ensureTrace())return;if(!trace.events.length){render();return;}if(pos>=trace.events.length-1)pos=-1;$('play').textContent='Ⅱ Pause';$('detailPlay').textContent='Ⅱ Pause';const tick=()=>{pos=followingMoment(trace,pos);render();if(pos>=trace.events.length-1){pause();return;}timer=setTimeout(tick,1600/Number($('speed').value));};tick();}
function setMode(nextMode){if(busy)return;mode=nextMode;pause();const exercise=mode==='challenge';$('generation').hidden=!exercise;$('nextShift').hidden=exercise;syncCodeDrawer(exercise&&Boolean(current));$('run').textContent=exercise?'Show the result':'Show all results';$('assignment').hidden=!exercise||!current;$('testSection').hidden=!exercise||!current;$('editor').hidden=!exercise||!current;$('editorLabel').hidden=!exercise||!current;$('editorHelp').hidden=!exercise||!current;$('messageLabel').hidden=exercise;$('explore').setAttribute('aria-pressed',String(!exercise));$('challengeTab').setAttribute('aria-pressed',String(exercise));$('codeTitle').textContent=exercise?'Your repair · Python':'main.py · original';$('editingNote').textContent=exercise?'':'Read-only original';clearTrace();}
function selectChallenge(c){if(busy)return;if(current) drafts.set(current.id,$('editor').value);current=c;$('editor').value=drafts.get(c.id)||c.starter;$('title').textContent=c.title;$('task').textContent=c.task;$('introduction').textContent=c.introduction||'';$('encouragement').textContent=c.encouragement||'';$('hints').replaceChildren();$('hint').disabled=false;$('hint').textContent='Hint? · 0 / 3';$('solutionBox').hidden=true;$('solutionBox').open=false;$('solutionCode').textContent=c.solution;$('resources').replaceChildren(...c.resources.map(r=>{const a=document.createElement('a');a.href=r.url;a.textContent=r.title;a.target='_blank';a.rel='noopener noreferrer';return a;}));$('tests').replaceChildren();setMode('challenge');say(c.personalized?'':'Prepared challenge ready. All tests and hints are available.');}
function showHistory(){ $('quota').textContent=`${used} / 3 generation slots used`;$('generate').disabled=busy||used>=3;$('history').replaceChildren(...history.map(c=>{const b=document.createElement('button');b.textContent=c.title;b.onclick=()=>selectChallenge(c);return b;})); }
async function api(action){const code=$('access').value.trim();if(!code){say('Enter the private access code your teacher gave you.');return;}lock(true);say(action==='generate'?'Preparing a new challenge… This is the only action that can call OpenAI.':'Loading saved challenges (no OpenAI call)…');try{const response=await fetch('/api/challenge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,action}),signal:AbortSignal.timeout(55000)});let data;try{data=await response.json();}catch{throw new Error('Challenge generation needs the Vercel deployment. The local lab works without it.');}if(!response.ok)throw new Error(data.error||'Could not load the challenge.');used=data.used;lock(false);if(data.history){history=data.history;say(`${history.length} saved challenges loaded. ${3-used} generation slots remain.`);if(history.length)selectChallenge(history[history.length-1]);}if(data.challenge){history=history.filter(c=>c.id!==data.challenge.id);history.push(data.challenge);selectChallenge(data.challenge);}showHistory();}catch(e){say(e.message);}finally{lock(false);showHistory();}}
async function submit(){if(busy||!current)return;pause();lock(true);$('tests').replaceChildren();const snapshot=source();say('Running all five tests locally. No API calls.');try{let passed=0;for(const t of current.tests){const result=await execute({source:snapshot,mode:'test',functionName:current.functionName,args:t.args});const ok=!result.error&&result.result===t.expected;if(ok)passed++;const card=document.createElement('article');card.className='test';const title=document.createElement('strong');title.className=ok?'pass':'retry';title.textContent=`${ok?'✓ Matches':'↗ Let’s investigate'} · ${t.label}`;const text=document.createElement('p');text.textContent=`Input: ${current.functionName}(${t.args.map(x=>JSON.stringify(x)).join(', ')})\nExpected return: ${JSON.stringify(t.expected)}\nYour return: ${JSON.stringify(result.result)}${result.error?'\nClue: '+result.error:''}`;const replay=document.createElement('button');replay.textContent='▶ Watch this message';replay.onclick=()=>{if(busy)return;pause();trace=result;trace.story=storyFrames(trace);pos=-1;drawCode(snapshot);resetStory(t.args[0]);say(`“${t.label}” is in the machine. Choose Watch it work or One letter.`);$('incoming').scrollIntoView({block:'center',behavior:'smooth'});};const comparison=document.createElement('div');comparison.className='test-messages';for(const [label,value] of [['We’re hoping for',t.expected],['Your machine made',result.result]]){const box=document.createElement('div');box.className='test-message';const caption=document.createElement('small');caption.textContent=label;const strip=document.createElement('div');strip.className='letter-tray';if(typeof value==='string'&&value.length){tiles(strip,value);}else strip.textContent=value===''?'An empty message':String(value);box.append(caption,strip);comparison.append(box);}const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='See the exact values';details.append(summary,text);card.append(title,comparison,replay,details);$('tests').append(card);}say(`${passed} of 5 tests match. ${passed===5?'Nicely done! You can still explore every trace.':'Choose a test to inspect, try a hint, or view the solution. No penalties.'}`);}catch(e){say(e.message);}finally{lock(false);showHistory();}}
$('nextShift').onclick=async()=>{pause();if(busy||!await ensureTrace())return;pos=followingMoment(trace,pos,true);render();};
$('run').onclick=async()=>{pause();if(busy||!await ensureTrace())return;pos=trace.events.length-1;render();};$('step').onclick=()=>{pause();next();};$('play').onclick=play;$('reset').onclick=()=>{if(busy)return;pause();pos=-1;if(trace){drawCode(source());$('variables').replaceChildren();$('output').textContent='Nothing printed yet.';$('frameTitle').textContent='Rewound to the beginning';$('explanation').textContent='Back at the beginning. The highlighted line and values will follow the letter machine.';$('movement').textContent='letter → index → shift → letter';$('progress').textContent='Back at the beginning.';paintAlphabet();resetStory();}else clearTrace();};$('speed').oninput=()=>{$('detailSpeed').value=$('speed').value;$('speedValue').textContent=Number($('speed').value)<4?'Take it slowly':Number($('speed').value)>7?'Whizz through':'';};$('cancel').onclick=()=>cancelRun?.();$('loadingCancel').addEventListener('click',()=>cancelRun?.());$('message').oninput=()=>{if(!busy)clearTrace();};$('explore').onclick=()=>setMode('explore');$('challengeTab').onclick=()=>{setMode('challenge');if(!current)say('Enter your access code, then generate or load an exercise.');};$('generate').onclick=()=>api('generate');$('load').onclick=()=>api('status');$('submit').onclick=submit;
$('detailStep').addEventListener('click',async()=>{pause();if(busy||!await ensureTrace())return;pos=Math.min(pos+1,trace.events.length-1);render();});
$('detailPlay').addEventListener('click',play);
$('detailReset').addEventListener('click',()=>$('reset').click());
$('detailRun').addEventListener('click',()=>$('run').click());
$('detailSpeed').addEventListener('input',()=>{$('speed').value=$('detailSpeed').value;$('speed').dispatchEvent(new Event('input'));});
$('access').oninput=()=>{history=[];used=0;showHistory();$('quota').textContent='Load to check your allowance';};
$('hint').onclick=()=>{const count=$('hints').children.length;if(count>=3||!current)return;const li=document.createElement('li');li.textContent=current.hints[count];$('hints').append(li);$('hint').textContent=`Hint? · ${count+1} / 3`;$('hint').disabled=count===2;};$('solution').onclick=()=>{$('solutionBox').hidden=false;$('solutionBox').open=true;};
function edited(){clearTrace();$('tests').replaceChildren();if(current)drafts.set(current.id,$('editor').value);}
$('editor').oninput=edited;$('editor').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();const start=e.target.selectionStart,end=e.target.selectionEnd;e.target.setRangeText('    ',start,end,'end');edited();}};$('restore').onclick=()=>{if(confirm('Replace your edits with the starter code?')){$('editor').value=current.starter;edited();}};$('useSolution').onclick=()=>{if(confirm('Replace your edits with the solution?')){$('editor').value=current.solution;edited();}};
try{const r=await fetch('main.py');if(!r.ok)throw new Error();original=await r.text();drawCode(original);paintAlphabet();resetStory();say('Ready when you are. No student code needed to play.');}catch{say('Could not load main.py. Serve this folder over HTTP, rather than opening the HTML file directly.');}
