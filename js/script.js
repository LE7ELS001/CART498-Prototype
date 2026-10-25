'use strict';
// Interaction model adapted from Audience V3. Coordinates below are DESIGN pixels,
// not latitude/longitude. Explicit demo distances keep radius filtering consistent.
// Fixed test fixtures: no clock, geolocation, network, or persistent participant state.
const initialSets = Object.freeze([
    { id: 1, name: 'Nora Vale', genre: 'Soul · vocals & guitar', area: 'Acadie park edge', x: 158, y: 242, distance: .18, minutes: 18 },
    { id: 2, name: 'Eric P', genre: 'Electronic music · DJ', area: 'East Quarter square', x: 203, y: 179, distance: .32, minutes: 42 },
    { id: 3, name: 'Milo Reed', genre: 'Jazz · saxophone', area: 'Rockland park edge', x: 118, y: 315, distance: .74, minutes: 28 },
    { id: 4, name: 'Jun & the Loop', genre: 'Indie folk · acoustic duo', area: 'Canal promenade', x: 270, y: 380, distance: 1.24, minutes: 35 }
].map(s => Object.freeze(s)));
let sets = initialSets.map(s => ({ ...s }));
let radius = 1, mode = 'map', selectedId = null, sheetOpen = false, modalOpener = null, resetting = false;
const $ = id => document.getElementById(id);
const visibleSets = () => sets.filter(s => s.distance <= radius);
const selected = () => visibleSets().find(s => s.id === selectedId);
const remaining = s => s.minutes;
const distance = s => s.distance < 1 ? `${Math.round(s.distance * 1000 / 10) * 10}\u00a0m` : `${Number(s.distance.toFixed(2))}\u00a0km`;
const announce = message => { $('status').textContent = message; };
function emptyContent() { return `<div class="empty"><h2>No live sets in this radius</h2><p>Try a wider radius.</p><button class="primary" data-expand>Show 1 km</button></div>`; }
function render() {
    const visible = visibleSets(); if (!selected()) { selectedId = null; sheetOpen = false; }
    const listScroll = $('list-view').scrollTop;
    document.querySelectorAll('[data-radius]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.radius) === radius)));
    $('markers').innerHTML = visible.map(s => `<button class="area" data-id="${s.id}" aria-pressed="${s.id === selectedId}" aria-label="Area ${s.id}. ${s.name}, ${s.genre}, near ${s.area}, approximately ${distance(s)} away. Open preview.">${s.id}</button>`).join('');
    const small = radius <= .5; $('ring').src = `assets/Image/radius-${small ? '500m' : '1km'}.png`;
    $('map-image').src = `assets/Image/${small ? 'map-small' : 'map'}.png`;
    $('cards').innerHTML = visible.length ? visible.map(s => `<article class="card ${s.id === selectedId ? 'selected' : ''}"><button class="card-pick" data-id="${s.id}" aria-pressed="${s.id === selectedId}" aria-label="Select area ${s.id}, ${s.name}. ${s.genre}. Near ${s.area}, approximately ${distance(s)} away. ${remaining(s)} minutes left."><span class="avatar" aria-hidden="true">${s.id}</span><span class="card-info"><span class="name">${s.name}</span><span class="card-text">${s.genre}</span><span class="card-text">Near ${s.area} <span class="distance">≈ ${distance(s)}</span></span><span class="card-time" data-time="${s.id}">${remaining(s)} min left</span></span></button>${s.id === selectedId ? `<button class="primary card-route" data-route="${s.id}" aria-haspopup="dialog" aria-label="Directions to ${s.name} ">Directions</button>` : ''}</article>`).join('') : emptyContent();
    $('list-view').scrollTop = listScroll;
    $('map-empty').hidden = visible.length > 0; $('map-empty').innerHTML = visible.length ? '' : emptyContent();
    updateView();
}
function updateView() {
    $('map-view').hidden = mode !== 'map'; $('list-view').hidden = mode !== 'list';
    $('mode-map').setAttribute('aria-pressed', String(mode === 'map')); $('mode-list').setAttribute('aria-pressed', String(mode === 'list'));
    $('mode-map').querySelector('img').src = `assets/Image/map-icon${mode === 'list' ? '-muted' : ''}.svg`;
    $('mode-list').querySelector('img').src = `assets/Image/list-icon${mode === 'list' ? '-active' : ''}.svg`;
    const s = selected(); $('sheet').hidden = !(mode === 'map' && sheetOpen && s);
    if (s) { $('preview-name').textContent = s.name; $('preview-genre').textContent = s.genre; $('preview-summary').innerHTML = `Near ${s.area} <span class="distance">≈ ${distance(s)} away</span>`; $('preview-time').textContent = `${remaining(s)} min left`; }
    positionMap();
}
// Start with the Figma framing. Translate only enough to clear the sheet, then
// restore this default framing on dismissal. Markers retain 52px touch targets.
function positionMap() {
    if (mode !== 'map' || $('discovery').hidden) return;
    const map = $('map-view'), w = map.clientWidth, h = map.clientHeight;
    const scale = Math.max(w / 362, h / 537), ww = 362 * scale, wh = 537 * scale;
    let left = (w - ww) / 2, top = (h - wh) / 2;
    const s = selected();
    if (s && sheetOpen) {
        const sheetTop = $('sheet').getBoundingClientRect().top - map.getBoundingClientRect().top;
        const cy = top + s.y * scale, limit = sheetTop - 36;
        if (cy > limit) top -= cy - limit;
    }
    Object.assign($('world').style, { width: ww + 'px', height: wh + 'px', left: left + 'px', top: top + 'px' });
    const small = radius <= .5, ringSize = (small ? 146 * (radius / .5) : 225.333 * radius) * scale;
    Object.assign($('ring').style, { left: (small ? 183 : 171.6667) * scale + 'px', top: (small ? 217 : 251.6667) * scale + 'px', width: ringSize + 'px', height: ringSize + 'px' });
    document.querySelectorAll('.area').forEach(b => { const p = sets.find(s => s.id === Number(b.dataset.id)); b.style.left = p.x * scale + 'px'; b.style.top = p.y * scale + 'px'; });
    const mapRect = map.getBoundingClientRect(), sheetRect = $('sheet').hidden ? null : $('sheet').getBoundingClientRect();
    document.querySelectorAll('.area').forEach(b => { const r = b.getBoundingClientRect(); const covered = sheetRect && r.bottom > sheetRect.top; b.tabIndex = r.left >= mapRect.left + 3 && r.right <= mapRect.right - 3 && r.top >= mapRect.top + 3 && r.bottom <= mapRect.bottom - 3 && !covered ? 0 : -1; });
}
function selectPerformer(id, keyboard = false) {
    if (!visibleSets().some(s => s.id === id)) return;
    selectedId = id; sheetOpen = true; render(); $('sheet-body').scrollTop = 0;
    const target = mode === 'map' ? (keyboard ? $('preview-name') : document.querySelector(`#markers [data-id="${id}"]`)) : document.querySelector(`#cards [data-id="${id}"]`);
    target?.focus({ preventScroll: true }); if (mode === 'list') target?.closest('.card').scrollIntoView({ block: 'nearest' });
    const s = selected(); announce(`${s.name} selected. ${s.genre}. Near ${s.area}, approximately ${distance(s)} away. ${remaining(s)} minutes left.${mode === 'map' ? ' Preview open.' : ''}`);
}
function dismissPreview() { sheetOpen = false; updateView(); document.querySelector(`#markers [data-id="${selectedId}"]`)?.focus({ preventScroll: true }); announce('Preview closed. Full map restored.'); }
function setMode(next) { mode = next; updateView(); if (next === 'list' && selected()) document.querySelector(`#cards [data-id="${selectedId}"]`)?.closest('.card').scrollIntoView({ block: 'nearest' }); announce(`${next === 'map' ? 'Map' : 'List'} discovery. ${visibleSets().length} live demo sets.${selected() ? ` ${selected().name} remains selected.` : ''}`); }
function setRadius(value) { const old = selectedId; radius = value; render(); announce(`${visibleSets().length} live demo sets within ${value < 1 ? value * 1000 + ' metres' : value + ' kilometres'}.${old && !selectedId ? ' Previous selection no longer visible.' : ''}`); }
function openModal(dialog, opener) { modalOpener = opener; dialog.showModal(); const heading = dialog.querySelector('h2'); heading.tabIndex = -1; heading.focus(); dialog.scrollTop = 0; }
function openRoute(id, opener) { if (!visibleSets().some(s => s.id === id)) return; openModal($('route-dialog'), opener); }
function resetState() {
    resetting = true; document.querySelectorAll('dialog[open]').forEach(d => d.close()); modalOpener = null;
    sets = initialSets.map(s => ({ ...s })); radius = 1; mode = 'map'; selectedId = null; sheetOpen = false;
    $('list-view').scrollTop = 0; $('sheet-body').scrollTop = 0; render();
    $('preview-name').textContent = ''; $('preview-genre').textContent = ''; $('preview-summary').textContent = ''; $('preview-time').textContent = '';
    $('status').textContent = ''; $('discovery').hidden = true; $('launch').hidden = false;
    document.querySelector('.shell').classList.add('is-launch'); document.querySelector('.shell').scrollTop = 0;
    $('launch-title').focus({ preventScroll: true }); requestAnimationFrame(() => { resetting = false; });
}
function startTest() {
    $('launch').hidden = true; $('discovery').hidden = false; document.querySelector('.shell').classList.remove('is-launch');
    document.querySelector('.shell').scrollTop = 0; render(); $('discovery-title').focus({ preventScroll: true });
}
$('start-test').addEventListener('click', startTest); $('restart-test').addEventListener('click', resetState);
$('filters').addEventListener('click', e => { const b = e.target.closest('[data-radius]'); if (b) setRadius(Number(b.dataset.radius)); });
for (const root of [$('markers'), $('cards')]) root.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) selectPerformer(Number(b.dataset.id), e.detail === 0); const route = e.target.closest('[data-route]'); if (route) openRoute(Number(route.dataset.route), route); });
$('workspace').addEventListener('click', e => { if (e.target.closest('[data-expand]')) { setRadius(1); document.querySelector('[data-radius="1"]').focus({ preventScroll: true }); } });
$('mode-map').addEventListener('click', () => setMode('map')); $('mode-list').addEventListener('click', () => setMode('list'));
$('dismiss').addEventListener('click', dismissPreview);
$('directions-button').addEventListener('click', () => openRoute(selectedId, $('directions-button')));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]') && mode === 'map' && sheetOpen) { e.preventDefault(); dismissPreview(); } });
document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); dialog.querySelector('[data-close]').focus(); } });
    dialog.addEventListener('close', () => { if (resetting || $('discovery').hidden) return; if (modalOpener?.isConnected && !modalOpener.closest('[hidden]')) modalOpener.focus({ preventScroll: true }); else $('mode-' + mode).focus({ preventScroll: true }); });
});
new ResizeObserver(positionMap).observe($('workspace')); new ResizeObserver(positionMap).observe($('sheet'));
render();
