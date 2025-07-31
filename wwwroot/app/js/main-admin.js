import { requireAuth, logout } from './auth.js';
import { getAllUsers, updateUser, getAllEventsMetadata, getPlanFeatures, updatePlanFeature } from './firebase.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderBrandingModal } from './components/brandingModal.js';

const BILLING_PLANS = {
  bronze: 'Bronze \u00a33.75/month',
  silver: 'Silver \u00a36/month',
  gold: 'Gold \u00a315/month'
};
const PLAN_PRICING = { bronze: 3.75, silver: 6, gold: 15 };
const PLAN_FEATURES = {
  commentator: 'Commentator Panel',
  speaker: 'Speaker Panel',
  tournament: 'Tournament Mode'
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
  loadReporting();
  loadTiers();
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
    const tier = u.tier || 'bronze';
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

async function loadReporting() {
  const div = document.getElementById('reporting');
  if (!div) return;
  const [users, events] = await Promise.all([
    getAllUsers().catch(()=>({})),
    getAllEventsMetadata().catch(()=>({}))
  ]);

  const eventCounts = {};
  Object.keys(events || {}).forEach(id => {
    const owner = events[id].owner;
    if (!eventCounts[owner]) eventCounts[owner] = 0;
    eventCounts[owner]++;
  });

  const stats = {};
  Object.keys(users || {}).forEach(uid => {
    if (users[uid].email === 'ryanadmin') return;
    const tier = users[uid].tier || 'bronze';
    if (!stats[tier]) stats[tier] = { count:0, cancelled:0, events:0 };
    stats[tier].count++;
    if (!users[uid].subscription_id) stats[tier].cancelled++;
    stats[tier].events += eventCounts[uid] || 0;
  });

  const totalUsers = Object.keys(users || {}).filter(id => users[id].email !== 'ryanadmin').length;

  let html = `<p>Total users: <strong>${totalUsers}</strong></p>`;
  html += '<div class="space-y-2">';
  Object.keys(BILLING_PLANS).forEach(tier => {
    const s = stats[tier] || { count:0, cancelled:0, events:0 };
    const paying = s.count - s.cancelled;
    const revenue = paying * (PLAN_PRICING[tier] || 0);
    const avg = s.count ? (s.events / s.count).toFixed(1) : '0';
    html += `<div class="bg-white text-black p-3 rounded shadow">
      <div class="font-semibold">${BILLING_PLANS[tier]}</div>
      <div class="text-sm">Users: ${s.count} &bull; Cancelled: ${s.cancelled} &bull; Revenue: \u00a3${revenue.toFixed(2)} &bull; Avg dashboards: ${avg}</div>
    </div>`;
  });
  html += '</div>';
  div.innerHTML = html;
}

async function loadTiers() {
  const div = document.getElementById('tiers');
  if (!div) return;
  const data = await getPlanFeatures().catch(()=>({}));
  const plans = Object.keys(BILLING_PLANS);
  let html = '<table class="min-w-full bg-white text-black rounded"><thead><tr><th class="p-2 border"></th>';
  plans.forEach(p=>{ html += `<th class="p-2 border capitalize">${p}</th>`; });
  html += '</tr></thead><tbody>';
  Object.keys(PLAN_FEATURES).forEach(feat => {
    html += `<tr><td class="p-2 border font-semibold">${PLAN_FEATURES[feat]}</td>`;
    plans.forEach(p => {
      const checked = data?.[p]?.[feat] ? 'checked' : '';
      html += `<td class="p-2 border text-center"><input type="checkbox" data-plan="${p}" data-feature="${feat}" ${checked}></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  div.innerHTML = html;
  div.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.onchange = () => {
      const plan = cb.getAttribute('data-plan');
      const feat = cb.getAttribute('data-feature');
      updatePlanFeature(plan, feat, cb.checked);
    };
  });
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
