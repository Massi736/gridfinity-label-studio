// View-only camera: label geometry and exported dimensions stay unchanged.
export function createPreview2D($) {
 const viewport=$('preview-2d-viewport'),stage=viewport.querySelector('.label-stage');
 let zoom=1,x=0,y=0,drag=null;
 function paint(){
  stage.style.transform=`translate(${x}px, ${y}px) scale(${zoom})`;
  $('preview-scale').textContent=`${Math.round(zoom*100)} %`;
  $('zoom-2d-minus').disabled=zoom<=.5;
  $('zoom-2d-plus').disabled=zoom>=8;
 }
 function change(factor,point={x:0,y:0}){
  const next=Math.max(.5,Math.min(8,zoom*factor)),ratio=next/zoom;
  x=point.x-(point.x-x)*ratio;y=point.y-(point.y-y)*ratio;zoom=next;paint();
 }
 function reset(){zoom=1;x=y=0;paint();}
 $('zoom-2d-plus').onclick=()=>change(1.25);
 $('zoom-2d-minus').onclick=()=>change(.8);
 $('zoom-2d-reset').onclick=reset;
 viewport.addEventListener('wheel',event=>{
  event.preventDefault();
  const rect=viewport.getBoundingClientRect();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
  change(Math.exp(-Math.max(-300,Math.min(300,delta))*.002),{x:event.clientX-rect.left-rect.width/2,y:event.clientY-rect.top-rect.height/2});
 },{passive:false});
 viewport.addEventListener('pointerdown',event=>{
  if(event.button!==0&&event.button!==1)return;
  // Primary dragging on an editor target continues to move that element.
  if(event.button===0&&event.target.closest('[data-element]'))return;
  event.preventDefault();event.stopPropagation();
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x,y};
  viewport.setPointerCapture(event.pointerId);viewport.classList.add('panning');
 },{capture:true});
 viewport.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  x=drag.x+event.clientX-drag.startX;y=drag.y+event.clientY-drag.startY;paint();
 });
 function end(event){if(!drag||drag.id!==event.pointerId)return;drag=null;viewport.classList.remove('panning');}
 for(const name of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(name,end);
 viewport.addEventListener('dblclick',event=>{if(!event.target.closest('[data-element]'))reset();});
 $('preview-2d').addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  if(event.key==='+'||event.key==='='){event.preventDefault();change(1.25);}
  if(event.key==='-'){event.preventDefault();change(.8);}
  if(event.key==='0'){event.preventDefault();reset();}
 });
 paint();
 return {reset};
}
