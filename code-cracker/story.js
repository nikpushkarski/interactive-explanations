// Letter-sized moments extracted from real Python state, never a second cipher implementation.
export function storyFrames(trace) {
 const frames=[];
 let previous='',group='',shift=null,message='';
 for(let index=0;index<trace.events.length;index++){
  const e=trace.events[index],v=e.values;
  if(!['encode','decode'].includes(e.function)||v.message===undefined)continue;
  const key=`${e.function}:${v.n}:${v.message}`;
  if(key!==group){group=key;previous='';shift=v.n;message=v.message;frames.push({index,kind:'shift',shift,message,result:''});}
  if(v.result!==undefined&&v.result!==previous){
   const result=v.result;
   const appended=result.startsWith(previous)&&result.length===previous.length+1;
   const letterIndex=v.i!==undefined&&Number.isInteger(Number(v.i))?Number(v.i):previous.length;
   const from=v.letter??message[letterIndex];
   frames.push({index,kind:appended?'letter':'message',shift,message,result,from:appended?from:null,to:appended?result.at(-1):null,letterIndex});
   previous=result;
  }
 }
 const end=trace.events.length-1;
 if(end>=0)frames.push({index:end,kind:'done',shift,message,result:typeof trace.result==='string'?trace.result:previous});
 return frames;
}
export function followingMoment(trace,pos,shiftOnly=false){
 const frames=trace.story||storyFrames(trace);
 return frames.find(f=>f.index>pos&&(!shiftOnly||f.kind==='shift'||f.kind==='done'))?.index??Math.max(0,trace.events.length-1);
}
