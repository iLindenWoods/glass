const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const DB_NAME = 'glassCinemaCatalogueV7';
const STORE = 'catalogues';
const defaults = { baseUrl: 'https://vidrock.ru', type: 'movie', recent: [], preferTmdb: true };
let state = readState();
let mediaType = state.type;
let selected = null;
let catalogues = { movie: [], tv: [] };
let currentRoute = '';
let searchTimer = 0;


function readState(){try{return{...defaults,...JSON.parse(localStorage.getItem('glassCinemaV75')||'{}')}}catch{return{...defaults}}}
function saveState(patch){state={...state,...patch};localStorage.setItem('glassCinemaV75',JSON.stringify(state))}
function validHttps(value){try{const u=new URL(value);return u.protocol==='https:'?u:null}catch{return null}}
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,3000)}
function setStatus(kind,text){const el=$('#catalogueStatus');el.className='status '+kind;el.querySelector('span').textContent=text}
function normalizeId(v){const s=String(v??'').trim();return /^\d+$/.test(s)||/^tt\d+$/i.test(s)?s:null}
function normalizeItem(raw,type){if(!raw||typeof raw!=='object')return null;const id=raw.id??raw.tmdb_id??raw.tmdbId??raw.tmdb??raw.imdb_id??raw.imdbId??raw.imdb;const title=raw.title??raw.name??raw.original_title??raw.original_name??raw.label;const cleanId=normalizeId(id);if(!cleanId||!title)return null;const year=raw.year??String(raw.release_date??raw.first_air_date??'').slice(0,4);return{id:cleanId,type,title:String(title),year:String(year||''),imdb:raw.imdb_id??raw.imdbId??raw.imdb??'',tmdb:raw.tmdb_id??raw.tmdbId??raw.tmdb??(/^\d+$/.test(cleanId)?cleanId:'')}}
function extractItems(payload,type){let arr=[];if(Array.isArray(payload))arr=payload;else if(payload&&typeof payload==='object'){for(const key of ['results','items','data','movies','series','tv','shows'])if(Array.isArray(payload[key])){arr=payload[key];break}if(!arr.length)arr=Object.values(payload).filter(v=>v&&typeof v==='object')}return arr.map(x=>normalizeItem(x,type)).filter(Boolean)}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function dbGet(key){try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}catch{return null}}
async function dbSet(key,val){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(val,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch{}}
async function fetchJson(url){const res=await fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}
async function fetchCatalogue(type){
  const filename=type==='movie'?'movie':'tv';
  // First use the same-origin mirror produced by the included GitHub Action.
  try{return extractItems(await fetchJson(`catalogues/${filename}.json?ts=${Date.now()}`),type)}catch{}
  // Direct provider access is retained as a fallback when its CORS policy permits it.
  const base=validHttps(state.baseUrl);if(!base)throw new Error('Invalid provider URL');
  return extractItems(await fetchJson(`${base.href.replace(/\/$/,'')}/list/${filename}.json`),type);
}
async function loadCatalogues(){setStatus('','Loading catalogue…');let loaded=0;for(const type of ['movie','tv']){try{const list=await fetchCatalogue(type);if(list.length){catalogues[type]=list;await dbSet(type,{saved:Date.now(),list});loaded+=list.length}}catch{const cached=await dbGet(type);if(cached?.list?.length){catalogues[type]=cached.list;loaded+=cached.list.length}}}if(loaded)setStatus('ready',`${loaded.toLocaleString()} titles ready`);else setStatus('error','Run catalogue sync — IDs still work');renderResults($('#titleSearch').value)}
function setType(type){mediaType=type;saveState({type});$$('.segment').forEach(b=>b.classList.toggle('active',b.dataset.type===type));$('#episodeRow').hidden=type!=='tv';selected=null;renderSelection();renderResults($('#titleSearch').value)}
function choose(item){if(item.type!==mediaType)setType(item.type);selected=item;$('#idInput').value=state.preferTmdb&&item.tmdb?item.tmdb:item.id;renderSelection();toast(`${item.title} selected`)}
function renderSelection(){const card=$('#selectionCard');if(!selected){card.hidden=true;return}card.hidden=false;$('#selectedTitle').textContent=selected.title;$('#selectedMeta').textContent=[selected.year,selected.type==='tv'?'Series':'Movie',selected.id].filter(Boolean).join(' · ')}
function renderResults(query=''){const root=$('#results');root.replaceChildren();const q=query.trim().toLocaleLowerCase();if(q.length<2)return;const tokens=q.split(/\s+/).filter(Boolean);const matches=catalogues[mediaType].filter(x=>{const hay=`${x.title} ${x.year} ${x.id}`.toLocaleLowerCase();return tokens.every(t=>hay.includes(t))}).slice(0,40);if(!matches.length){const d=document.createElement('div');d.className='result';d.textContent=catalogues[mediaType].length?'No matching title found.':'Catalogue not synced yet; IDs still work.';root.append(d);return}for(const item of matches){const b=document.createElement('button');b.className='result';const left=document.createElement('span');left.textContent=item.title;const right=document.createElement('small');right.textContent=[item.year,item.id].filter(Boolean).join(' · ');b.append(left,right);b.onclick=()=>choose(item);root.append(b)}}
function routeFor(id){const clean=normalizeId(id);const base=validHttps(state.baseUrl);if(!clean||!base)return null;const root=base.href.replace(/\/$/,'');if(mediaType==='movie')return `${root}/movie/${encodeURIComponent(clean)}`;const s=Math.max(1,parseInt($('#season').value)||1),e=Math.max(1,parseInt($('#episode').value)||1);return `${root}/tv/${encodeURIComponent(clean)}/${s}/${e}`}
function addRecent(item){const recent=[{...item,season:mediaType==='tv'?Math.max(1,+$('#season').value||1):null,episode:mediaType==='tv'?Math.max(1,+$('#episode').value||1):null,playedAt:Date.now()},...state.recent.filter(x=>!(x.id===item.id&&x.type===item.type))].slice(0,12);saveState({recent});renderRecent()}
function renderRecent(){const root=$('#recentList');root.replaceChildren();if(!state.recent.length){root.innerHTML='<p>No recent titles yet.</p>';return}for(const item of state.recent){const b=document.createElement('button');b.className='recent-chip';b.textContent=item.title||`${item.type==='tv'?'Series':'Movie'} ${item.id}`;b.onclick=()=>{setType(item.type);selected=item;$('#idInput').value=item.id;if(item.season)$('#season').value=item.season;if(item.episode)$('#episode').value=item.episode;renderSelection()};root.append(b)}}
function play(){const id=normalizeId($('#idInput').value);if(!id){toast('Enter a valid TMDB number or IMDb tt-number.');$('#idInput').focus();return}const route=routeFor(id);if(!route){toast('Check the provider address in Settings.');return}currentRoute=route;const item=selected||{id,type:mediaType,title:`${mediaType==='tv'?'Series':'Movie'} ${id}`};addRecent(item);const titleNode=$('#playerTitleDisplay strong');if(titleNode)titleNode.textContent=item.title||`${mediaType==='tv'?'Series':'Movie'} ${id}`;$('#emptyState').hidden=true;$('#embedPlayer').hidden=false;const frame=$('#playerFrame');frame.src='about:blank';requestAnimationFrame(()=>frame.src=route);showToolbar();toast('Loading inside Glass Cinema…')}
function closePlayer(){const frame=$('#playerFrame');frame.src='about:blank';$('#embedPlayer').hidden=true;$('#emptyState').hidden=false;currentRoute='';}
function showToolbar(){
  const toolbar=$('#playerToolbar');
  const player=$('#embedPlayer');
  if(player.hidden)return;
  toolbar.classList.add('visible');
  $('#revealControls').setAttribute('aria-label','Hide Glass Cinema controls');
}
function hideToolbar(){
  $('#playerToolbar').classList.remove('visible');
  $('#revealControls').setAttribute('aria-label','Show Glass Cinema controls');
}
function toggleToolbar(){
  const toolbar=$('#playerToolbar');
  toolbar.classList.contains('visible')?hideToolbar():showToolbar();
}
async function fullscreen(){const target=$('#embedPlayer');try{if(target.requestFullscreen)await target.requestFullscreen();else if(target.webkitRequestFullscreen)target.webkitRequestFullscreen();else toast('Tap the player’s own full-screen button.')}catch{toast('Tap the player’s own full-screen button.')}}
function applyFilter(mode){const frame=$('#playerFrame'),overlay=$('#enhancementScreen'),player=$('#embedPlayer');frame.classList.remove('filter-enhanced','filter-clear','filter-cinema');overlay.classList.remove('active','cinema');player.dataset.pictureMode=mode;if(mode==='enhanced'){frame.classList.add('filter-enhanced');overlay.classList.add('active')}if(mode==='clear')frame.classList.add('filter-clear');if(mode==='cinema'){frame.classList.add('filter-cinema');overlay.classList.add('active','cinema')}$$('.mode').forEach(b=>b.classList.toggle('active',b.dataset.filter===mode));$$('[data-mode-card]').forEach(b=>b.classList.toggle('active',b.dataset.modeCard===mode));toast(mode==='enhanced'?'Luminance enhancement applied — colours unchanged':'Picture mode: '+mode)}

$$('.segment').forEach(b=>b.onclick=()=>setType(b.dataset.type));
$('#titleSearch').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>renderResults(e.target.value),80)});
$('#idInput').addEventListener('input',()=>{selected=null;renderSelection()});
$('#idInput').addEventListener('keydown',e=>{if(e.key==='Enter')play()});
$('#playButton').onclick=play;$('#closePlayer').onclick=closePlayer;$('#fullscreenBtn').onclick=fullscreen;
$('#revealControls').onclick=toggleToolbar;
$$('[data-mode-card]').forEach(b=>b.onclick=()=>applyFilter(b.dataset.modeCard));
$$('[data-nav-type]').forEach(b=>b.onclick=()=>{setType(b.dataset.navType);$('#titleSearch').focus()});$('#openDirect').onclick=()=>{if(currentRoute)window.location.assign(currentRoute)};
$('.modes').onclick=e=>{const b=e.target.closest('[data-filter]');if(b)applyFilter(b.dataset.filter)};
$('#clearSelection').onclick=()=>{selected=null;$('#idInput').value='';renderSelection()};
$('#clearRecent').onclick=()=>{saveState({recent:[]});renderRecent()};
$('#settingsBtn').onclick=()=>{$('#baseUrl').value=state.baseUrl;$('#preferTmdb').checked=state.preferTmdb;$('#settingsDialog').showModal()};
$('#saveSettings').onclick=e=>{const u=validHttps($('#baseUrl').value.trim());if(!u){e.preventDefault();toast('Enter a valid HTTPS provider address.');return}saveState({baseUrl:u.href.replace(/\/$/,''),preferTmdb:$('#preferTmdb').checked});loadCatalogues();toast('Settings saved')};
document.addEventListener('keydown',e=>{
  if($('#embedPlayer').hidden||mediaType!=='tv')return;
});
$('#playerFrame').addEventListener('load',()=>{if($('#playerFrame').src!=='about:blank')toast('Player loaded. Enhanced Screen can now be applied.')});

(async function init(){setType(mediaType);renderRecent();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});await loadCatalogues()})();
