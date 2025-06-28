import { requireAuth, logout } from './auth.js';
import { getAllUsers, updateUser } from './firebase.js';
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
  document.getElementById('top-bar').appendChild(topBar);

  loadUsers();
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

init();
