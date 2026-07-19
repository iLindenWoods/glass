const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DB_NAME = 'glassCinemaCatalogueV103';
const STORE = 'catalogues';
const STATE_KEY = 'glassCinemaV103';
const LEGACY_STATE_KEYS = ['glassCinemaV102', 'glassCinemaV101', 'glassCinemaV100', 'glassCinemaV92'];
const MENU_TIMEOUT = 3000;
const defaults = {
  baseUrl: 'https://vidrock.ru',
  type: 'movie',
  recent: [],
  preferTmdb: true,
  pictureMode: 'original'
};

let state = readState();
let mediaType = state.type;
let selected = null;
let catalogues = { movie: [], tv: [] };
let currentRoute = '';
let currentItem = null;
let searchTimer = 0;
let playerMenuTimer = 0;

function readState() {
  for (const key of [STATE_KEY, ...LEGACY_STATE_KEYS]) {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (stored && typeof stored === 'object') {
        const merged = { ...defaults, ...stored };
        merged.recent = Array.isArray(merged.recent) ? merged.recent : [];
        merged.pictureMode = ['original', 'enhanced', 'clear', 'cinema'].includes(merged.pictureMode) ? merged.pictureMode : 'original';
        return merged;
      }
    } catch { /* Ignore invalid legacy data. */ }
  }
  return { ...defaults };
}

function saveState(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* Storage can be unavailable in private or embedded contexts. */ }
}

function validHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.hidden = true; }, 2600);
}

function setStatus(kind, text) {
  const element = $('#catalogueStatus');
  element.className = `catalogue-status${kind ? ` ${kind}` : ''}`;
  $('span', element).textContent = text;
}

function normalizeId(value) {
  const id = String(value ?? '').trim();
  return /^\d+$/.test(id) || /^tt\d+$/i.test(id) ? id : null;
}

function normalizeItem(raw, type) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.tmdb_id ?? raw.tmdbId ?? raw.tmdb ?? raw.imdb_id ?? raw.imdbId ?? raw.imdb;
  const title = raw.title ?? raw.name ?? raw.original_title ?? raw.original_name ?? raw.label;
  const cleanId = normalizeId(id);
  if (!cleanId || !title) return null;
  const year = raw.year ?? String(raw.release_date ?? raw.first_air_date ?? '').slice(0, 4);
  const rawAliases = raw.aliases ?? raw.alternative_titles ?? raw.alternativeTitles ?? raw.alt_titles ?? [];
  const aliases = (Array.isArray(rawAliases) ? rawAliases : [rawAliases])
    .map(value => String(value || '').trim())
    .filter(Boolean);
  return {
    id: cleanId,
    type,
    title: String(title),
    year: String(year || ''),
    aliases,
    imdb: raw.imdb_id ?? raw.imdbId ?? raw.imdb ?? '',
    tmdb: raw.tmdb_id ?? raw.tmdbId ?? raw.tmdb ?? (/^\d+$/.test(cleanId) ? cleanId : '')
  };
}

function extractItems(payload, type) {
  let items = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === 'object') {
    for (const key of ['results', 'items', 'data', 'movies', 'series', 'tv', 'shows']) {
      if (Array.isArray(payload[key])) {
        items = payload[key];
        break;
      }
    }
    if (!items.length) items = Object.values(payload).filter(value => value && typeof value === 'object');
  }
  return items.map(item => normalizeItem(item, type)).filter(Boolean);
}

function mergeItems(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const item of list || []) {
      const key = `${item.type}:${item.id}`;
      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, item);
        continue;
      }
      merged.set(key, {
        ...previous,
        ...item,
        aliases: [...new Set([...(previous.aliases || []), ...(item.aliases || [])])],
        year: item.year || previous.year,
        imdb: item.imdb || previous.imdb,
        tmdb: item.tmdb || previous.tmdb
      });
    }
  }
  return [...merged.values()];
}

