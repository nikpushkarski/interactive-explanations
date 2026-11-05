import test from 'node:test';
import assert from 'node:assert/strict';
import {storyFrames,followingMoment} from '../code-cracker/story.js';
const event=(values,kind='line')=>({function:'decode',values,kind});
test('visual moments use observed letters, including incorrect results',()=>{
 const trace={events:[event({message:'a!',n:'-1'}),event({message:'a!',n:'-1',result:''}),event({message:'a!',n:'-1',result:'z'}),event({message:'a!',n:'-1',result:'zy'}),event({message:'a!',n:'-1',result:'zy'},'return')],result:'zy'};
 const frames=storyFrames(trace);assert.equal(frames[0].kind,'shift');assert.equal(frames[1].from,'a');assert.equal(frames[1].to,'z');assert.equal(frames[2].from,'!');assert.equal(frames[2].to,'y');assert.equal(frames.at(-1).result,'zy');assert.equal(followingMoment(trace,0),2);
});
test('next shift skips instruction-level events',()=>{
 const trace={events:[event({message:'ab',n:'-1',result:''}),event({message:'ab',n:'-1',result:'z'}),event({message:'ab',n:'-2',result:''}),event({message:'ab',n:'-2',result:'y'})]};
 assert.equal(followingMoment(trace,0,true),2);
});
test('whole-message edits and empty traces degrade without invented letters',()=>{
 const trace={events:[event({message:'abc',n:'2',result:''}),event({message:'abc',n:'2',result:'hello'})],result:'hello'};
 assert.equal(storyFrames(trace)[1].kind,'message');assert.deepEqual(storyFrames({events:[]}),[]);
});
