// Local projects and reusable arrangement profiles. No external services.
export const PROFILE_FIELDS=['width','height','margin','layoutMode','gridStep','gridShow','gridSnap','dimensionShow','autoGap','autoLineGap','autoTextVertical','autoIconVertical','iconPosition','iconSize','fontSize','fontSize2','align','align2','text2AlignStart','letterSpacing','letterSpacing2','symbolReference','positions'];
export function profileFrom(config){return {schema:1,layout:structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in config).map(k=>[k,config[k]])))};}
export function applyLayoutProfile(config,data){if(data?.schema!==1||!data.layout)throw Error('Ungültiges Anordnungsprofil.');return {...config,...structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in data.layout).map(k=>[k,data.layout[k]])))};}
export async function localAPI(path,options={}){
 const response=await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Speichern/Laden fehlgeschlagen.');return data;
}
export function createWorkspaceStore({$,getProject,applyProject,newProject,getProfile,applyProfile}){
 let active=null,dirty=false,working=false;
 const status=text=>$('project-status').textContent=text;
 function changed(){dirty=true;status('Ungespeicherte Änderungen');}
 async function list(kind){const data=await localAPI(kind);const select=$(kind==='projects'?'project-list':'profile-list'),value=select.value;select.replaceChildren(new Option(kind==='projects'?'Projekt auswählen …':'Profil auswählen …',''));for(const e of data.entries)select.append(new Option(e.name,e.id));select.value=value;}
 async function save(copy=false){
  const name=$('project-name').value.trim();if(!name)throw Error('Bitte einen Projektnamen eingeben.');
  const target=copy||!active?{id:crypto.randomUUID(),revision:0}:active;
  const data=getProject();status('Projekt wird gespeichert …');
  const {entry}=await localAPI('projects/'+target.id,{method:'PUT',body:JSON.stringify({name,data,revision:target.revision})});
  active={id:entry.id,revision:entry.revision};dirty=false;await list('projects');$('project-list').value=entry.id;status('Gespeichert · '+new Date(entry.updatedAt).toLocaleTimeString('de-CH'));
 }
 async function preserve(){if(dirty)await save();}
 async function action(fn){if(working)return;working=true;const main=document.querySelector('main');main.inert=true;try{await fn();}catch(e){status(e.message);}finally{working=false;main.inert=false;}}
 $('project-name').addEventListener('input',changed);
 $('project-save').onclick=()=>action(()=>save());
 $('project-copy').onclick=()=>action(()=>save(true));
 $('project-new').onclick=()=>action(async()=>{await preserve();await newProject();active=null;dirty=true;$('project-name').value='Neues Projekt';$('project-list').value='';status('Neues Projekt · noch nicht gespeichert');});
 $('project-open').onclick=()=>action(async()=>{const id=$('project-list').value;if(!id)throw Error('Bitte ein Projekt auswählen.');await preserve();const {entry}=await localAPI('projects/'+id);await applyProject(entry.data);active={id:entry.id,revision:entry.revision};$('project-name').value=entry.name;$('project-list').value=id;dirty=false;status('Projekt geöffnet · '+entry.name);});
 $('project-refresh').onclick=()=>action(async()=>{await Promise.all([list('projects'),list('profiles')]);status(dirty?'Ungespeicherte Änderungen':'Liste aktualisiert');});
 $('profile-save').onclick=()=>action(async()=>{const name=$('profile-name').value.trim();if(!name)throw Error('Bitte einen Profilnamen eingeben.');const id=crypto.randomUUID();await localAPI('profiles/'+id,{method:'PUT',body:JSON.stringify({name,data:getProfile(),revision:0})});await list('profiles');$('profile-list').value=id;status('Anordnungsprofil gespeichert');});
 $('profile-update').onclick=()=>action(async()=>{const id=$('profile-list').value;if(!id)throw Error('Bitte ein Profil auswählen.');const {entry}=await localAPI('profiles/'+id);await localAPI('profiles/'+id,{method:'PUT',body:JSON.stringify({name:$('profile-name').value.trim()||entry.name,data:getProfile(),revision:entry.revision})});await list('profiles');$('profile-list').value=id;status('Anordnungsprofil aktualisiert');});
 $('profile-load').onclick=()=>action(async()=>{const id=$('profile-list').value;if(!id)throw Error('Bitte ein Profil auswählen.');const {entry}=await localAPI('profiles/'+id);applyProfile(entry.data);$('profile-name').value=entry.name;changed();status('Profil angewendet · Projekt noch nicht gespeichert');});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 return {changed,async init(){try{await Promise.all([list('projects'),list('profiles')]);status('Bereit · Projekte werden lokal gespeichert');}catch(e){status(e.message);}}};
}