async function fetchCuratedCatalogue(type) {
  const filename = type === 'movie' ? 'movie' : 'tv';
  try {
    return extractItems(await fetchJson(`catalogues/curated-${filename}.json`), type);
  } catch {
    return [];
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function dbSet(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch { /* IndexedDB is an optional cache. */ }
}

async function fetchJson(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCatalogue(type) {
  const filename = type === 'movie' ? 'movie' : 'tv';
  try {
    const local = extractItems(await fetchJson(`catalogues/${filename}.json?ts=${Date.now()}`), type);
    if (local.length) return local;
  } catch { /* Try the provider only when same-origin data is unavailable. */ }

  const base = validHttps(state.baseUrl);
  if (!base) throw new Error('Invalid provider URL');
  return extractItems(await fetchJson(`${base.href.replace(/\/$/, '')}/list/${filename}.json`), type);
}

async function loadCatalogues() {
  setStatus('', 'Loading catalogue…');

  let curatedLoaded = 0;
  for (const type of ['movie', 'tv']) {
    const curated = await fetchCuratedCatalogue(type);
    catalogues[type] = curated;
    curatedLoaded += curated.length;
  }

  if (curatedLoaded) {
    setStatus('ready', `${curatedLoaded.toLocaleString()} favourites ready`);
    renderResults($('#titleSearch').value);
  }

  for (const type of ['movie', 'tv']) {
    const curated = catalogues[type];
    let synced = [];

    try {
      synced = await fetchCatalogue(type);
      if (synced.length) await dbSet(type, { saved: Date.now(), list: synced });
    } catch {
      const cached = await dbGet(type);
      if (cached?.list?.length) synced = cached.list;
    }

    catalogues[type] = mergeItems(synced, curated);
  }

  const loaded = catalogues.movie.length + catalogues.tv.length;
  if (loaded) {
    const builtIn = curatedLoaded ? ` · ${curatedLoaded.toLocaleString()} favourites built in` : '';
    setStatus('ready', `${loaded.toLocaleString()} titles ready${builtIn}`);
  } else setStatus('error', 'Catalogue unavailable — IDs still work');
  renderResults($('#titleSearch').value);
}

function setType(type) {
  mediaType = type === 'tv' ? 'tv' : 'movie';
  saveState({ type: mediaType });
  $$('.segment').forEach(button => {
    const active = button.dataset.type === mediaType;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $('#episodeRow').hidden = mediaType !== 'tv';
  selected = null;
  renderSelection();
  renderResults($('#titleSearch').value);
}

function choose(item) {
  if (item.type !== mediaType) setType(item.type);
  selected = item;
  $('#idInput').value = state.preferTmdb && item.tmdb ? item.tmdb : item.id;
  $('#titleSearch').value = item.title;
  $('#results').replaceChildren();
  renderSelection();
  toast(`${item.title} selected`);
}

function renderSelection() {
  const card = $('#selectionCard');
  if (!selected) {
    card.hidden = true;
    $('#quickPlayHeading').textContent = 'Choose a title';
    return;
  }
  card.hidden = false;
  $('#selectedTitle').textContent = selected.title;
  $('#selectedMeta').textContent = [selected.type === 'tv' ? 'Series' : 'Movie', selected.year].filter(Boolean).join(' · ');
  const selectedIdentifier = state.preferTmdb && selected.tmdb ? selected.tmdb : selected.id;
  $('#selectedId').textContent = `${/^tt/i.test(selectedIdentifier) ? 'IMDb' : 'TMDB'} ${selectedIdentifier}`;
  $('#quickPlayHeading').textContent = selected.title;
}

function renderResults(query = '') {
  const root = $('#results');
  root.replaceChildren();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) return;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = [...catalogues.movie, ...catalogues.tv]
    .map(item => {
      const title = item.title.toLocaleLowerCase();
      const searchable = `${item.title} ${(item.aliases || []).join(' ')} ${item.year} ${item.id}`.toLocaleLowerCase();
      if (!tokens.every(token => searchable.includes(token))) return null;
      const score = item.id.toLocaleLowerCase() === normalizedQuery || title === normalizedQuery
        ? 0
        : title.startsWith(normalizedQuery) ? 1 : 2;
      return { item, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.item.title.localeCompare(b.item.title) || a.item.year.localeCompare(b.item.year))
    .slice(0, 36)
    .map(match => match.item);

  if (!matches.length) {
    const message = document.createElement('div');
    message.className = 'result message';
    message.textContent = catalogues.movie.length || catalogues.tv.length ? 'No matching title found.' : 'Catalogue not synced yet; identifiers still work.';
    root.append(message);
    return;
  }

  for (const item of matches) {
    const button = document.createElement('button');
    button.className = 'result';
    button.type = 'button';

    const copy = document.createElement('span');
    copy.className = 'result-copy';
    const title = document.createElement('strong');
    title.className = 'result-title';
    title.textContent = item.title;
    const meta = document.createElement('small');
    meta.textContent = [item.type === 'tv' ? 'Series' : 'Movie', item.year].filter(Boolean).join(' · ');
    copy.append(title, meta);

    const identifier = state.preferTmdb && item.tmdb ? item.tmdb : item.id;
    const idBadge = document.createElement('span');
    idBadge.className = 'result-id';
    const idLabel = document.createElement('small');
    idLabel.textContent = /^tt/i.test(identifier) ? 'IMDb' : 'TMDB';
    const idValue = document.createElement('b');
    idValue.textContent = identifier;
    idBadge.append(idLabel, idValue);

    button.append(copy, idBadge);
    button.addEventListener('click', () => choose(item));
    root.append(button);
  }
}

function routeFor(id) {
  const cleanId = normalizeId(id);
  const base = validHttps(state.baseUrl);
  if (!cleanId || !base) return null;
  const root = base.href.replace(/\/$/, '');
  if (mediaType === 'movie') return `${root}/movie/${encodeURIComponent(cleanId)}`;
  const season = Math.max(1, parseInt($('#season').value, 10) || 1);
  const episode = Math.max(1, parseInt($('#episode').value, 10) || 1);
  return `${root}/tv/${encodeURIComponent(cleanId)}/${season}/${episode}`;
}

function addRecent(item) {
  const recentItem = {
    ...item,
    season: mediaType === 'tv' ? Math.max(1, Number($('#season').value) || 1) : null,
    episode: mediaType === 'tv' ? Math.max(1, Number($('#episode').value) || 1) : null,
    playedAt: Date.now()
  };
  const recent = [recentItem, ...state.recent.filter(entry => !(entry.id === item.id && entry.type === item.type))].slice(0, 40);
  saveState({ recent });
  renderRecent();
}

function useRecent(item, autoplay = false) {
  setType(item.type);
  selected = item;
  $('#idInput').value = item.id;
  if (item.season) $('#season').value = item.season;
  if (item.episode) $('#episode').value = item.episode;
  renderSelection();
  if (autoplay) play();
}

function renderRecent() {
  const root = $('#recentList');
  root.replaceChildren();
  if (!state.recent.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No recent titles yet.';
    root.append(empty);
    return;
  }

  for (const item of state.recent) {
    const button = document.createElement('button');
    button.className = 'recent-chip';
    button.type = 'button';
    button.setAttribute('aria-label', `Continue ${item.title || item.id}`);

    const icon = document.createElement('span');
    icon.className = 'recent-chip-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5z"/></svg>';

    const copy = document.createElement('span');
    copy.className = 'recent-chip-copy';
    const title = document.createElement('strong');
    title.textContent = item.title || `${item.type === 'tv' ? 'Series' : 'Movie'} ${item.id}`;
    const meta = document.createElement('small');
    meta.textContent = item.type === 'tv' && item.season
      ? `Series · S${item.season} E${item.episode || 1} · TMDB ${item.id}`
      : `Movie · TMDB ${item.id}`;
    copy.append(title, meta);
    button.append(icon, copy);
    button.addEventListener('click', () => useRecent(item, true));
    root.append(button);
  }
}

function play() {
  const id = normalizeId($('#idInput').value);
  if (!id) {
    toast('Enter a valid TMDB number or IMDb tt-number.');
    $('#idInput').focus();
    return;
  }

  const route = routeFor(id);
  if (!route) {
    toast('Check the provider address in Settings.');
    return;
  }

  currentRoute = route;
  currentItem = selected || { id, type: mediaType, title: `${mediaType === 'tv' ? 'Series' : 'Movie'} ${id}` };
  addRecent(currentItem);

  $('#playerTitleDisplay strong').textContent = currentItem.title || `${mediaType === 'tv' ? 'Series' : 'Movie'} ${id}`;
  $('#emptyState').hidden = true;
  $('#embedPlayer').hidden = false;
  hidePlayerMenu(false);
  applyFilter(state.pictureMode || 'original', false);

  const frame = $('#playerFrame');
  frame.src = 'about:blank';
  requestAnimationFrame(() => { frame.src = route; });
  toast('Loading inside Glass Cinema…');
}

function closePlayer() {
  hidePlayerMenu(false);
  const frame = $('#playerFrame');
  frame.src = 'about:blank';
  $('#embedPlayer').hidden = true;
  $('#emptyState').hidden = false;
  currentRoute = '';
  currentItem = null;
}

function clearPlayerMenuTimer() {
  if (playerMenuTimer) {
    clearTimeout(playerMenuTimer);
    playerMenuTimer = 0;
  }
}

function armPlayerMenuTimer() {
  clearPlayerMenuTimer();
  if ($('#playerMenu').hidden) return;
  playerMenuTimer = setTimeout(() => hidePlayerMenu(false), MENU_TIMEOUT);
}

function showPlayerMenu() {
  if ($('#embedPlayer').hidden) return;
  const menu = $('#playerMenu');
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  $('#playerMenuScrim').hidden = false;
  $('#revealControls').setAttribute('aria-expanded', 'true');
  $('#revealControls').setAttribute('aria-label', 'Hide Glass Cinema menu');
  armPlayerMenuTimer();
}

function hidePlayerMenu(returnFocus = true) {
  clearPlayerMenuTimer();
  const menu = $('#playerMenu');
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  $('#playerMenuScrim').hidden = true;
  $('#revealControls').setAttribute('aria-expanded', 'false');
  $('#revealControls').setAttribute('aria-label', 'Show Glass Cinema menu');
  if (returnFocus && !$('#embedPlayer').hidden) { try { $('#revealControls').focus({ preventScroll: true }); } catch { $('#revealControls').focus(); } }
}

function togglePlayerMenu() {
  $('#playerMenu').hidden ? showPlayerMenu() : hidePlayerMenu(false);
}

async function fullscreen() {
  hidePlayerMenu(false);
  const target = $('#embedPlayer');
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (target.requestFullscreen) {
      await target.requestFullscreen();
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    } else {
      toast('Use the video player’s own full-screen button.');
    }
  } catch {
    toast('Use the video player’s own full-screen button.');
  }
}

function applyFilter(mode, notify = true) {
  const supported = ['original', 'enhanced', 'clear', 'cinema'];
  const pictureMode = supported.includes(mode) ? mode : 'original';
  const frame = $('#playerFrame');
  const overlay = $('#enhancementScreen');

  frame.classList.remove('filter-enhanced', 'filter-clear', 'filter-cinema');
  overlay.classList.remove('active', 'cinema');
  $('#embedPlayer').dataset.pictureMode = pictureMode;

  if (pictureMode === 'enhanced') {
    frame.classList.add('filter-enhanced');
    overlay.classList.add('active');
  } else if (pictureMode === 'clear') {
    frame.classList.add('filter-clear');
  } else if (pictureMode === 'cinema') {
    frame.classList.add('filter-cinema');
    overlay.classList.add('active', 'cinema');
  }

  $$('.picture-mode').forEach(button => {
    const active = button.dataset.filter === pictureMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  saveState({ pictureMode });
  if (notify) {
    const labels = { original: 'Original', enhanced: 'Enhanced', clear: 'Glass Clear', cinema: 'Cinema' };
    toast(`Picture mode: ${labels[pictureMode]}`);
  }
}

function openSettings() {
  $('#baseUrl').value = state.baseUrl;
  $('#preferTmdb').checked = state.preferTmdb;
  $('#settingsDialog').showModal();
}

function saveSettings(event) {
  const url = validHttps($('#baseUrl').value.trim());
  if (!url) {
    event.preventDefault();
    toast('Enter a valid HTTPS provider address.');
    return;
  }
  saveState({
    baseUrl: url.href.replace(/\/$/, ''),
    preferTmdb: $('#preferTmdb').checked
  });
  loadCatalogues();
  toast('Settings saved');
}

$$('.segment').forEach(button => button.addEventListener('click', () => setType(button.dataset.type)));

$('#titleSearch').addEventListener('input', event => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderResults(event.target.value), 80);
});

$('#titleSearch').addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.currentTarget.value = '';
    $('#results').replaceChildren();
  }
});

$('#idInput').addEventListener('input', () => {
  selected = null;
  renderSelection();
});
$('#idInput').addEventListener('keydown', event => { if (event.key === 'Enter') play(); });

$('#playButton').addEventListener('click', play);
$('#closePlayer').addEventListener('click', closePlayer);
$('#revealControls').addEventListener('pointerdown', event => event.stopPropagation());
$('#revealControls').addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  togglePlayerMenu();
});
$('#closePlayerMenu').addEventListener('click', () => hidePlayerMenu());
$('#playerMenuScrim').addEventListener('click', () => hidePlayerMenu());
$('#fullscreenBtn').addEventListener('click', fullscreen);
$('#openDirect').addEventListener('click', () => {
  hidePlayerMenu(false);
  if (currentRoute) window.location.assign(currentRoute);
});

