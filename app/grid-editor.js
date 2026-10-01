import {labelSVG,round} from './geometry.js';

import {constrainPosition,constrainAnchor} from './positioning.js';
export {constrainPosition,constrainAnchor} from './positioning.js';

// Editor overlays are intentionally excluded from labelSVG and all CAD exports.
export function editorSVG(model,config,selected){
 let svg=labelSVG(model,config,'editor-label');
 if(config.dimensionShow){const e=model.elements.find(e=>e.id===selected);if(e){const x=round(e.x+(e.anchorX||0)),y=round(e.y+(e.anchorY||0)),f=n=>Number(n.toFixed(2));const overlay=`<g id="editor-dimensions" pointer-events="none" fill="#006fbe" stroke="#006fbe" stroke-width=".06"><path d="M0 0 H${x} V${y} M0 ${y} H${x} M${x} 0 V${y}" fill="none" stroke-dasharray=".3 .2"/><circle cx="0" cy="0" r=".16"/><circle cx="${x}" cy="${y}" r=".14"/><path d="M0 -.55 H${x} M-.55 0 V${y} M0 -.8 V-.3 M${x} -.8 V-.3 M-.8 0 H-.3 M-.8 ${y} H-.3" fill="none"/><g stroke="none" font-family="sans-serif" font-size=".8"><text x="${x/2}" y="-1" text-anchor="middle">X ${f(x)} mm</text><text x="-1" y="${y/2}" text-anchor="middle" transform="rotate(-90 -1 ${y/2})">Y ${f(y)} mm</text><text x="0" y="-2.2">0/0: Label oben links · Bezug: ${e.anchorLabel||'Element oben links'}</text></g></g>`;svg=svg.replace(`viewBox="0 0 ${model.W} ${model.H}"`,`viewBox="-3 -3.5 ${model.W+4} ${model.H+4.5}"`).replace('</svg>',overlay+'</svg>');}}
 if(config.layoutMode!=='manual')return svg;
 if(config.gridShow){const step=Number(config.gridStep)||.5;
  const grid=`<defs><pattern id="editor-grid" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M ${step} 0 H 0 V ${step}" fill="none" stroke="#628e9b" stroke-opacity=".45" stroke-width=".04"/></pattern></defs><rect width="${model.W}" height="${model.H}" fill="url(#editor-grid)" pointer-events="none"/>`;
  svg=svg.replace(/(<rect[^>]*\/>)/,'$1'+grid);
 }
 const targets=model.elements.map(e=>`<rect data-element="${e.id}" class="editor-target" x="${e.x}" y="${e.y}" width="${Math.max(e.w,.5)}" height="${Math.max(e.h,.5)}" fill="transparent" stroke="${e.id===selected?'#008569':'transparent'}" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>${e.name} verschieben</title></rect>`).join('');
 return svg.replace('</svg>',targets+'</svg>');
}

