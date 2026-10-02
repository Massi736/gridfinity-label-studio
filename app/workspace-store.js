// Local projects, folders and reusable arrangement profiles. No external services.
export const PROFILE_FIELDS=['width','height','margin','layoutMode','gridStep','gridShow','gridSnap','dimensionShow','autoGap','autoLineGap','autoTextVertical','autoIconVertical','iconPosition','iconSize','fontSize','fontSize2','align','align2','text2AlignStart','letterSpacing','letterSpacing2','symbolReference','positions'];
export function profileFrom(config){return {schema:1,layout:structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in config).map(k=>[k,config[k]])))};}
export function applyLayoutProfile(config,data){if(data?.schema!==1||!data.layout)throw Error('Ungültiges Anordnungsprofil.');return {...config,...structuredClone(Object.fromEntries(PROFILE_FIELDS.filter(k=>k in data.layout).map(k=>[k,data.layout[k]])))};}
export async function localAPI(path,options={}){
 const response=await fetch('/api/'+path,{...options,cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000)});
 let data;try{data=await response.json();}catch{data={error:'Der lokale Server hat keine gültige Antwort geliefert.'};}
 if(!response.ok){
  const message=options.method==='DELETE'&&[405,501].includes(response.status)?'Der laufende Server unterstützt das Löschen noch nicht. Bitte das STARTEN-Fenster mit Strg+C beenden und STARTEN.bat bzw. STARTEN.sh neu starten.':data.error||'Speichern/Laden fehlgeschlagen.';
  const error=new Error(message);error.status=response.status;throw error;
 }
 return data;
}
export async function deleteDocument(kind,entry){
 const result=await localAPI(kind+'/'+entry.id,{method:'DELETE',body:JSON.stringify({revision:entry.revision})});
 if(result.deleted!==true)throw Error('Das Löschen wurde vom Server nicht bestätigt. Bitte den lokalen Server neu starten und erneut versuchen.');
 return result;
}
export function createWorkspaceStore({$,getProject,applyProject,newProject,getProfile,applyProfile,profileStateChanged=()=>{}}){
 let active=null,dirty=false,working=false,browseFolder='',activeProfile=null,editingProfile=false,explorerSelection=null;
 const expandedFolders=new Set(['']);
 let projects=[],folders=[],profiles=[];
 const status=text=>$('project-status').textContent=text;
 const sorted=entries=>[...entries].sort((a,b)=>a.name.localeCompare(b.name,'de',{numeric:true}));
 const signature=()=>JSON.stringify(getProfile());
 function changed(){dirty=true;status('Ungespeicherte Änderungen');}
 function folderPath(id){const path=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const folder=folders.find(f=>f.id===id);if(!folder)break;path.unshift(folder);id=folder.parentId;}return path;}
 function updateExplorerSelection(){
  const project=explorerSelection?.kind==='project'?projects.find(p=>p.id===explorerSelection.id):null;
  $('project-list').value=project?.id||'';
  $('project-open').disabled=!explorerSelection;
  $('project-delete').disabled=!project;
  const folder=explorerSelection?.kind==='folder'?folders.find(f=>f.id===explorerSelection.id):!explorerSelection?folders.find(f=>f.id===browseFolder):null;
  $('folder-delete').disabled=!folder;$('folder-delete').title=folder?'Ordner «'+folder.name+'» löschen':'Ordner auswählen';
  for(const row of $('explorer-list').querySelectorAll('tr')){const selected=row.dataset.id===explorerSelection?.id&&row.dataset.kind===explorerSelection?.kind;row.classList.toggle('selected',selected);row.setAttribute('aria-selected',String(selected));}
 }
 function renderProjects(selected=$('project-list').value){
  const entries=sorted(projects.filter(p=>(p.folderId||'')===browseFolder));
  $('project-list').replaceChildren(new Option('Projekt auswählen …',''),...entries.map(p=>new Option(p.name,p.id)));
  if(entries.some(p=>p.id===selected))explorerSelection={kind:'project',id:selected};
  else if(explorerSelection?.kind==='project')explorerSelection=null;
  const children=sorted(folders.filter(f=>(f.parentId||'')===browseFolder));
  if(explorerSelection?.kind==='folder'&&!children.some(f=>f.id===explorerSelection.id))explorerSelection=null;
  const list=$('explorer-list');list.replaceChildren();
  for(const entry of [...children.map(f=>({...f,kind:'folder'})),...entries.map(p=>({...p,kind:'project'}))]){
   const row=document.createElement('tr');row.tabIndex=0;row.dataset.id=entry.id;row.dataset.kind=entry.kind;
   const name=document.createElement('td'),icon=document.createElement('span'),text=document.createElement('span');icon.className='explorer-icon '+entry.kind;icon.textContent=entry.kind==='folder'?'📁':'▤';icon.setAttribute('aria-hidden','true');text.textContent=entry.name;name.append(icon,text);
   const type=document.createElement('td');type.textContent=entry.kind==='folder'?'Dateiordner':'Label-Projekt';
   const date=document.createElement('td');date.textContent=entry.updatedAt?new Date(entry.updatedAt).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'}):'–';row.append(name,type,date);
   row.onclick=()=>{explorerSelection={kind:entry.kind,id:entry.id};updateExplorerSelection();};
   row.ondblclick=()=>{row.onclick();$('project-open').onclick();};
   row.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();row.ondblclick();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const next=event.key==='ArrowDown'?row.nextElementSibling:row.previousElementSibling;if(next){next.focus();next.onclick();}}};
   list.append(row);
  }
  $('explorer-empty').hidden=!!list.childElementCount;updateExplorerSelection();
  $('folder-status').textContent=`${entries.length} ${entries.length===1?'Projekt':'Projekte'} · ${children.length} Unterordner`;
 }
 function browse(id){browseFolder=id;explorerSelection=null;for(const f of folderPath(id))expandedFolders.add(f.id);renderFolders();renderProjects('');}
 function renderTree(){
  const tree=$('folder-tree');tree.replaceChildren();
  function branch(folder,depth,seen){
   if(seen.has(folder.id))return;const path=new Set([...seen,folder.id]),children=sorted(folders.filter(f=>(f.parentId||'')===folder.id));
   const row=document.createElement('div');row.className='tree-item';row.style.setProperty('--tree-depth',depth);row.setAttribute('role','treeitem');row.setAttribute('aria-level',depth+1);row.setAttribute('aria-selected',String(folder.id===browseFolder));if(children.length)row.setAttribute('aria-expanded',String(expandedFolders.has(folder.id)));
   const toggle=document.createElement('button');toggle.type='button';toggle.className='tree-toggle';toggle.textContent=children.length?(expandedFolders.has(folder.id)?'▾':'▸'):'';toggle.disabled=!children.length;toggle.setAttribute('aria-label',(expandedFolders.has(folder.id)?'Zuklappen: ':'Aufklappen: ')+folder.name);toggle.onclick=()=>{if(expandedFolders.has(folder.id))expandedFolders.delete(folder.id);else expandedFolders.add(folder.id);renderTree();};
   const button=document.createElement('button');button.type='button';button.className='tree-label';button.textContent='📁 '+folder.name;button.title=folderPath(folder.id).map(f=>f.name).join(' / ')||'Projekte';button.onclick=()=>browse(folder.id);row.append(toggle,button);tree.append(row);
   if(expandedFolders.has(folder.id))for(const child of children)branch(child,depth+1,path);
  }
  branch({id:'',name:'Projekte'},0,new Set());
 }
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
  $('folder-up').disabled=!browseFolder;expandedFolders.add('');for(const folder of folderPath(browseFolder).slice(0,-1))expandedFolders.add(folder.id);renderTree();
 }
 function syncLayout(){
  const select=$('arrangement-select');
  for(const option of select.querySelectorAll('optgroup option')){
   const entry=profiles.find(p=>'profile:'+p.id===option.value);
   option.textContent=entry.name+(activeProfile?.id===entry.id&&activeProfile.signature!==signature()?' · angepasst':'');
  }
  select.value=activeProfile?'profile:'+activeProfile.id:getProfile().layout.layoutMode;
  $('profile-update').hidden=!activeProfile||!editingProfile;
  $('profile-delete').hidden=!activeProfile;
  $('profile-mode').hidden=!activeProfile;
  $('profile-edit-save').hidden=!activeProfile||!editingProfile;
  $('profile-edit').textContent=editingProfile?'Bearbeitung beenden':'Profil bearbeiten';
  $('profile-edit').setAttribute('aria-pressed',String(editingProfile));
  $('profile-mode-status').textContent=activeProfile?(editingProfile?'Bearbeitungsmodus · Positionen und Symbole anpassen':activeProfile.signature!==signature()?'Profil angepasst · noch nicht gespeichert':'Profil aktiv · Anordnung gesperrt'):'';
  if(activeProfile&&activeProfile.signature!==signature())$('profile-status').textContent='Profil angepasst. Als neues Profil speichern oder das gewählte Profil überschreiben.';
 }
 function renderProfiles(){
  const select=$('arrangement-select');select.replaceChildren(new Option('Automatisch','auto'),new Option('Frei am Raster','manual'));
  if(profiles.length){const group=document.createElement('optgroup');group.label='Meine Anordnungsprofile';for(const p of sorted(profiles))group.append(new Option(p.name,'profile:'+p.id));select.append(group);}
  if(activeProfile&&!profiles.some(p=>p.id===activeProfile.id)){activeProfile=null;editingProfile=false;}
  syncLayout();
 }
 async function list(kind){const {entries}=await localAPI(kind);if(kind==='projects')projects=entries;else if(kind==='folders')folders=entries;else profiles=entries;}
 async function refresh(){await Promise.all(['projects','folders','profiles'].map(list));renderFolders();renderProjects();renderProfiles();profileStateChanged();}
 async function save(copy=false){
  const name=$('project-name').value.trim();if(!name)throw Error('Bitte einen Projektnamen eingeben.');
  const target=copy||!active?{id:crypto.randomUUID(),revision:0}:active;
  const data={...getProject(),folderId:$('project-folder').value};status('Projekt wird gespeichert …');
  const {entry}=await localAPI('projects/'+target.id,{method:'PUT',body:JSON.stringify({name,data,revision:target.revision})});
  active={id:entry.id,revision:entry.revision};dirty=false;browseFolder=data.folderId;
  await list('projects');renderFolders();renderProjects(entry.id);status('Gespeichert · '+new Date(entry.updatedAt).toLocaleTimeString('de-CH'));
 }
 async function preserve(){if(dirty)await save();}
 async function action(fn,target='project-status'){if(working)return;working=true;const main=document.querySelector('main');main.inert=true;try{await fn();}catch(e){$(target).textContent=e.message;if(target==='project-status')$('folder-status').textContent=e.message;else if(target==='profile-status')$('profile-mode-status').textContent=e.message;}finally{working=false;main.inert=false;}}
 $('project-name').addEventListener('input',changed);
 $('project-folder').addEventListener('change',changed);
 $('project-list').onchange=()=>{explorerSelection=$('project-list').value?{kind:'project',id:$('project-list').value}:null;updateExplorerSelection();};
 $('folder-up').onclick=()=>browse(folders.find(f=>f.id===browseFolder)?.parentId||'');
 $('project-save').onclick=()=>action(()=>save());
 $('project-copy').onclick=()=>action(()=>save(true));
 $('project-new').onclick=()=>action(async()=>{const destination=browseFolder;await preserve();activeProfile=null;editingProfile=false;await newProject();active=null;dirty=true;$('project-name').value='Neues Projekt';$('project-folder').value=destination;browse(destination);$('project-list').value='';$('project-open').disabled=true;status('Neues Projekt · noch nicht gespeichert');});
 $('project-open').onclick=()=>action(async()=>{if(explorerSelection?.kind==='folder'){browse(explorerSelection.id);return;}const id=$('project-list').value;if(!id)throw Error('Bitte ein Projekt auswählen.');await preserve();const {entry}=await localAPI('projects/'+id);activeProfile=null;editingProfile=false;await applyProject(entry.data);active={id:entry.id,revision:entry.revision};$('project-name').value=entry.name;$('project-folder').value=entry.data.folderId||'';browseFolder=entry.data.folderId||'';renderFolders();renderProjects(id);dirty=false;syncLayout();status('Projekt geöffnet · '+entry.name);});
 $('project-refresh').onclick=()=>action(async()=>{await refresh();status(dirty?'Ungespeicherte Änderungen':'Liste aktualisiert');});
 $('folder-add').onclick=()=>action(async()=>{
  const name=$('folder-name').value.trim();if(!name)throw Error('Bitte einen Ordnernamen eingeben.');
  if(folders.some(f=>(f.parentId||'')===browseFolder&&f.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('In diesem Ordner gibt es bereits einen Ordner mit diesem Namen.');
  const id=crypto.randomUUID();await localAPI('folders/'+id,{method:'PUT',body:JSON.stringify({name,data:{schema:1,parentId:browseFolder},revision:0})});
  await list('folders');browse(id);$('folder-name').value='';$('folder-name').closest('details').open=false;status('Ordner angelegt. Über «Speicherordner» kannst du dein Projekt darin ablegen.');
 },'folder-status');
 $('arrangement-select').onchange=()=>{
  const value=$('arrangement-select').value;
  if(!value.startsWith('profile:')){activeProfile=null;editingProfile=false;$('layoutMode').value=value;$('layoutMode').dispatchEvent(new Event('input',{bubbles:true}));$('profile-status').textContent='Gespeicherte Profile wählst du direkt oben unter «Anordnung» aus.';return;}
  const id=value.slice(8),previous=activeProfile,previousEditing=editingProfile;
  action(async()=>{try{const {entry}=await localAPI('profiles/'+id);activeProfile=null;editingProfile=false;await applyProfile(entry.data);activeProfile={id:entry.id,name:entry.name,signature:signature()};$('profile-name').value=entry.name;changed();$('profile-status').textContent='Profil angewendet · '+entry.name;}catch(e){activeProfile=previous;editingProfile=previousEditing;throw e;}finally{syncLayout();profileStateChanged();}},'profile-status');
 };
 $('profile-save').onclick=()=>action(async()=>{
  const name=$('profile-name').value.trim();if(!name)throw Error('Bitte einen Profilnamen eingeben.');
  const id=crypto.randomUUID();await localAPI('profiles/'+id,{method:'PUT',body:JSON.stringify({name,data:getProfile(),revision:0})});
  activeProfile={id,name,signature:signature()};editingProfile=false;await list('profiles');renderProfiles();profileStateChanged();$('profile-status').textContent='Profil gespeichert. Es ist jetzt unter «Anordnung» auswählbar.';
 },'profile-status');
 $('profile-update').onclick=()=>action(async()=>{
  if(!activeProfile||!editingProfile)throw Error('Bitte zuerst den Bearbeitungsmodus aktivieren.');
  const {entry}=await localAPI('profiles/'+activeProfile.id);const name=$('profile-name').value.trim()||entry.name;
  await localAPI('profiles/'+entry.id,{method:'PUT',body:JSON.stringify({name,data:getProfile(),revision:entry.revision})});
  activeProfile={id:entry.id,name,signature:signature()};editingProfile=false;await list('profiles');renderProfiles();profileStateChanged();$('profile-status').textContent='Profil aktualisiert · '+name;
 },'profile-status');
 $('profile-edit').onclick=()=>{if(!activeProfile)return;editingProfile=!editingProfile;syncLayout();profileStateChanged();};
 $('profile-edit-save').onclick=()=>$('profile-update').onclick();
 $('profile-delete').onclick=()=>action(async()=>{
  if(!activeProfile)throw Error('Bitte ein eigenes Profil auswählen.');
  const {entry}=await localAPI('profiles/'+activeProfile.id);
  if(!window.confirm('Anordnungsprofil «'+entry.name+'» löschen? Gespeicherte Projekte und ihre Labels bleiben erhalten.'))return;
  await deleteDocument('profiles',entry);
  profiles=profiles.filter(p=>p.id!==entry.id);activeProfile=null;editingProfile=false;renderProfiles();profileStateChanged();$('profile-status').textContent='Profil gelöscht · die aktuelle Anordnung bleibt auf dem Label erhalten.';
 },'profile-status');
 $('project-delete').onclick=()=>action(async()=>{
  const id=$('project-list').value,entry=projects.find(p=>p.id===id);if(!entry)throw Error('Bitte ein Projekt in der Liste auswählen.');
  const isActive=active?.id===id;
  const message='Projekt «'+entry.name+'» mit allen gespeicherten Labels löschen?'+(isActive&&dirty?' Auch die ungespeicherten Änderungen dieses Projekts werden verworfen.':'');
  if(!window.confirm(message))return;
  await deleteDocument('projects',entry);
  // Reflect the confirmed deletion before resetting the editor. A failed editor
  // reset must not leave a deleted project visible or attached to the old ID.
  projects=projects.filter(p=>p.id!==id);explorerSelection=null;renderProjects('');
  if(isActive){active=null;activeProfile=null;editingProfile=false;dirty=false;try{await newProject();}catch(e){dirty=true;syncLayout();profileStateChanged();throw Error('Projekt gelöscht. Die Label-Ansicht konnte nicht zurückgesetzt werden: '+e.message);}dirty=false;$('project-name').value='Neues Projekt';$('project-folder').value=browseFolder;}
  syncLayout();profileStateChanged();status('Projekt gelöscht · '+entry.name);
 });
 $('folder-delete').onclick=()=>action(async()=>{
  const id=explorerSelection?.kind==='folder'?explorerSelection.id:!explorerSelection?browseFolder:'';
  const entry=folders.find(f=>f.id===id);if(!entry)throw Error('Bitte einen Ordner auswählen. Der Hauptordner kann nicht gelöscht werden.');
  const destination=folders.find(f=>f.id===entry.parentId),destinationName=destination?.name||'Projekte (Hauptordner)';
  if(!window.confirm('Ordner «'+entry.name+'» und seine Unterordner löschen? Enthaltene Projekte werden nach «'+destinationName+'» verschoben. Alle Projekte und Labels bleiben erhalten.'))return;
  const result=await deleteDocument('folders',entry);
  const removed=new Set(result.removedFolderIds),moved=new Map(result.movedProjects.map(p=>[p.id,p]));
  folders=folders.filter(f=>!removed.has(f.id));projects=projects.map(p=>moved.has(p.id)?{...p,...moved.get(p.id)}:p);
  for(const folder of removed)expandedFolders.delete(folder);
  if(active&&moved.has(active.id))active.revision=moved.get(active.id).revision;
  if(removed.has($('project-folder').value))$('project-folder').value=result.destinationId;
  if(removed.has(browseFolder))browseFolder=result.destinationId;
  explorerSelection=null;renderFolders();renderProjects('');
  status('Ordner gelöscht · '+entry.name+' · '+result.movedProjects.length+' Projekte verschoben');
 },'folder-status');
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 return {changed,syncLayout,isProfileLocked:()=>!!activeProfile&&!editingProfile,isProfileEditing:()=>!!activeProfile&&editingProfile,clearProfile(){activeProfile=null;editingProfile=false;syncLayout();},async init(){try{await refresh();let supported=false;try{const capabilities=await localAPI('capabilities');supported=capabilities.documentDelete===true&&capabilities.folderDelete===true;}catch{}if(supported)status('Bereit · Projekte werden lokal gespeichert');else{const message='Server-Neustart erforderlich: STARTEN-Fenster mit Strg+C beenden und STARTEN.bat bzw. STARTEN.sh neu starten, damit Löschen funktioniert.';status(message);$('folder-status').textContent=message;}}catch(e){status(e.message);}}};
}
