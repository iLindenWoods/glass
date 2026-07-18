const $ = (s) => document.querySelector(s);
let mediaType = 'movie';
let selected = null;

const curated = [
  {id:157336,type:'movie',title:'Interstellar',meta:'Film · 2014',bg:'radial-gradient(circle at 68% 24%,#b2d8ff 0 4%,transparent 18%),linear-gradient(145deg,#16284b,#060813 65%)'},
  {id:329865,type:'movie',title:'Arrival',meta:'Film · 2016',bg:'radial-gradient(ellipse at 55% 35%,#7b8796 0 8%,transparent 26%),linear-gradient(160deg,#616b75,#11141a 62%)'},
  {id:70523,type:'tv',title:'Dark',meta:'Series · 2017',bg:'radial-gradient(circle at 50% 25%,#7c7682 0 2%,transparent 21%),linear-gradient(145deg,#313039,#090a0e 70%)'},
  {id:63639,type:'tv',title:'The Expanse',meta:'Series · 2015',bg:'radial-gradient(circle at 72% 22%,#d19a61 0 3%,transparent 17%),linear-gradient(145deg,#3d2b2b,#090b13 65%)'},
  {id:23004,type:'tv',title:'Captain Future',meta:'Series · 1978',bg:'radial-gradient(circle at 70% 20%,#ffbd6b 0 4%,transparent 17%),linear-gradient(145deg,#274d77,#120d29 70%)'},
  {id:95396,type:'tv',title:'Severance',meta:'Series · 2022',bg:'linear-gradient(145deg,#b9d0d6,#3b5664 45%,#111820)'},
  {id:686,type:'movie',title:'Contact',meta:'Film · 1997',bg:'radial-gradient(circle at 62% 25%,#d7e6ff 0 3%,transparent 18%),linear-gradient(145deg,#273e65,#070a14 72%)'},
  {id:62,type:'movie',title:'2001: A Space Odyssey',meta:'Film · 1968',bg:'radial-gradient(circle at 64% 26%,#ffdfcc 0 3%,transparent 13%),linear-gradient(145deg,#7b2d29,#09090d 68%)'},
  {id:93740,type:'tv',title:'Foundation',meta:'Series · 2021',bg:'radial-gradient(circle at 70% 20%,#ffbd75 0 3%,transparent 16%),linear-gradient(145deg,#6c3b32,#0b0c16 72%)'},
  {id:1418,type:'tv',title:'The Big Bang Theory',meta:'Series · 2007',bg:'radial-gradient(circle at 50% 30%,#fff6af 0 2%,transparent 15%),linear-gradient(145deg,#a34e34,#1e1621 70%)'}
];

const defaults = {embedBase:'https://vidrock.ru',playbackMode:'same',mood:'luminous',last:null};
const storage = {
  get(){try{return {...defaults,...JSON.parse(localStorage.getItem('glassCinemaV4') || '{}')}}catch{return {...defaults}}},
  set(part){localStorage.setItem('glassCinemaV4',JSON.stringify({...this.get(),...part}))}
};
function safeBase(value){try{const u=new URL(value);if(u.protocol!=='https:') throw new Error();return u.href.replace(/\/$/,'')}catch{return ''}}
function routeFor(item){const s=storage.get();const base=safeBase(s.embedBase);if(!base||!item)return '';const season=Math.max(1,Number($('#season').value)||1);const episode=Math.max(1,Number($('#episode').value)||1);return item.type==='movie'?`${base}/movie/${encodeURIComponent(item.id)}`:`${base}/tv/${encodeURIComponent(item.id)}/${season}/${episode}`}
function selectItem(item){selected={...item};mediaType=item.type;document.querySelectorAll('.type').forEach(b=>b.classList.toggle('active',b.dataset.type===mediaType));$('#episodeFields').hidden=mediaType!=='tv';$('#search').value=String(item.id);$('#clearSearch').hidden=false;$('#selectionTitle').textContent=item.title;$('#selectionMeta').textContent=`${item.meta||item.type} · TMDB ${item.id}${item.type==='tv'?' · choose season and episode':''}`;$('#statusDot').classList.add('ready');$('#copyIdBtn').disabled=false;$('#directOpenBtn').disabled=false;$('#heroTitle').innerHTML=item.title.replace(/: /g,':<br>');$('#eyebrow').textContent=item.type==='tv'?'SERIES SELECTED':'FILM SELECTED';$('#heroText').textContent=`Ready to open ${item.title} using the iPad-compatible playback route.`;storage.set({last:item});$('#resumeBtn').hidden=true}
function selectFromInput(){const q=$('#search').value.trim();if(!/^\d+$/.test(q)){const hit=curated.find(x=>x.title.toLowerCase()===q.toLowerCase());if(hit)return selectItem(hit);$('#selectionTitle').textContent='Enter a TMDB number';$('#selectionMeta').textContent='Title search is available for the curated collection. Other titles need their numeric TMDB identifier.';return null}const hit=curated.find(x=>String(x.id)===q);const fallback={id:q,type:mediaType,title:`TMDB ${q}`,meta:mediaType==='tv'?'Series':'Film'};selectItem(hit||fallback);return selected}
function play(){const item=selected||selectFromInput();if(!item)return;const url=routeFor(item);if(!url)return alert('Set a valid HTTPS player address in Settings.');const mode=storage.get().playbackMode;if(mode==='new'){window.open(url,'_blank','noopener,noreferrer')}else if(mode==='embed'){$('#embedTitle').textContent=item.title;$('#embed').src=url;$('#embedLayer').hidden=false}else{location.href=url}}
function renderCards(){const root=$('#cards');root.replaceChildren();for(const item of curated){const button=document.createElement('button');button.className='card';button.style.setProperty('--card-bg',item.bg);button.innerHTML=`<small>${item.meta}</small><strong>${item.title}</strong>`;button.addEventListener('click',()=>{selectItem(item);window.scrollTo({top:document.querySelector('.command').offsetTop-12,behavior:'smooth'})});root.append(button)}}
function setMood(mood){document.body.classList.remove('mood-cinema','mood-nocturne');if(mood!=='luminous')document.body.classList.add(`mood-${mood}`);document.querySelectorAll('.mood-chip').forEach(b=>b.classList.toggle('active',b.dataset.mood===mood));storage.set({mood})}

