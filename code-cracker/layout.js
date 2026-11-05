const $=id=>document.getElementById(id);
const wide=matchMedia('(min-width: 1020px)');
let view='default',share=50,defaultOpen=false;
try {
 view=localStorage.getItem('cracker-view')==='dense'?'dense':'default';
 const saved=Number(localStorage.getItem('cracker-panel-width'));
 if(saved>=35&&saved<=65)share=saved;
} catch { /* Layout preferences are optional when storage is unavailable. */ }
function save(){try{localStorage.setItem('cracker-view',view);localStorage.setItem('cracker-panel-width',String(share));}catch{}}
function resize(value){
 share=Math.max(35,Math.min(65,Math.round(value)));
 $('workbench').style.setProperty('--machine-share',`${share}%`);
 $('panelWidth').value=share;
 $('widthValue').textContent=`${share} / ${100-share}`;
 $('panelDivider').setAttribute('aria-valuenow',String(share));
 $('panelDivider').setAttribute('aria-valuetext',`Animation ${share} percent, code ${100-share} percent`);
 save();
}
function apply(){
 document.body.dataset.view=view;
 const dense=view==='dense';
 $('viewDefault').setAttribute('aria-pressed',String(!dense));
 $('viewDense').setAttribute('aria-pressed',String(dense));
 $('widthControl').hidden=!dense||!wide.matches;
 $('panelDivider').hidden=!dense||!wide.matches;
 $('codeDrawer').open=dense||defaultOpen;
 $('codeDrawer').querySelector('summary').setAttribute('aria-disabled',String(dense));
 resize(share);
}
export function syncCodeDrawer(open){defaultOpen=open;$('codeDrawer').open=view==='dense'||open;}
$('codeDrawer').querySelector('summary').addEventListener('click',e=>{if(view==='dense')e.preventDefault();});
$('codeDrawer').addEventListener('toggle',()=>{
 if(view==='dense'&&!$('codeDrawer').open)$('codeDrawer').open=true;
 else if(view==='default')defaultOpen=$('codeDrawer').open;
});
$('viewDefault').addEventListener('click',()=>{view='default';apply();});
$('viewDense').addEventListener('click',()=>{if(view==='default')defaultOpen=$('codeDrawer').open;view='dense';apply();});
$('resetView').addEventListener('click',()=>{
 stop();view='default';share=50;apply();
 $('speed').value='5';$('speed').dispatchEvent(new Event('input'));
});
$('panelWidth').addEventListener('input',e=>resize(Number(e.target.value)));
$('panelDivider').addEventListener('keydown',e=>{
 let value=share;
 if(e.key==='ArrowLeft')value-=2;
 else if(e.key==='ArrowRight')value+=2;
 else if(e.key==='Home')value=35;
 else if(e.key==='End')value=65;
 else return;
 e.preventDefault();resize(value);
});
let dragging=false;
const divider=$('panelDivider');
function move(e){if(!dragging)return;const rect=$('workbench').getBoundingClientRect();resize(100*(e.clientX-rect.left)/rect.width);}
divider.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;divider.setPointerCapture(e.pointerId);document.body.classList.add('resizing-panels');move(e);});
divider.addEventListener('pointermove',move);
function stop(){dragging=false;document.body.classList.remove('resizing-panels');}
divider.addEventListener('pointerup',stop);
divider.addEventListener('pointercancel',stop);
divider.addEventListener('lostpointercapture',stop);
wide.addEventListener('change',()=>{stop();apply();});
apply();
