import { onAuth, login, register, logout } from './auth.js';
import { getAllEventsMetadata, setEventMetadata, getUser } from './firebase.js';
import './components/topBar.js';
import { renderBrandingModal } from './components/brandingModal.js';
let SQUARE_APP_ID = '';
let SQUARE_LOCATION_ID = '';
let SQUARE_PLANS = {};
import { sportsData } from './sportsConfig.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await import('../squareConfig.js');
    SQUARE_APP_ID = cfg.SQUARE_APP_ID;
    SQUARE_LOCATION_ID = cfg.SQUARE_LOCATION_ID;
    SQUARE_PLANS = cfg.SQUARE_PLANS;
  } catch (e) {
    console.warn('Square config missing', e);
  }
  const topBar = document.createElement('top-bar');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
  topBar.addEventListener('brand-settings', () => showBrandModal(currentUserId));
  topBar.addEventListener('admin-panel', () => { window.location.href = 'admin.html'; });
  document.getElementById('top-bar').appendChild(topBar);
  const authSection = document.getElementById('auth');
  const dashSection = document.getElementById('dashboard');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const showRegBtn = document.getElementById('show-register');
  const hideRegBtn = document.getElementById('hide-register');
  const loginError = document.getElementById('login-error');
  const openCreateBtn = document.getElementById('open-create');
  const createModal = document.getElementById('create-modal');
  const eventsList = document.getElementById('events-list');
  const signoutBtn = document.getElementById('signout-btn');
  const adminBtn = document.getElementById('admin-btn');
  let card, payments;
  let currentUserId = '';
  function showBrandModal(uid) {
    const modal = document.getElementById('branding-modal');
    renderBrandingModal(modal, { userId: uid });
    modal.classList.remove('hidden');
  }

  async function loadEvents() {
    const events = await getAllEventsMetadata() || {};
    eventsList.innerHTML = Object.keys(events).map(id => {
      const ev = events[id];
      const name = ev.title || id;
      const gfx = `graphics.html?event_id=${id}`;
      const ovl = `overlay.html?event_id=${id}`;
      const sportsLink = ev.eventType === 'sports'
        ? `<a class="control-button btn-sm" href="sports.html?event_id=${id}">Sports Admin</a>`
        : '';
      return `<li class="bg-white p-3 rounded shadow">
        <div class="font-semibold">${name}</div>
        <div class="text-xs text-gray-500 mb-2">${id}</div>
        <a class="control-button btn-sm" href="${gfx}">Graphics</a>
        <a class="control-button btn-sm" href="${ovl}" target="_blank">Overlay</a>
        ${sportsLink}
      </li>`;
    }).join('');
  }

  onAuth(async user => {
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    if (user && Date.now() - loginTime < 8 * 60 * 60 * 1000) {
      authSection.classList.add('hidden');
      dashSection.classList.remove('hidden');
      currentUserId = user.uid.replace('local-','');
      const isAdmin = user.email === 'ryanadmin';
      topBar.setAttribute('is-admin', isAdmin);
      if (isAdmin) adminBtn.classList.remove('hidden'); else adminBtn.classList.add('hidden');
      const uData = await getUser(currentUserId) || {};
      if (!uData.subscription_id && user.email !== 'ryanadmin') {
        alert('No active subscription found for this account.');
        await logout();
        return;
      }
      loadEvents();
    } else {
      authSection.classList.remove('hidden');
      dashSection.classList.add('hidden');
      adminBtn.classList.add('hidden');
    }
  });

  loginForm.onsubmit = async e => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const data = Object.fromEntries(new FormData(loginForm));
    try {
      await login(data.email.trim(), data.password);
      const params = new URLSearchParams(window.location.search);
      const target = params.get('redirect');
      if (target) {
        window.location.href = target;
      } else {
        window.location.reload();
      }
    } catch (err) {
      loginError.textContent = 'Invalid email or password';
      loginError.classList.remove('hidden');
    }
  };

  showRegBtn.onclick = () => {
    regForm.classList.remove('hidden');
    showRegBtn.classList.add('hidden');
    loginError.classList.add('hidden');
  };

  hideRegBtn.onclick = () => {
    regForm.classList.add('hidden');
    showRegBtn.classList.remove('hidden');
    loginError.classList.add('hidden');
  };

  async function initPayments() {
    if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) return;
    const mod = await window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    payments = mod;
    card = await payments.card();
    await card.attach('#card-container');
  }

  initPayments();

  regForm.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm));
    try {
      let subId = '';
      if (card) {
        const result = await card.tokenize();
        if (result.status !== 'OK') throw new Error('Card error');
        const res = await fetch('create-subscription.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nonce: result.token,
            tier: data.tier,
            email: data.email
          })
        });
        const sub = await res.json();
        if (!res.ok) throw new Error(sub.error || 'Subscription failed');
        subId = sub.subscription_id;
      }
      await register(data.email, data.password, data.tier, subId);
    } catch (err) {
      alert('Registration failed: ' + err.message);
    }
  };

  signoutBtn.onclick = () => logout();
  adminBtn.onclick = () => { window.location.href = 'admin.html'; };

  function showCreateModal() {
    const genId = 'ev' + Date.now().toString(36);
    createModal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-window">
          <h2 class="font-bold mb-2">Create Event</h2>
          <form id="create-form">
            <input name="id" class="border p-1 w-full mb-2" readonly value="${genId}" />
            <input name="title" placeholder="Event Title" class="border p-1 w-full mb-2" required />
            <select name="eventType" id="create-type" class="border p-1 w-full mb-2">
              <option value="corporate">Corporate Event</option>
              <option value="sports">Sports Event</option>
            </select>
            <div id="sport-wrap" class="mb-2 hidden">
              <select name="sport" class="border p-1 w-full">
                ${Object.keys(sportsData).map(s=>`<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="flex gap-2 mt-2">
              <button type="submit" class="control-button btn-sm">Create</button>
              <button type="button" id="create-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
    createModal.classList.remove('hidden');
    const form = createModal.querySelector('#create-form');
    const typeSel = createModal.querySelector('#create-type');
    const sportWrap = createModal.querySelector('#sport-wrap');
    typeSel.onchange = () => {
      sportWrap.style.display = typeSel.value === 'sports' ? 'block' : 'none';
    };
    createModal.querySelector('#create-cancel').onclick = () => {
      createModal.classList.add('hidden');
      createModal.innerHTML = '';
    };
    form.onsubmit = async ev => {
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const meta = { title: data.title, eventType: data.eventType };
      if (data.eventType === 'sports') meta.sport = data.sport;
      await setEventMetadata(data.id, meta);
      window.location.href = `graphics.html?event_id=${data.id}&setup=1`;
    };
  }

  openCreateBtn.onclick = showCreateModal;
});
