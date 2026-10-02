const THEME=['#ffffff','#000000','#e7e6e6','#44546a','#5b9bd5','#ed7d31','#a5a5a5','#ffc000','#4472c4','#70ad47'];
const STANDARD=['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0'];
export function normalizeColor(value){const hex=value.trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(hex))return '#'+[...hex].map(c=>c+c).join('').toLowerCase();return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toLowerCase():null;}
function blend(hex,amount){return '#'+[1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16);return Math.round(c+(amount>=0?255-c:c)*amount).toString(16).padStart(2,'0');}).join('');}
export const DESIGN_COLORS=[...THEME,...[.8,.6,.4,-.25,-.5].flatMap((amount,row)=>THEME.map((c,col)=>col===0?blend(c,-[.05,.15,.25,.35,.5][row]):col===1?blend(c,[.5,.35,.25,.15,.05][row]):blend(c,amount)))];
export function createColorPalettes($,ids){
 const names={baseColor:'Label',textColor:'Symbol',text1Color:'Textzeile 1',text2Color:'Textzeile 2'};
 const controls=new Map();let source=null,trigger=null,recent=[];
 try{recent=JSON.parse(localStorage.getItem('gridfinity-recent-colors')||'[]').filter(c=>typeof c==='string'&&normalizeColor(c)).map(normalizeColor).slice(0,10);}catch{}
 const popup=document.createElement('div');popup.className='color-palette';popup.hidden=true;popup.id='color-palette';popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Farbe auswählen');
 const heading=document.createElement('strong');heading.className='palette-title';popup.append(heading);
 function group(title,colors){
  const section=document.createElement('div');section.className='palette-section';
  const label=document.createElement('p');label.textContent=title;const grid=document.createElement('div');grid.className='palette-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',title);
  for(const color of colors){const button=document.createElement('button');button.type='button';button.className='color-swatch';button.dataset.color=color;button.style.backgroundColor=color;button.title=color.toUpperCase();button.setAttribute('aria-label','Farbe '+color.toUpperCase());button.onclick=()=>choose(color);grid.append(button);}
  section.append(label,grid);return section;
 }
 popup.append(group('Designfarben',DESIGN_COLORS),group('Standardfarben',STANDARD));
 const recentHost=document.createElement('div');popup.append(recentHost);
 const custom=document.createElement('div');custom.className='palette-custom';
 const label=document.createElement('label');label.textContent='Eigene Farbe · HEX';const hex=document.createElement('input');hex.type='text';hex.maxLength=7;hex.placeholder='#126B5E';hex.setAttribute('aria-label','Eigene Farbe als HEX-Code');label.append(hex);
 const apply=document.createElement('button');apply.type='button';apply.className='secondary-button';apply.textContent='Übernehmen';apply.onclick=()=>{const color=normalizeColor(hex.value);if(color)choose(color);else{hex.setAttribute('aria-invalid','true');hex.setCustomValidity('Bitte einen HEX-Code mit 3 oder 6 Stellen eingeben.');hex.reportValidity();}};
 hex.oninput=()=>{hex.removeAttribute('aria-invalid');hex.setCustomValidity('');};hex.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();apply.click();}};
 custom.append(label,apply);popup.append(custom);document.body.append(popup);
 function syncSwatches(){const value=source?.value.toLowerCase();for(const b of popup.querySelectorAll('[data-color]')){const selected=b.dataset.color===value;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('selected',selected);}}
 function close(focus=false){popup.hidden=true;if(trigger){trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}source=trigger=null;}
 function choose(color){
  if(!source)return;source.value=color;source.dispatchEvent(new Event('input',{bubbles:true}));
  recent=[color,...recent.filter(c=>c!==color)].slice(0,10);try{localStorage.setItem('gridfinity-recent-colors',JSON.stringify(recent));}catch{}
  sync();close(true);
 }
 function open(input,button){
  if(source===input&&!popup.hidden){close(true);return;}close();source=input;trigger=button;
  heading.textContent='Farbe · '+names[input.id];hex.value=input.value.toUpperCase();hex.removeAttribute('aria-invalid');hex.setCustomValidity('');
  recentHost.replaceChildren();if(recent.length)recentHost.append(group('Zuletzt verwendet',recent));syncSwatches();popup.hidden=false;button.setAttribute('aria-expanded','true');
  const rect=button.getBoundingClientRect(),width=Math.min(286,window.innerWidth-24);popup.style.width=width+'px';
  popup.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
  const height=popup.getBoundingClientRect().height;popup.style.top=Math.max(12,rect.bottom+height+8<=window.innerHeight?rect.bottom+8:rect.top-height-8)+'px';
  (popup.querySelector('.color-swatch.selected')||popup.querySelector('.color-swatch')).focus();
 }
 for(const id of ids){
  const input=$(id);input.type='hidden';input.hidden=true;
  const wrapper=document.createElement('div');wrapper.className='color-picker';const button=document.createElement('button');button.type='button';button.className='color-trigger';button.setAttribute('aria-label',names[id]+'farbe auswählen');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',popup.id);
  const swatch=document.createElement('span');swatch.className='current-color';swatch.setAttribute('aria-hidden','true');const arrow=document.createElement('span');arrow.textContent='▾';arrow.setAttribute('aria-hidden','true');button.append(swatch,arrow);button.onclick=event=>{event.preventDefault();open(input,button);};wrapper.append(button);input.after(wrapper);controls.set(id,{input,button,swatch});
 }
 function sync(){for(const {input,button,swatch} of controls.values()){swatch.style.backgroundColor=input.value;button.title=input.value.toUpperCase();}if(source)syncSwatches();}
 document.addEventListener('click',event=>{if(!popup.hidden&&!popup.contains(event.target)&&![...controls.values()].some(c=>c.button.contains(event.target)))close();});
 popup.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close(true);return;}
  const current=event.target.closest('.color-swatch');if(!current)return;const buttons=[...current.parentElement.querySelectorAll('button')],index=buttons.indexOf(current);
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-10,ArrowDown:10}[event.key];if(offset!==undefined){event.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,index+offset))].focus();}
 });
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!popup.contains(event.target))close();},{capture:true});
 sync();return {sync,close};
}
