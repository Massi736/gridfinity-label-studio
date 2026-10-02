import {makeZip} from './zip.js';
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function parseSTL(stl){const vertices=[],triangles=[],map=new Map();const points=stl.matchAll(/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g);let tri=[];for(const p of points){const v=[+p[1],+p[2],+p[3]].map(x=>Math.round(x*1e6)/1e6);if(v.some(x=>!Number.isFinite(x)))throw Error('Ungültige 3D-Koordinaten.');const key=v.join(',');let index=map.get(key);if(index===undefined){index=vertices.length;map.set(key,index);vertices.push(v);}tri.push(index);if(tri.length===3){if(new Set(tri).size===3)triangles.push(tri);tri=[];}}if(tri.length||!triangles.length)throw Error('Das 3D-Modell ist leer oder unvollständig.');return{vertices,triangles};}
export function arrange(items,width=220,gap=4){const result=[];let x=0,y=0,row=0;for(const item of items){for(let n=0;n<item.copies;n++){if(x>0&&x+item.model.W>width){x=0;y+=row+gap;row=0;}result.push({...item,x,y,copy:n+1});x+=item.model.W+gap;row=Math.max(row,item.model.H);}}return result;}
export function make3MF(instances){
 let next=2;
 const colorGroupId=1,resources=[],build=[],colors=new Map(),groups=new Map();
 function colorIndex(color){
  if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Ungültige Farbe.');
  const normalized=color.toUpperCase();
  if(!colors.has(normalized))colors.set(normalized,colors.size);
  return colors.get(normalized);
 }
 for(const item of instances){
  const key=item.key+'|'+item.config.baseColor+'|'+item.config.textColor;
  let root=groups.get(key);
  if(!root){
   const components=[];
   for(const part of item.meshes){
    const id=next++,index=colorIndex(part.color),m=part.mesh;
    // Bambu Studio's standard 3MF importer reads m:colorgroup, rather than
    // core basematerials. Explicit triangle properties also preserve each
    // part's color when a slicer combines the component meshes.
    resources.push(`<object id="${id}" type="model" name="${xml(item.name+' · '+part.name)}" pid="${colorGroupId}" pindex="${index}"><mesh><vertices>${m.vertices.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${m.triangles.map(t=>`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" pid="${colorGroupId}" p1="${index}" p2="${index}" p3="${index}"/>`).join('')}</triangles></mesh></object>`);
    components.push(`<component objectid="${id}"/>`);
   }
   root=next++;
   resources.push(`<object id="${root}" type="model" name="${xml(item.name)}"><components>${components.join('')}</components></object>`);
   groups.set(key,root);
  }
  build.push(`<item objectid="${root}" transform="1 0 0 0 1 0 0 0 1 ${item.x} ${item.y} 0"/>`);
 }
 const palette=`<m:colorgroup id="${colorGroupId}">${[...colors.keys()].map(color=>`<m:color color="${color}FF"/>`).join('')}</m:colorgroup>`;
 const model=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="de-DE" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" requiredextensions="m"><metadata name="Title">Gridfinity Labels</metadata><metadata name="Application">Gridfinity Label Studio</metadata><resources>${palette}${resources.join('')}</resources><build>${build.join('')}</build></model>`;
 return makeZip({
  '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
  '3D/3dmodel.model':model
 });
}