$$('.picture-mode').forEach(button => {
  button.addEventListener('click', () => {
    applyFilter(button.dataset.filter);
    hidePlayerMenu(false);
  });
});

const menu = $('#playerMenu');
for (const eventName of ['pointerdown', 'pointermove', 'focusin', 'keydown']) {
  menu.addEventListener(eventName, armPlayerMenuTimer);
}
menu.addEventListener('pointerdown', event => event.stopPropagation());

$('#clearSelection').addEventListener('click', () => {
  selected = null;
  $('#idInput').value = '';
  renderSelection();
});

$('#clearRecent').addEventListener('click', () => {
  saveState({ recent: [] });
  renderRecent();
});

$('#settingsBtn').addEventListener('click', openSettings);
$('#saveSettings').addEventListener('click', saveSettings);

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('#titleSearch').focus();
    $('#titleSearch').select();
    return;
  }
  if (event.key !== 'Escape') return;
  if (!$('#playerMenu').hidden) {
    event.preventDefault();
    hidePlayerMenu();
  }
});

$('#playerFrame').addEventListener('load', () => {
  if ($('#playerFrame').src !== 'about:blank' && !$('#embedPlayer').hidden) {
    toast('Player loaded. Its own playback controls remain available.');
  }
});

(async function init() {
  setType(mediaType);
  renderRecent();
  applyFilter(state.pictureMode || 'original', false);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js?v=10.3', { updateViaCache: 'none' }).then(registration => registration.update()).catch(() => {});
  }
  await loadCatalogues();
})();