document.querySelector('.type-switch').addEventListener('click',e=>{const t=e.target.closest('[data-type]');if(!t)return;mediaType=t.dataset.type;selected=null;document.querySelectorAll('.type').forEach(b=>b.classList.toggle('active',b===t));$('#episodeFields').hidden=mediaType!=='tv';$('#selectionTitle').textContent='Nothing selected';$('#selectionMeta').textContent='Enter a numeric TMDB identifier, or choose one of the curated titles below.';$('#statusDot').classList.remove('ready')});
$('#search').addEventListener('input',()=>{$('#clearSearch').hidden=!$('#search').value;selected=null});
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter')play()});
$('#clearSearch').onclick=()=>{$('#search').value='';$('#clearSearch').hidden=true;selected=null;$('#search').focus()};
$('#playBtn').onclick=play;$('#focusSearch').onclick=()=>{document.querySelector('.command').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('#search').focus(),350)};
$('#homeBtn').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
$('#copyIdBtn').onclick=async()=>{if(!selected)return;try{await navigator.clipboard.writeText(String(selected.id));$('#copyIdBtn').textContent='Copied';setTimeout(()=>$('#copyIdBtn').textContent='Copy ID',1200)}catch{}};
$('#directOpenBtn').onclick=()=>{const item=selected||selectFromInput();const url=routeFor(item);if(url)location.href=url};
document.querySelector('.mood-row').addEventListener('click',e=>{const b=e.target.closest('[data-mood]');if(b)setMood(b.dataset.mood)});
function openSettings(){const s=storage.get();$('#embedBase').value=s.embedBase;$('#playbackMode').value=s.playbackMode;$('#settings').hidden=false}
$('#settingsBtn').onclick=openSettings;$('#closeSettings').onclick=$('#cancelSettings').onclick=()=>$('#settings').hidden=true;
$('#settingsForm').onsubmit=e=>{e.preventDefault();const embedBase=safeBase($('#embedBase').value);if(!embedBase)return alert('Enter a valid HTTPS address.');storage.set({embedBase,playbackMode:$('#playbackMode').value});$('#settings').hidden=true};
$('#closeEmbed').onclick=()=>{$('#embedLayer').hidden=true;$('#embed').src='about:blank'};
$('#externalEmbed').onclick=()=>{const url=routeFor(selected);if(url)location.href=url};
$('#installBtn').onclick=()=>alert('In Safari, tap Share, then Add to Home Screen.');
$('#resumeBtn').onclick=()=>{const last=storage.get().last;if(last){selectItem(last);play()}};

(function init(){renderCards();const s=storage.get();setMood(s.mood);if(window.matchMedia('(display-mode: standalone)').matches)$('#installBtn').hidden=true;if(s.last){$('#resumeBtn').hidden=false;$('#resumeBtn').textContent=`Resume ${s.last.title}`;}if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{})})();
