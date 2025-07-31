import { requireAuth, logout } from './auth.js';
import { getAllUsers, updateUser, getAllEventsMetadata } from './firebase.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderBrandingModal } from './components/brandingModal.js';

const BILLING_PLANS = {
  single: 'Single Event \u00a33.75/month',
  three: '3 Events \u00a36/month',
  eight: '8 Events \u00a315/month'
};

async function init() {
  const user = await requireAuth('admin.html');
  if (user.email !== 'ryanadmin') {
    window.location.href = 'index.html';
    return;
  }

  const topBar = document.createElement('top-bar');
  topBar.setAttribute('is-admin', 'true');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('brand-settings', () => showBrandModal(user.uid));
  topBar.addEventListener('admin-panel', () => {});
  topBar.addEventListener('edit-account', () => window.location.href = 'account.html');
  document.getElementById('top-bar').appendChild(topBar);
  renderStatusBar(document.getElementById('status-bar'), { id:'admin', status:'Admin', firebaseStatus:'Connected' }, { overlay:false, listener:false, sport:false, clock:true, atem:false, obs:false });

  loadUsers();
  loadEvents();
  setupTabs();
}

async function loadUsers() {
  const usersDiv = document.getElementById('users');
  const [users, events] = await Promise.all([
    getAllUsers().catch(()=>({})),
    getAllEventsMetadata().catch(()=>({}))
  ]);
  const eventsByOwner = {};
  Object.keys(events || {}).forEach(eid => {
    const ev = events[eid];
    if (!eventsByOwner[ev.owner]) eventsByOwner[ev.owner] = [];
    eventsByOwner[ev.owner].push({ id:eid, title: ev.title });
  });
  usersDiv.innerHTML = Object.keys(users).map(id => {
    const u = users[id];
    const tier = u.tier || 'single';
    const evList = (eventsByOwner[id]||[]).map(ev=>`<li>${ev.title || ev.id}</li>`).join('');
    return `<div class="bg-white text-black p-3 rounded shadow space-y-2">
      <div class="flex items-center gap-2 user-header" data-id="${id}">
        <span class="flex-1">${u.email || id}</span>
        <select data-id="${id}" class="border p-1">${Object.keys(BILLING_PLANS).map(t => `<option value="${t}"${t===tier?' selected':''}>${BILLING_PLANS[t]}</option>`).join('')}</select>
      </div>
      <ul class="user-events hidden text-sm pl-4 list-disc">${evList || '<li class="text-gray-500">No events</li>'}</ul>
    </div>`;
  }).join('');
  usersDiv.querySelectorAll('select').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.getAttribute('data-id');
      await updateUser(id, { tier: sel.value });
    };
  });
  usersDiv.querySelectorAll('.user-header').forEach(h => {
    h.onclick = ev => {
      if (ev.target.tagName === 'SELECT') return;
      const list = h.parentElement.querySelector('.user-events');
      if (list) list.classList.toggle('hidden');
    };
  });
}

function showBrandModal(userId) {
  let modal = document.getElementById('branding-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'branding-modal';
    document.body.appendChild(modal);
  }
  renderBrandingModal(modal, { userId });
  modal.classList.remove('hidden');
}

async function loadEvents() {
  const eventsDiv = document.getElementById('events');
  if (!eventsDiv) return;

  const [events, users] = await Promise.all([
    getAllEventsMetadata().catch(()=>({})),
    getAllUsers().catch(()=>({}))
  ]);

  const userOptions = Object.keys(users).map(uid =>
    `<option value="${uid}">${users[uid].email || uid}</option>`
  ).join('');

  eventsDiv.innerHTML = `
    <div class="flex gap-2 mb-2">
      <input id="events-search" class="border p-1 flex-1 text-black" placeholder="Search..." />
      <select id="events-user" class="border p-1 text-black">
        <option value="">All Users</option>
        ${userOptions}
      </select>
    </div>
    <div id="events-list" class="space-y-2"></div>`;

  const searchEl = eventsDiv.querySelector('#events-search');
  const userSel = eventsDiv.querySelector('#events-user');
  const listEl = eventsDiv.querySelector('#events-list');

  function renderList() {
    const term = searchEl.value.toLowerCase();
    const owner = userSel.value;
    listEl.innerHTML = Object.keys(events || {}).filter(id => {
      const ev = events[id] || {};
      if (owner && ev.owner !== owner) return false;
      const title = (ev.title || '').toLowerCase();
      return !term || id.toLowerCase().includes(term) || title.includes(term);
    }).map(id => {
      const ev = events[id];
      const ownerEmail = users[ev.owner]?.email || ev.owner || '';
      const typeInfo = ev.eventType === 'sports' ? `Sports > ${ev.sport || ''}` : 'Corporate';
      const last = ev.lastOpened ? new Date(ev.lastOpened).toLocaleString() : 'N/A';
      const sportsBtn = ev.eventType === 'sports' ? `<a class="control-button btn-sm" href="sports.html?event_id=${id}">Sports Admin</a>` : '';
      const commBtn = ev.eventType === 'sports' ? `<a class="control-button btn-sm" href="commentator.html?event_id=${id}" target="_blank">Commentator</a>` : '';
      const speakBtn = `<a class="control-button btn-sm" href="speakers.html?event_id=${id}" target="_blank">Speakers</a>`;
      return `<div class="bg-white text-black p-3 rounded shadow space-y-1">
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <div>${ev.title || id}</div>
            <div class="text-xs text-gray-600">${ownerEmail} &bull; ${typeInfo}</div>
            <div class="text-xs text-gray-500">Last opened: ${last}</div>
          </div>
          <a class="control-button btn-sm" href="graphics.html?event_id=${id}">Graphics</a>
          <a class="control-button btn-sm" href="overlay.html?event_id=${id}" target="_blank">Overlay</a>
          ${sportsBtn} ${commBtn} ${speakBtn}
        </div>
      </div>`;
    }).join('');
  }

  searchEl.oninput = renderList;
  userSel.onchange = renderList;
  renderList();
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tabs [data-tab]');
  const contents = document.querySelectorAll('.tab-content');
  buttons.forEach(btn => {
    btn.onclick = () => {
      const tab = btn.getAttribute('data-tab');
      buttons.forEach(b => b.classList.remove('border-brand','border-b-2'));
      btn.classList.add('border-brand','border-b-2');
      contents.forEach(c => {
        if (c.id === tab) c.classList.remove('hidden'); else c.classList.add('hidden');
      });
    };
  });
}

init();
