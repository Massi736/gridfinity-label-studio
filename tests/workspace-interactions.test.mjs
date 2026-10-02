import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorkspaceStore,profileFrom} from '../app/workspace-store.js';
import {createGridEditor} from '../app/grid-editor.js';

// Small DOM adapter for storage/controller tests; these are not visual tests.
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.value='';this.style={setProperty(){}};this.classList={toggle(){}};}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 get childElementCount(){return this.children.length;}
 get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1];}
 get previousElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)-1];}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(){}
 dispatchEvent(){}
 focus(){}
 querySelectorAll(selector){const all=[];const visit=n=>{for(const c of n.children){all.push(c);visit(c);}};visit(this);return all.filter(n=>selector==='optgroup option'?n.tagName==='OPTION'&&n.parentElement.tagName==='OPTGROUP':n.tagName===selector.toUpperCase());}
}
class OptionElement extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Folder deletion preserves an active edited project and updates its save revision',async()=>{
 const originals={document:globalThis.document,window:globalThis.window,Option:globalThis.Option,fetch:globalThis.fetch};
 const ids=[...readFileSync(new URL('../app/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 globalThis.document={querySelector:()=>new Element('main'),createElement:tag=>new Element(tag)};globalThis.Option=OptionElement;
 let confirmation=false,deleteCount=0,saved=false;
 globalThis.window={addEventListener(){},confirm:message=>{assert.match(message,/Unterordner/);assert.match(message,/Labels bleiben erhalten/);return confirmation;}};
 const records={folders:Object.fromEntries([['parent',''],['remove','parent'],['child','remove']].map(([id,parentId])=>[id,{id,name:id,revision:1,data:{schema:1,parentId}}])),projects:{p:{id:'p',name:'M3',revision:1,data:{schema:1,folderId:'child',items:[{id:1,copies:1,config:{text1:'M3'}}]}}},profiles:{}};
 globalThis.fetch=async(path,options={})=>{
  const [,kind,id]=path.slice(1).split('/');let result;
  if(options.method==='DELETE'){
   assert.equal(kind,'folders');assert.equal(id,'remove');assert.equal(JSON.parse(options.body).revision,1);deleteCount++;
   delete records.folders.remove;delete records.folders.child;records.projects.p.data.folderId='parent';records.projects.p.revision=2;
   result={deleted:true,removedFolderIds:['remove','child'],destinationId:'parent',movedProjects:[{id:'p',name:'M3',folderId:'parent',revision:2}]};
  }else if(options.method==='PUT'){
   const body=JSON.parse(options.body);assert.equal(id,'p');assert.equal(body.revision,2);assert.equal(body.data.folderId,'parent');assert.equal(body.data.items[0].config.text1,'Edited M3');saved=true;
   records.projects.p={id,name:body.name,revision:3,data:body.data};result={entry:records.projects.p};
  }else if(kind==='capabilities')result={documentDelete:true,folderDelete:true};
  else if(id)result={entry:structuredClone(records[kind][id])};
  else result={entries:Object.values(records[kind]).map(e=>({id:e.id,name:e.name,revision:e.revision,folderId:e.data.folderId||'',parentId:e.data.parentId||''}))};
  return {ok:true,json:async()=>result};
 };
 let snapshot;
 try{
  const store=createWorkspaceStore({$:id=>elements[id],getProject:()=>snapshot,getProfile:()=>profileFrom({layoutMode:'auto'}),applyProject:data=>{snapshot=data;},applyProfile(){},newProject(){throw Error('Folder deletion must preserve the editor');}});
  await store.init();assert.equal(elements['folder-delete'].disabled,true);
  for(const id of ['parent','remove','child','p']){
   const row=elements['explorer-list'].children.find(r=>r.dataset.id===id);row.onclick();await elements['project-open'].onclick();
  }
  assert.equal(elements['folder-delete'].disabled,true);
  snapshot.items[0].config.text1='Edited M3';store.changed();
  elements['folder-breadcrumbs'].children[2].onclick();assert.equal(elements['folder-delete'].disabled,false);
  await elements['folder-delete'].onclick();assert.equal(deleteCount,0);assert.ok(records.folders.child);
  confirmation=true;await elements['folder-delete'].onclick();assert.equal(deleteCount,1);
  assert.equal(records.folders.remove,undefined);assert.equal(elements['project-folder'].value,'parent');
  assert.deepEqual(elements['explorer-list'].children.map(r=>r.dataset.id),['p']);
  assert.equal(elements['project-folder'].children.some(o=>['remove','child'].includes(o.value)),false);
  assert.equal(elements['folder-breadcrumbs'].children.length,2);assert.match(elements['project-status'].textContent,/1 Projekte verschoben/);
  await elements['project-save'].onclick();assert.equal(saved,true);
  elements['folder-breadcrumbs'].children[0].onclick();assert.equal(elements['folder-delete'].disabled,true);
 }finally{Object.assign(globalThis,originals);}
});

test('Explorer navigation, profile edit lock and confirmed deletion keep the right project state',async()=>{
 const originals={document:globalThis.document,window:globalThis.window,Option:globalThis.Option,fetch:globalThis.fetch};
 const ids=[...readFileSync(new URL('../app/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id.includes('select')||['project-list','project-folder','layoutMode'].includes(id)?'select':'div')]));
 const main=new Element('main');globalThis.document={querySelector:()=>main,createElement:tag=>new Element(tag)};let confirmation=true;const listeners={};globalThis.window={addEventListener:(name,fn)=>{listeners[name]=fn;},confirm:()=>confirmation};globalThis.Option=OptionElement;
 const records={folders:{tools:{id:'tools',name:'Werkstatt',data:{schema:1,parentId:''},revision:1}},projects:{p:{id:'p',name:'M3',data:{schema:1,folderId:'tools',items:[{id:1,copies:1,config:{text1:'M3'}}]},revision:1}},profiles:{preset:{id:'preset',name:'Schrauben',data:{schema:1,layout:{layoutMode:'manual',width:2,positions:{}}},revision:1}}};
 globalThis.fetch=async(path,options={})=>{
  const [,kind,id]=path.slice(1).split('/');if(kind==='capabilities')return {ok:true,json:async()=>({documentDelete:true,folderDelete:true})};if(!id&&((kind==='projects'&&!records.projects.p)||(kind==='profiles'&&!records.profiles.preset)))throw Error('Simulated list reload failure after delete');const entry=records[kind]?.[id];let result;
  if(options.method==='DELETE'){assert.equal(JSON.parse(options.body).revision,entry.revision);delete records[kind][id];result={deleted:true};}
  else if(id)result={entry:structuredClone(entry)};
  else result={entries:Object.values(records[kind]).map(e=>({id:e.id,name:e.name,revision:e.revision,folderId:e.data.folderId||'',parentId:e.data.parentId||''}))};
  return {ok:true,json:async()=>result};
 };
 let config={layoutMode:'auto',width:1,positions:{}},snapshot={},newCount=0;
 try{
  const store=createWorkspaceStore({$:id=>{assert.ok(elements[id],id);return elements[id];},getProject:()=>snapshot,getProfile:()=>profileFrom(config),applyProfile:data=>{config={...config,...data.layout};},applyProject:data=>{snapshot=data;},newProject:()=>{newCount++;snapshot={schema:1,items:[]};}});
  await store.init();
  const folderRow=elements['explorer-list'].children[0];folderRow.onclick();await elements['project-open'].onclick();
  assert.equal(elements['explorer-list'].children.length,1);assert.equal(elements['explorer-list'].children[0].dataset.id,'p');
  elements['explorer-list'].children[0].onclick();await elements['project-open'].onclick();assert.equal(snapshot.items[0].config.text1,'M3');
  elements['arrangement-select'].value='profile:preset';elements['arrangement-select'].onchange();await flush();assert.equal(store.isProfileLocked(),true);assert.equal(config.width,2);
  elements['profile-edit'].onclick();assert.equal(store.isProfileLocked(),false);assert.equal(store.isProfileEditing(),true);
  elements['profile-edit'].onclick();assert.equal(store.isProfileLocked(),true);
  confirmation=false;await elements['profile-delete'].onclick();assert.ok(records.profiles.preset);assert.equal(store.isProfileLocked(),true);
  confirmation=true;await elements['profile-delete'].onclick();assert.equal(records.profiles.preset,undefined);assert.equal(store.isProfileLocked(),false);assert.ok(records.projects.p);assert.equal(config.width,2);
  confirmation=false;await elements['project-delete'].onclick();assert.ok(records.projects.p);assert.equal(newCount,0);
  confirmation=true;await elements['project-delete'].onclick();assert.equal(records.projects.p,undefined);assert.equal(newCount,1);assert.ok(records.folders.tools);assert.equal(elements['project-delete'].disabled,true);
  listeners.beforeunload({preventDefault(){throw Error('A deleted active project must not remain dirty');}});
 }finally{Object.assign(globalThis,originals);}
});


test('A locked manual profile hides grid overlays and ignores editing until unlocked',()=>{
 const originals={document:globalThis.document,Option:globalThis.Option};
 const ids=[...readFileSync(new URL('../app/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 globalThis.document={querySelectorAll:()=>[],activeElement:null};globalThis.Option=OptionElement;
 const state={ready:true,view:'2d',profileLocked:true,config:{layoutMode:'manual',width:1,gridShow:true,gridSnap:true,gridStep:.5,dimensionShow:true,positions:{},baseColor:'#ffffff',textColor:'#000000'},model:{W:36,H:11,groups:[],elements:[{id:'text1',name:'Text',x:2,y:3,w:8,h:4}]}};
 let positions=null;
 try{
  const editor=createGridEditor({$:id=>elements[id],state:()=>state,setPositions:p=>{positions=p;},setWidth(){throw Error('Width is locked');},show2D(){}});
  editor.sync();assert.equal(elements['grid-controls'].hidden,true);assert.equal(elements['grid-position-controls'].hidden,true);assert.equal(elements['grid-width'].disabled,true);
  assert.doesNotMatch(elements['label-preview'].innerHTML,/editor-grid|data-element|editor-dimensions/);
  elements['label-preview'].onkeydown({key:'ArrowRight',preventDefault(){throw Error('Locked editing must be ignored');}});assert.equal(positions,null);
  state.profileLocked=false;editor.sync();assert.equal(elements['grid-controls'].hidden,false);assert.match(elements['label-preview'].innerHTML,/data-element/);
  elements['label-preview'].onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(positions.text1.x,2.5);
 }finally{Object.assign(globalThis,originals);}
});


test('A failed editor reset cannot leave a deleted project listed or reuse its ID',async()=>{
 const originals={document:globalThis.document,window:globalThis.window,Option:globalThis.Option,fetch:globalThis.fetch};
 const ids=[...readFileSync(new URL('../app/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 globalThis.document={querySelector:()=>new Element('main'),createElement:tag=>new Element(tag)};globalThis.Option=OptionElement;globalThis.window={addEventListener(){},confirm:()=>true};
 const snapshot={schema:1,items:[{id:1,copies:1,config:{text1:'M3'}}]};const records={p:{id:'p',name:'M3',revision:1,data:snapshot}};let savedId=null;
 globalThis.fetch=async(path,options={})=>{
  const [,kind,id]=path.slice(1).split('/');let result;
  if(options.method==='DELETE'){delete records[id];result={deleted:true};}
  else if(options.method==='PUT'){savedId=id;const body=JSON.parse(options.body);assert.equal(body.revision,0);records[id]={id,name:body.name,revision:1,data:body.data};result={entry:records[id]};}
  else if(kind==='capabilities')result={documentDelete:true,folderDelete:true};
  else if(id)result={entry:records[id]};
  else result={entries:kind==='projects'?Object.values(records):[]};
  return {ok:true,json:async()=>result};
 };
 try{
  const store=createWorkspaceStore({$:id=>elements[id],getProject:()=>snapshot,getProfile:()=>profileFrom({layoutMode:'auto'}),applyProject(){},applyProfile(){},newProject(){throw Error('Editor reset failed');}});
  await store.init();elements['explorer-list'].children[0].onclick();await elements['project-open'].onclick();await elements['project-delete'].onclick();
  assert.equal(records.p,undefined);assert.equal(elements['explorer-list'].childElementCount,0);assert.equal(elements['project-delete'].disabled,true);assert.match(elements['folder-status'].textContent,/Projekt gelöscht/);
  await elements['project-save'].onclick();assert.ok(savedId);assert.notEqual(savedId,'p');
 }finally{Object.assign(globalThis,originals);}
});