export function createGridEditor({$,state,setPositions,setWidth,show2D}){
 let selected='text1',drag=null;
 const host=$('label-preview');
 const names={text1:'Textzeile 1',text2:'Textzeile 2',symbol:'Symbol'};
 const fmt=n=>new Intl.NumberFormat('de-CH',{maximumFractionDigits:2}).format(n);
 function active(){const s=state();return s.ready&&s.model&&s.config.layoutMode==='manual'?s:null;}
 function chosen(s){return s.model.elements.find(e=>e.id===selected);}
 function move(x,y,snap=true){const s=active(),e=s&&chosen(s);if(!e||!Number.isFinite(x)||!Number.isFinite(y))return;
  const step=snap&&s.config.gridSnap?Number(s.config.gridStep):0;
  setPositions({...s.config.positions,[selected]:{x:constrainAnchor(x,s.model.W-e.w,e.anchorX||0,step),y:constrainAnchor(y,s.model.H-e.h,e.anchorY||0,step)}});
 }
 function paint(){const s=state();if(s.model)host.innerHTML=editorSVG(s.model,s.config,selected);}
 function sync(){const s=state(),manual=s.config?.layoutMode==='manual';
  if(document.activeElement!==$('grid-width'))$('grid-width').value=s.config?.width||1;
  $('grid-controls').hidden=!manual;
  $('auto-controls').hidden=manual;
  $('grid-position-controls').hidden=s.view!=='2d'||(!manual&&!s.config?.dimensionShow);
  host.classList.toggle('editable',manual);
  const select=$('grid-element');select.replaceChildren(...(s.model?.elements||[]).map(e=>new Option(names[e.id],e.id)));
  if(!s.model?.elements.some(e=>e.id===selected))selected=s.model?.elements[0]?.id||'text1';
  select.value=selected;const e=s.model?.elements.find(e=>e.id===selected);
  for(const id of ['grid-x','grid-y','grid-element','grid-flush'])$(id).disabled=!e||(id!=='grid-element'&&!manual);
  for(const b of document.querySelectorAll('[data-grid-align]')){b.disabled=!e||!manual;const a=b.dataset.gridAlign,p=s.config?.positions?.[selected];const on=manual&&(p?.alignX===a||p?.alignY===a);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
  $('symbol-reference-control').hidden=selected!=='symbol';
  $('grid-flush').disabled=!manual||!s.model?.elements.some(e=>e.id==='text1')||!s.model?.elements.some(e=>e.id==='text2');
  if(e){$('grid-x-label').textContent=e.reference==='right'?'X bis rechte Kante · mm':e.reference==='center'?'X bis Mitte · mm':'X bis linke Kante · mm';$('grid-y-label').textContent=e.anchorY?'Y bis Mitte · mm':'Y bis obere Kante · mm';$('grid-x').value=round(e.x+(e.anchorX||0));$('grid-y').value=round(e.y+(e.anchorY||0));$('grid-x').max=Math.max(0,s.model.W-e.w+(e.anchorX||0));$('grid-y').max=Math.max(0,s.model.H-e.h+(e.anchorY||0));$('grid-x').min=e.anchorX||0;$('grid-y').min=e.anchorY||0;$('grid-x').step=$('grid-y').step=s.config.gridSnap?s.config.gridStep:.1;
   $('grid-status').textContent=`${names[selected]} · X ${fmt(e.x+(e.anchorX||0))} mm · Y ${fmt(e.y+(e.anchorY||0))} mm${s.model.overlap?' · Elemente überlappen sich.':''}`;
  }else $('grid-status').textContent='Text oder Symbol hinzufügen, um es auszurichten.';
  paint();
 }
 $('grid-width').oninput=()=>{if($('grid-width').checkValidity()&&$('grid-width').value)setWidth(Number($('grid-width').value));};
 $('grid-element').onchange=()=>{selected=$('grid-element').value;sync();};
 for(const id of ['grid-x','grid-y'])$(id).onchange=()=>{const s=active(),e=s&&chosen(s);if(e&&$('grid-x').value&&$('grid-y').value)move(Number($('grid-x').value)-(e.anchorX||0),Number($('grid-y').value)-(e.anchorY||0));};
 for(const button of document.querySelectorAll('[data-grid-align]'))button.onclick=()=>{
  const s=active(),e=s&&chosen(s);if(!e)return;const a=button.dataset.gridAlign;
  const key=['left','center','right'].includes(a)?'alignX':'alignY';
  const previous=s.config.positions?.[selected]||{};
  setPositions({...s.config.positions,[selected]:{...previous,x:e.x,y:e.y,[key]:previous[key]===a?null:a}});

 };
 $('grid-flush').onclick=()=>{const s=active();if(!s)return;const a=s.model.elements.find(e=>e.id==='text1'),b=s.model.elements.find(e=>e.id==='text2');if(!a||!b)return;
  const step=s.config.gridSnap?Number(s.config.gridStep):0;const x=constrainPosition(a.x,s.model.W-Math.max(a.w,b.w),step);selected='text2';setPositions({...s.config.positions,text1:{x,y:constrainPosition(a.y,s.model.H-a.h,step)},text2:{x,y:constrainPosition(b.y,s.model.H-b.h,step)}});
 };
 function point(event){const svg=host.querySelector('svg'),matrix=svg?.getScreenCTM();return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()):null;}
 host.onpointerdown=event=>{const s=active(),target=event.target.closest('[data-element]');if(!s||!target)return;const p=point(event);if(!p)return;
  selected=target.dataset.element;const e=chosen(s);if(!e)return;drag={pointer:event.pointerId,x:p.x,y:p.y,startX:e.x,startY:e.y};host.setPointerCapture(event.pointerId);host.focus({preventScroll:true});event.preventDefault();sync();
 };
 host.onpointermove=event=>{if(!drag||drag.pointer!==event.pointerId)return;const p=point(event);if(p)move(drag.startX+p.x-drag.x,drag.startY+p.y-drag.y);};
 host.onpointerup=host.onpointercancel=()=>{drag=null;};
 host.onkeydown=event=>{const s=active(),e=s&&chosen(s);if(!e||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=s.config.gridSnap?Number(s.config.gridStep):.1;
  move(e.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),e.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));
 };
 $('grid-open-2d').onclick=show2D;
 return{sync,cancel(){drag=null;}};
}
