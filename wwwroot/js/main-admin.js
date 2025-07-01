import { requireAuth, logout } from './auth.js';
import { getAllUsers, updateUser, getAllEventsMetadata } from './firebase.js';
import './components/topBar.js';
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

  loadUsers();
  loadEvents();
  setupTabs();
}

async function loadUsers() {
  const usersDiv = document.getElementById('users');
  const users = await getAllUsers() || {};
  usersDiv.innerHTML = Object.keys(users).map(id => {
    const u = users[id];
    const tier = u.tier || 'single';
    return `<div class="bg-white text-black p-3 rounded shadow flex items-center gap-2">
      <span class="flex-1">${u.email || id}</span>
      <select data-id="${id}" class="border p-1">${Object.keys(BILLING_PLANS).map(t => `<option value="${t}"${t===tier?' selected':''}>${BILLING_PLANS[t]}</option>`).join('')}</select>
    </div>`;
  }).join('');
  usersDiv.querySelectorAll('select').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.getAttribute('data-id');
      await updateUser(id, { tier: sel.value });
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
  const events = await getAllEventsMetadata() || {};
  eventsDiv.innerHTML = Object.keys(events).map(id => {
    const ev = events[id];
    return `<div class="bg-white text-black p-3 rounded shadow flex items-center gap-2">
      <span class="flex-1">${ev.title || id}</span>
      <a class="control-button btn-sm" href="graphics.html?event_id=${id}">Graphics</a>
      <a class="control-button btn-sm" href="overlay.html?event_id=${id}" target="_blank">Overlay</a>
    </div>`;
  }).join('');
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
