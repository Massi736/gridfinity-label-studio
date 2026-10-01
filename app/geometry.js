import {constrainAnchor,presetPosition} from './positioning.js';
const LICENSE_NOTICES="Copyright (c) 2024 Nicholas Devenish\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\nRedistributions of source code must retain the above copyright notice, this\nlist of conditions and the following disclaimer.\n\nRedistributions in binary form must reproduce the above copyright notice, this\nlist of conditions and the following disclaimer in the documentation and/or\nother materials provided with the distribution.\n\nNeither the name of the copyright holder nor the names of its\ncontributors may be used to endorse or promote products derived from\nthis software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\" AND\nANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\nWARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR\nANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\nLOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON\nANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS\nSOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\nMIT License\n\nCopyright (c) 2022 Chris Pikul\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n";
export const round=n=>Math.round(n*100000)/100000;
export function bounds(contours){const pts=contours.flat();if(!pts.length)return {x:0,y:0,w:0,h:0};let x=Infinity,y=Infinity,X=-Infinity,Y=-Infinity;for(const p of pts){x=Math.min(x,p[0]);y=Math.min(y,p[1]);X=Math.max(X,p[0]);Y=Math.max(Y,p[1]);}return{x,y,w:X-x,h:Y-y};}
export function transform(cs,s=1,x=0,y=0){return cs.map(c=>c.map(p=>[round(p[0]*s+x),round(p[1]*s+y)]));}
export function pathData(cs){return cs.map(c=>'M'+c.map(p=>p.join(',')).join('L')+'Z').join('');}
export function pathContours(commands){let cs=[],c=[],p=[0,0];for(const q of commands){if(q.type==='M'){if(c.length>2)cs.push(c);c=[[round(q.x),round(q.y)]];p=c[0];}else if(q.type==='L'){p=[round(q.x),round(q.y)];c.push(p);}else if(q.type==='Q'||q.type==='C'){const start=p;const dist=Math.hypot(q.x-start[0],q.y-start[1])+Math.hypot(q.x1-start[0],q.y1-start[1]);const n=Math.max(6,Math.min(64,Math.ceil(dist/.06)));for(let i=1;i<=n;i++){const t=i/n,u=1-t;if(q.type==='Q')p=[u*u*start[0]+2*u*t*q.x1+t*t*q.x,u*u*start[1]+2*u*t*q.y1+t*t*q.y];else p=[u*u*u*start[0]+3*u*u*t*q.x1+3*u*t*t*q.x2+t*t*t*q.x,u*u*u*start[1]+3*u*u*t*q.y1+3*u*t*t*q.y2+t*t*t*q.y];p=p.map(round);c.push(p);}}else if(q.type==='Z'){if(c.length>2)cs.push(c);c=[];}}if(c.length>2)cs.push(c);return cs;}
export function screwGroups(config,parts){
 const read=id=>parts[id]?.contours||[];
 const rawHead=read(`head-${config.fastenerHead}-${config.fastenerFlange}`),driver=read(`driver-${config.fastenerDriver}`),shaft=read(`shaft-${config.fastenerShaft}-${config.fastenerThreads}`);
 // Shorten the countersunk head from 6 to 4 units, keeping its shaft junction at x=-3.
 const countersunk=config.fastenerHead==='countersunk';
 const head=countersunk?rawHead.map(c=>c.map(([x,y])=>[round(-3+(x+3)*2/3),y])):rawHead;
 const inset=cs=>countersunk?transform(cs,.65,-1,0):cs;
 const separate=config.fastenerDriverPosition==='right',groups=[];
 if(head.length)groups.push({contours:head,subtract:separate?[]:inset(driver)});
 if(shaft.length)groups.push({contours:shaft});
 let pinX=0;
 if(separate&&driver.length){
  const body=bounds(groups.flatMap(g=>g.contours));
  const face=read('face-'+config.fastenerDriver),fb=bounds(face);
  const diameter=8,cx=body.x+body.w+1.5+diameter/2;
  pinX=cx;
  if(face.length)groups.push({contours:transform(face,diameter/fb.h,cx-(fb.x+fb.w/2)*diameter/fb.h,-(fb.y+fb.h/2)*diameter/fb.h)});
  else {const circle=[Array.from({length:128},(_,i)=>[round(cx+4*Math.cos(i*2*Math.PI/128)),round(4*Math.sin(i*2*Math.PI/128))])];groups.push({contours:circle,subtract:transform(driver,1,cx,0)});}
 }
 if(config.fastenerSecurity&&driver.length&&(separate||head.length))groups.push({contours:separate?transform(read('driver-security'),1,pinX,0):inset(read('driver-security'))});
 return groups;
}
export function iconGeometry(symbol,config,parts){
 const groups=symbol?.id==='mw-fastener'?screwGroups(config,parts):symbol?(symbol.groups||[{contours:symbol.contours}]):[];
 const b=bounds(groups.flatMap(g=>g.contours));
 const convert=cs=>cs.map(c=>c.map(([x,y])=>[round(config.mirrorX?b.w-(x-b.x):x-b.x),round(config.mirrorY?b.h-(y-b.y):y-b.y)]));
 return{groups:groups.map(g=>({contours:convert(g.contours),subtract:convert(g.subtract||[])})),width:b.w,height:b.h,referenceHeight:symbol?.referenceHeight||b.h};
}
export function textCommands(font,text,size,spacing=0){let x=0,previous=null;const commands=[];for(const ch of text.normalize('NFC')){const glyph=font.charToGlyph(ch);if(previous)x+=font.getKerningValue(previous,glyph)*size/font.unitsPerEm;commands.push(...glyph.getPath(x,0,size).commands);x+=(glyph.advanceWidth||0)*size/font.unitsPerEm+spacing;previous=glyph;}return commands;}
export function layout(config,symbol,parts,fonts){
 const W=round(config.width*42-6),H=config.height,M=config.margin,manual=config.layoutMode==='manual';
 const icon=iconGeometry(symbol,config,parts),hasText=!!(config.text1.trim()||config.text2.trim());
 let iconScale=icon.height?Math.min(config.iconSize/(icon.referenceHeight||icon.height),(H-2*M)/icon.height):0;
 let iw=icon.width*iconScale,ih=icon.height*iconScale;
 const iconLimit=W-2*M-(!manual&&hasText?3:0);
 if(iw>iconLimit){iconScale=Math.max(0,iconLimit/Math.max(icon.width,1));iw=icon.width*iconScale;ih=icon.height*iconScale;}
 const slotWidth=symbol?.alignment==='center'?Math.max(iw,Math.min(config.iconSize,W-2*M)):iw;
 const gap=iw&&hasText?(config.autoGap??1.2):0,tx=M+(config.iconPosition==='left'?slotWidth+gap:0),avail=W-2*M-slotWidth-gap;
 const lineGap=config.autoLineGap??.9;
 let unsupported=false,scale=1,clamped=false;
 const elements=[];
 const lines=[
  {id:'text1',name:'Textzeile 1',text:config.text1,size:config.fontSize,family:config.fontFamily||'OpenSans',style:config.fontStyle,align:config.align,spacing:config.letterSpacing||0},
  {id:'text2',name:'Textzeile 2',text:config.text2,size:config.fontSize2,family:config.fontFamily2||config.fontFamily||'OpenSans',style:config.fontStyle2||config.fontStyle,align:config.align2||config.align,spacing:config.letterSpacing2||0}
 ].filter(l=>l.text.trim()).map(line=>{
  const font=fonts[line.family+':'+line.style]||fonts[line.style];
  for(const ch of line.text)if(!/\s/.test(ch)&&font.charToGlyphIndex(ch)===0)unsupported=true;
  const cs=pathContours(textCommands(font,line.text,line.size,line.spacing)),b=bounds(cs);
  return{...line,cs:transform(cs,1,-b.x,-b.y),w:b.w,h:b.h};
 });
 function add(id,name,groups,x,y){
  const local=bounds(groups.flatMap(g=>g.contours));
  const ref=id==='symbol'?(config.symbolReference||(symbol?.alignment==='center'?'center':'left')):'left';const ax=ref==='center'?local.w/2:ref==='right'?local.w:0,ay=id==='symbol'?local.h/2:0;
  if(manual){const p=config.positions?.[id];let px=Number.isFinite(p?.x)?p.x:x,py=Number.isFinite(p?.y)?p.y:y;
   const presetX=presetPosition(p?.alignX,W,local.w,M),presetY=presetPosition(p?.alignY,H,local.h,M);
   if(presetX!==null)px=constrainAnchor(presetX,W-local.w,ax,config.gridSnap?Number(config.gridStep):0);
   if(presetY!==null)py=constrainAnchor(presetY,H-local.h,ay,config.gridSnap?Number(config.gridStep):0);
   x=round(Math.max(0,Math.min(W-local.w,px)));y=round(Math.max(0,Math.min(H-local.h,py)));clamped ||= Math.abs(x-px)>.0001||Math.abs(y-py)>.0001;}
  const color=id==='text1'?(config.text1Color||config.textColor):id==='text2'?(config.text2Color||config.textColor):config.textColor;
  const placed=groups.map(g=>({color,contours:transform(g.contours,1,x-local.x,y-local.y),subtract:transform(g.subtract||[],1,x-local.x,y-local.y)}));
  const box=bounds(placed.flatMap(g=>g.contours));elements.push({id,name,color,groups:placed,...box,anchorX:ax,anchorY:ay,reference:ref,anchorLabel:id==='symbol'?({left:'Symbol links, halbe Höhe',center:'Symbolmitte',right:'Symbol rechts, halbe Höhe'})[ref]:'Element oben links'});
 }
 if(manual){
  let y=M;
  for(const line of lines){const f=Math.max(0,Math.min(1,(W-2*M)/Math.max(line.w,.001),(H-2*M)/Math.max(line.h,.001)));scale=Math.min(scale,f);
   add(line.id,line.name,[{contours:transform(line.cs,f)}],M,y);y+=line.h*f+.9;}
 }else{
  const maxw=Math.max(0,...lines.map(l=>l.w)),totalh=lines.reduce((a,l)=>a+l.h,0)+Math.max(0,lines.length-1)*lineGap;
  if(maxw&&totalh)scale=Math.max(0,Math.min(1,avail/maxw,(H-2*M)/totalh));
  let y=config.autoTextVertical==='top'?M:config.autoTextVertical==='bottom'?H-M-totalh*scale:(H-totalh*scale)/2;
  for(const line of lines){const blockWidth=config.text2AlignStart&&lines.length===2?maxw:line.w;
   const align=config.text2AlignStart&&lines.length===2?lines[0].align:line.align;
   const x=tx+(align==='center'?(avail-blockWidth*scale)/2:align==='right'?avail-blockWidth*scale:0);
   add(line.id,line.name,[{contours:transform(line.cs,scale)}],x,y);y+=line.h*scale+lineGap*scale;}
 }
 if(iw){const x=hasText?(config.iconPosition==='left'?M+(slotWidth-iw)/2:W-M-(slotWidth+iw)/2):(W-iw)/2;
  add('symbol','Symbol',icon.groups.map(g=>({contours:transform(g.contours,iconScale),subtract:transform(g.subtract||[],iconScale)})),x,!manual&&config.autoIconVertical==='top'?M:!manual&&config.autoIconVertical==='bottom'?H-M-ih:(H-ih)/2);}
 let overlap=false;
 if(manual)for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){const a=elements[i],b=elements[j];if(a.x+a.w>b.x+.02&&b.x+b.w>a.x+.02&&a.y+a.h>b.y+.02&&b.y+b.h>a.y+.02)overlap=true;}
 const groups=elements.flatMap(e=>e.groups);
 return{W,H,groups,elements,scale,unsupported,clamped,overlap,empty:!groups.length,iconShrunk:icon.height>0&&iconScale*(icon.referenceHeight||icon.height)<config.iconSize-.001};
}
export function groupsSVG(groups,color='#202b30',prefix='shape'){return groups.map((g,i)=>{const d=pathData(g.contours);const ink=g.color||color;if(!g.subtract?.length)return `<path d="${d}" fill="${ink}" fill-rule="evenodd"/>`;const b=bounds(g.contours);return `<defs><mask id="${prefix}-${i}" maskUnits="userSpaceOnUse" x="${b.x-1}" y="${b.y-1}" width="${b.w+2}" height="${b.h+2}"><path d="${d}" fill="white" fill-rule="evenodd"/><path d="${pathData(g.subtract)}" fill="black" fill-rule="evenodd"/></mask></defs><path d="${d}" fill="${ink}" fill-rule="evenodd" mask="url(#${prefix}-${i})"/>`;}).join('');}
export function labelSVG(model,config,prefix="label"){return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.W}mm" height="${model.H}mm" viewBox="0 0 ${model.W} ${model.H}"><title>Gridfinity Cullenect V2 Label</title><rect width="${model.W}" height="${model.H}" rx="0.5" fill="${config.baseColor}"/>${groupsSVG(model.groups,config.textColor,prefix)}</svg>`;}
function polygonSCAD(cs){const points=[],paths=[];for(let c of cs){c=c.filter((p,i)=>!i||p[0]!==c[i-1][0]||p[1]!==c[i-1][1]);if(c.length>2&&c[0][0]===c.at(-1)[0]&&c[0][1]===c.at(-1)[1])c=c.slice(0,-1);if(c.length<3)continue;paths.push(c.map((_,i)=>points.length+i));points.push(...c);}return points.length?`polygon(points=${JSON.stringify(points)},paths=${JSON.stringify(paths)},convexity=20);`:'';}
export function makeSCAD(model,c,original,part='all'){let source=original.replace(/selected_model\(\);\s*$/,'');const values={gridfinity:false,labelXmm:model.W,labelYmm:model.H,labelZmm:c.thickness,label_width:c.width,backward_compatible:c.v1,Text1:'',Text2:'',layer:c.layer};for(const [key,val] of Object.entries(values))source=source.replace(new RegExp('^'+key+'\\s*=.*?;','m'),key+' = '+JSON.stringify(val)+';');const v1=c.v1&&c.width===1&&c.height===11&&c.thickness===1.2;const allGroups=model.groups;const selectedGroups=part.startsWith('color-')?allGroups.filter(g=>(g.color||c.textColor).toLowerCase()===part.slice(6)):allGroups;const flat=allGroups.map(g=>g.subtract?.length?`difference(){${polygonSCAD(g.contours)}${polygonSCAD(g.subtract)}}`:polygonSCAD(g.contours)).join('\n');const coloredFlat=selectedGroups.map(g=>g.subtract?.length?`difference(){${polygonSCAD(g.contours)}${polygonSCAD(g.subtract)}}`:polygonSCAD(g.contours)).join('\n');const previewInks=[...new Set(allGroups.map(g=>g.color||c.textColor))].map(color=>{const shapes=allGroups.filter(g=>(g.color||c.textColor)===color).map(g=>g.subtract?.length?`difference(){${polygonSCAD(g.contours)}${polygonSCAD(g.subtract)}}`:polygonSCAD(g.contours)).join('\n');return `color(${JSON.stringify(color)})translate([0,0,${c.surface==='emboss'?c.thickness-.001:c.thickness-c.layer}])linear_extrude(height=${c.layer+(c.surface==='emboss'?.001:0)})translate([0,${model.H},0])mirror([0,1,0])union(){${shapes}}`;}).join('\n');return `// Gridfinity Label Studio\n// Cullenect V2 geometry: supplied MakerWorld SCAD by Cullen J Webb.\n// Symbols derived from gflabel (BSD-3-Clause) / Chris Pikul (MIT),\n// or supplied MakerWorld file. See Sources & Licenses in the editor.\n// Text is embedded as contours; no installed fonts or imports needed.\n// For flush printing export Part=\"base\" and Part=\"text\" separately,\n// then import both STLs together as parts of one object in your slicer.\n/* ${LICENSE_NOTICES} */\nPart=${JSON.stringify(part)}; // [all,base,text]\n${source}\nmodule studio_base(){${v1?'cullenect_base_v1();':'cullenect_base_v2();'}}\nmodule studio_face(){translate([0,${model.H},0])mirror([0,1,0])union(){${flat}}}\nmodule studio_color_face(){translate([0,${model.H},0])mirror([0,1,0])union(){${coloredFlat}}}\nmodule studio_text(){translate([0,0,${c.surface==='emboss'?c.thickness-((part==='text'||part.startsWith('color-'))?0:.001):c.thickness-c.layer}])linear_extrude(height=${c.layer+(c.surface==='emboss'&&part!=='text'&&!part.startsWith('color-')?.001:0)})${part.startsWith('color-')?'studio_color_face':'studio_face'}();}\nmodule studio_cut(){translate([0,0,${c.thickness-c.layer}])linear_extrude(height=${c.layer+.002})studio_face();}\nmodule studio_background(){${c.surface==='emboss'?'studio_base();':'difference(){studio_base();studio_cut();}'}}\nif(Part=="base")studio_background();\nelse if(Part=="text"||${part.startsWith('color-')?'true':'false'})studio_text();\nelse {color(${JSON.stringify(c.baseColor)})studio_background();${c.surface==='deboss'?'':previewInks}}\n`;}
