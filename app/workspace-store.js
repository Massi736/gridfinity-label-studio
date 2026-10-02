// Local projects, folders and reusable arrangement profiles. No external services.
export const PROFILE_FIELDS=['width','height','margin','layoutMode','gridStep','gridShow','gridSnap','dimensionShow','autoGap','autoLineGap','autoTextVertical','autoIconVertical','iconPosition','iconSize','fontSize','fontSize2','align','align2','text2AlignStart','letterSpacing','letterSpacing2','symbolReference','positions'];
export function profileFrom(config){return {schema:1,layout:structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in config).map(k=>[k,config[k]])))};}
export function applyLayoutProfile(config,data){if(data?.schema!==1||!data.layout)throw Error('Ungültiges Anordnungsprofil.');return {...config,...structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in data.layout).map(k=>[k,data.layout[k]])))};}
export async function localAPI(path,options={}){
 const response=await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Speichern/Laden fehlgeschlagen.');return data;
}
export function createWorkspaceStore({$,getProject,applyProject,newProject,getProfile,applyProfile}){
 let active=null,dirty=false,working=false,browseFolder='',activeProfile=null;
 let projects=[],folders=[],profiles=[];
 const status=text=>$('project-status').textContent=text;
 const sorted=entries=>[...entries].sort((a,b)=>a.name.localeCompare(b.name,'de',{numeric:true}));
 const signature=()=>JSON.stringify(getProfile());
 function changed(){dirty=true;status('Ungespeicherte Änderungen');}
 function folderPath(id){const path=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const folder=folders.find(f=>f.id===id);if(!folder)break;path.unshift(folder);id=folder.parentId;}return path;}
 function renderProjects(selected=$('project-list').value){
  const entries=sorted(projects.filter(p=>(p.folderId||'')===browseFolder));
  $('project-list').replaceChildren(new Option(entries.length?'Projekt auswählen …':'Keine Projekte in diesem Ordner',''),...entries.map(p=>new Option(p.name,p.id)));
  $('project-list').value=entries.some(p=>p.id===selected)?selected:'';
  $('project-open').disabled=!$('project-list').value;
  const childCount=folders.filter(f=>(f.parentId||'')===browseFolder).length;
  $('folder-status').textContent=`${entries.length} ${entries.length===1?'Projekt':'Projekte'} · ${childCount} ${childCount===1?'Unterordner':'Unterordner'}`;
 }
 function browse(id){browseFolder=id;renderFolders();renderProjects();}
 function renderFolders(){
  if(browseFolder&&!folders.some(f=>f.id===browseFolder))browseFolder='';
  const chosen=$('project-folder').value;
  $('project-folder').replaceChildren(new Option('Projekte (Hauptordner)',''),...sorted(folders.map(f=>({...f,name:folderPath(f.id).map(p=>p.name).join(' / ')}))).map(f=>new Option(f.name,f.id)));
  $('project-folder').value=folders.some(f=>f.id===chosen)?chosen:'';
  const crumbs=$('folder-breadcrumbs');crumbs.replaceChildren();
  for(const folder of [{id:'',name:'Projekte'},...folderPath(browseFolder)]){
   const button=document.createElement('button');button.type='button';button.textContent=folder.name;button.className='folder-crumb';
   if(folder.id===browseFolder)button.setAttribute('aria-current','page');button.onclick=()=>browse(folder.id);crumbs.append(button);
  }
  const list=$('folder-list');list.replaceChildren();
  for(const folder of sorted(folders.filter(f=>(f.parentId||'')===browseFolder))){
   const button=document.createElement('button');button.type='button';button.className='folder-card';button.textContent='📁 '+folder.name;button.onclick=()=>browse(folder.id);list.append(button);
  }
  list.hidden=!list.childElementCount;
 }
 function syncLayout(){
  const select=$('arrangement-select');
  for(const option of select.querySelectorAll('optgroup option')){
   const entry=profiles.find(p=>'profile:'+p.id===option.value);
   option.textContent=entry.name+(activeProfile?.id===entry.id&&activeProfile.signature!==signature()?' · angepasst':'');
  }
  select.value=activeProfile?'profile:'+activeProfile.id:getProfile().layout.layoutMode;
  $('profile-update').hidden=!activeProfile;
  if(activeProfile&&activeProfile.signature!==signature())$('profile-status').textContent='Profil angepasst. Als neues Profil speichern oder das gewählte Profil überschreiben.';
 }
 function renderProfiles(){
  const select=$('arrangement-select');select.replaceChildren(new Option('Automatisch','auto'),new Option('Frei am Raster','manual'));
  if(profiles.length){const group=document.createElement('optgroup');group.label='Meine Anordnungsprofile';for(const p of sorted(profiles))group.append(new Option(p.name,'profile:'+p.id));select.append(group);}
  if(activeProfile&&!profiles.some(p=>p.id===activeProfile.id))activeProfile=null;
  syncLayout();
 }
 async function list(kind){const {entries}=await localAPI(kind);if(kind==='projects')projects=entries;else if(kind==='folders')folders=entries;else profiles=entries;}
 async function refresh(){await Promise.all(['projects','folders','profiles'].map(list));renderFolders();renderProjects();renderProfiles();}
 async function save(copy=false){
  const name=$('project-name').value.trim();if(!name)throw Error('Bitte einen Projektnamen eingeben.');
  const target=copy||!active?{id:crypto.randomUUID(),revision:0}:active;
  const data={...getProject(),folderId:$('project-folder').value};status('Projekt wird gespeichert …');
  const {entry}=await localAPI('projects/'+target.id,{method:'PUT',body:JSON.stringify({name,data,revision:target.revision})});
  active={id:entry.id,revision:entry.revision};dirty=false;browseFolder=data.folderId;
  await list('projects');renderFolders();renderProjects(entry.id);status('Gespeichert · '+new Date(entry.updatedAt).toLocaleTimeString('de-CH'));
 }
 async function preserve(){if(dirty)await save();}
 async function action(fn,target='project-status'){if(working)return;working=true;const main=document.querySelector('main');main.inert=true;try{await fn();}catch(e){$(target).textContent=e.message;}finally{working=false;main.inert=false;}}
 $('project-name').addEventListener('input',changed);
 $('project-folder').addEventListener('change',changed);
 $('project-list').onchange=()=>{$('project-open').disabled=!$('project-list').value;};
 $('project-save').onclick=()=>action(()=>save());
 $('project-copy').onclick=()=>action(()=>save(true));
 $('project-new').onclick=()=>action(async()=>{const destination=browseFolder;await preserve();activeProfile=null;await newProject();active=null;dirty=true;$('project-name').value='Neues Projekt';$('project-folder').value=destination;browse(destination);$('project-list').value='';$('project-open').disabled=true;status('Neues Projekt · noch nicht gespeichert');});
 $('project-open').onclick=()=>action(async()=>{const id=$('project-list').value;if(!id)throw Error('Bitte ein Projekt auswählen.');await preserve();const {entry}=await localAPI('projects/'+id);activeProfile=null;await applyProject(entry.data);active={id:entry.id,revision:entry.revision};$('project-name').value=entry.name;$('project-folder').value=entry.data.folderId||'';browseFolder=entry.data.folderId||'';renderFolders();renderProjects(id);dirty=false;syncLayout();status('Projekt geöffnet · '+entry.name);});
 $('project-refresh').onclick=()=>action(async()=>{await refresh();status(dirty?'Ungespeicherte Änderungen':'Liste aktualisiert');});
 $('folder-add').onclick=()=>action(async()=>{
  const name=$('folder-name').value.trim();if(!name)throw Error('Bitte einen Ordnernamen eingeben.');
  if(folders.some(f=>(f.parentId||'')===browseFolder&&f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('In diesem Ordner gibt es bereits einen Ordner mit diesem Namen.');
  const id=crypto.randomUUID();await localAPI('folders/'+id,{method:'PUT',body:JSON.stringify({name,data:{schema:1,parentId:browseFolder},revision:0})});
  await list('folders');browse(id);$('folder-name').value='';$('folder-name').closest('details').open=false;status('Ordner angelegt. Über «Speicherordner» kannst du dein Projekt darin ablegen.');
 },'folder-status');
 $('arrangement-select').onchange=()=>{
  const value=$('arrangement-select').value;
  if(!value.startsWith('profile:')){activeProfile=null;$('layoutMode').value=value;$('layoutMode').dispatchEvent(new Event('input',{bubbles:true}));$('profile-status').textContent='Gespeicherte Profile wählst du direkt oben unter «Anordnung» aus.';return;}
  const id=value.slice(8),previous=activeProfile;
  action(async()=>{try{const {entry}=await localAPI('profiles/'+id);activeProfile=null;await applyProfile(entry.data);activeProfile={id:entry.id,name:entry.name,signature:signature()};$('profile-name').value=entry.name;changed();$('profile-status').textContent='Profil angewendet · '+entry.name;}catch(e){activeProfile=previous;throw e;}finally{syncLayout();}},'profile-status');
 };
 $('profile-save').onclick=()=>action(async()=>{
  const name=$('profile-name').value.trim();if(!name)throw Error('Bitte einen Profilnamen eingeben.');
  const id=crypto.randomUUID();await localAPI('profiles/'+id,{method:'PUT',body:JSON.stringify({name,data:getProfile(),revision:0})});
  activeProfile={id,name,signature:signature()};await list('profiles');renderProfiles();$('profile-status').textContent='Profil gespeichert. Es ist jetzt unter «Anordnung» auswählbar.';
 },'profile-status');
 $('profile-update').onclick=()=>action(async()=>{
  if(!activeProfile)throw Error('Bitte oben ein eigenes Profil auswählen.');
  const {entry}=await localAPI('profiles/'+activeProfile.id);const name=$('profile-name').value.trim()||entry.name;
  await localAPI('profiles/'+entry.id,{method:'PUT',body:JSON.stringify({name,data:getProfile(),revision:entry.revision})});
  activeProfile={id:entry.id,name,signature:signature()};await list('profiles');renderProfiles();$('profile-status').textContent='Profil aktualisiert · '+name;
 },'profile-status');
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 return {changed,syncLayout,clearProfile(){activeProfile=null;syncLayout();},async init(){try{await refresh();status('Bereit · Projekte werden lokal gespeichert');}catch(e){status(e.message);}}};
}
