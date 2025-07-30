import { onAuth, login, register, logout } from './auth.js';
import { getAllEventsMetadata, setEventMetadata, getUser, getAllUsers, getOverlayState, deleteEvent } from './firebase.js';
import './components/topBar.js';
import { renderBrandingModal } from './components/brandingModal.js';
let SQUARE_APP_ID = '';
let SQUARE_LOCATION_ID = '';
let SQUARE_PLANS = {};
const PLAN_LIMITS = { single: 1, three: 3, eight: 8 };
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
  topBar.addEventListener('edit-account', () => { window.location.href = 'account.html'; });
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
  const regError = document.getElementById('register-error');
  const payMsg = document.getElementById('payment-msg');
  const openCreateBtn = document.getElementById('open-create');
  const createModal = document.getElementById('create-modal');
  const eventsList = document.getElementById('events-list');
  const signoutBtn = document.getElementById('signout-btn');
  const adminBtn = document.getElementById('admin-btn');
  const allowanceDiv = document.getElementById('event-allowance');
  let card, payments;
  let currentUserId = '';
  let currentUserTier = 'single';
  function showBrandModal(uid) {
    const modal = document.getElementById('branding-modal');
    renderBrandingModal(modal, { userId: uid });
    modal.classList.remove('hidden');
  }

  async function loadEvents() {
    const all = await getAllEventsMetadata() || {};
    const isAdmin = topBar.getAttribute('is-admin') === 'true';
    const entries = Object.keys(all).filter(id => {
      const ev = all[id];
      return isAdmin || ev.owner === currentUserId;
    }).map(id => ({ id, data: all[id] }));
    const states = await Promise.all(entries.map(e => getOverlayState(e.id).catch(()=>null)));
    const html = entries.map((entry, idx) => {
      const ev = entry.data;
      const id = entry.id;
      const name = ev.title || id;
      const typeInfo = ev.eventType === 'sports' ? `Sports Event > ${ev.sport}` : 'Corporate Event';
      const gfx = `graphics.html?event_id=${id}`;
      const ovl = `overlay.html?event_id=${id}`;
      const sportsLink = ev.eventType === 'sports'
        ? `<a class="control-button btn-sm" href="sports.html?event_id=${id}">Sports Admin</a>`
        : '';
      const imgSrc = states[idx]?.holdslate?.image;
      const img = imgSrc ?
        `<img src="${imgSrc}" alt="thumb" class="w-24 h-16 object-cover rounded" />` :
        `<div class="w-24 h-16 bg-gray-300 flex items-center justify-center rounded text-xs text-gray-500">No image</div>`;
      return `<li class="bg-white text-black p-3 rounded shadow flex items-center gap-3">
        ${img}
        <div class="flex-1">
          <div class="font-semibold">${name}</div>
          <div class="text-xs text-gray-600">${typeInfo}</div>
          <div class="text-xs text-gray-500 mb-1">${id}</div>
          <div>
            <a class="control-button btn-sm" href="${gfx}">Graphics</a>
            <a class="control-button btn-sm" href="${ovl}" target="_blank">Overlay</a>
            ${sportsLink}
            <button class="control-button btn-sm bg-red-600 hover:bg-red-700" data-del="${id}">Delete</button>
          </div>
        </div>
      </li>`;
    }).join('');
    eventsList.innerHTML = html;
    eventsList.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-del');
        if (confirm('Delete this event?')) {
          await deleteEvent(id);
          loadEvents();
        }
      };
    });
    const limit = PLAN_LIMITS[currentUserTier] || 1;
    const count = entries.length;
    allowanceDiv.innerHTML = `Events used: ${count}/${limit}` + (count >= limit ? ` <a href="account.html" class="underline text-brand">Upgrade</a>` : '');
    openCreateBtn.disabled = count >= limit;
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
      const locals = JSON.parse(localStorage.getItem('localUsers') || '{}');
      const localInfo = locals[user.email] || {};
      currentUserTier = uData.tier || localInfo.tier || 'single';
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
    regError.classList.add('hidden');
  };

  hideRegBtn.onclick = () => {
    regForm.classList.add('hidden');
    showRegBtn.classList.remove('hidden');
    loginError.classList.add('hidden');
    regError.classList.add('hidden');
  };

  async function initPayments() {
    if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
      payMsg.textContent = 'Payment gateway not configured - subscription will be skipped.';
      return;
    }
    const mod = await window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    payments = mod;
    card = await payments.card();
    await card.attach('#card-container');
    payMsg.textContent = '';
  }

  initPayments();

  regForm.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm));
    regError.classList.add('hidden');
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passRegex.test(data.password)) {
      regError.textContent = 'Password must be 8+ chars with upper, lower, number and symbol.';
      regError.classList.remove('hidden');
      return;
    }
    const users = await getAllUsers() || {};
    const emailExistsRemote = Object.values(users).some(u => (u.email || '').toLowerCase() === data.email.toLowerCase());
    const localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}');
    if (emailExistsRemote || localUsers[data.email]) {
      regError.textContent = 'Email already registered';
      regError.classList.remove('hidden');
      return;
    }
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
      try {
        await fetch('send-confirmation.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email })
        });
      } catch (e) {
        console.warn('Failed to send confirmation', e);
      }
      window.location.reload();
    } catch (err) {
      regError.textContent = err.message;
      regError.classList.remove('hidden');
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
            <input type="hidden" name="id" value="${genId}" />
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
      const meta = { title: data.title, eventType: data.eventType, owner: currentUserId };
      if (data.eventType === 'sports') meta.sport = data.sport;
      await setEventMetadata(data.id, meta);
      window.location.href = `graphics.html?event_id=${data.id}&setup=1`;
    };
  }

  openCreateBtn.onclick = showCreateModal;
});
