import { requireAuth, logout, getLocalUsers, saveLocalUsers, hashPassword } from './auth.js';
import { getUser, updateUser, getPlanFeatures } from './firebase.js';
import './components/topBar.js';

async function init() {
  const user = await requireAuth('account.html');
  if (user.role && user.role !== 'userAdmin') {
    document.getElementById('account-panel').textContent = 'Access restricted.';
    return;
  }
  const uid = user.uid.replace('local-','');
  const topBar = document.createElement('top-bar');
  if (user.email === 'ryanadmin') topBar.setAttribute('is-admin','true');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('admin-panel', () => window.location.href = 'admin.html');
  topBar.addEventListener('brand-settings', () => {});
  topBar.addEventListener('edit-account', () => {});
  document.getElementById('top-bar').appendChild(topBar);

  const remoteInfo = await getUser(uid) || {};
  const locals = getLocalUsers();
  const localInfo = locals[user.email] || {};
  let tier = remoteInfo.tier || localInfo.tier || 'bronze';
  let subId = remoteInfo.subscription_id || localInfo.subscription_id || '';
  const features = await getPlanFeatures().catch(()=>({}));
  const canSubUsers = features?.[tier]?.subAccounts;
  renderPanel(user.email, tier, subId, async newTier => {
    tier = newTier;
    if (locals[user.email]) {
      locals[user.email].tier = newTier;
      saveLocalUsers(locals);
    }
    await updateUser(uid, { tier: newTier });
  }, async () => {
    subId = '';
    if (locals[user.email]) {
      delete locals[user.email].subscription_id;
      saveLocalUsers(locals);
    }
    await updateUser(uid, { subscription_id: '' });
  }, async pw => {
    if (locals[user.email]) {
      locals[user.email].passwordHash = await hashPassword(pw);
      saveLocalUsers(locals);
      return Promise.resolve();
    }
    alert('Password change not implemented for remote accounts');
    return Promise.resolve();
  }, canSubUsers, user.email);
}

function renderPanel(email, tier, subId, onTierChange, onCancel, onChangePw, canSubUsers, parentEmail) {
  const div = document.getElementById('account-panel');
  div.innerHTML = `
    <h1 class="text-2xl font-bold mb-4">Account</h1>
    <div class="space-y-4">
      <p>Signed in as <span class="font-semibold">${email}</span></p>
      <p>Current tier: <span id="acc-tier" class="font-semibold">${tier}</span></p>
      <p id="acc-sub">Subscription ID: ${subId || 'none'}</p>
      <div class="space-x-2">
        <button id="upgrade" class="control-button btn-sm">Upgrade</button>
        <button id="downgrade" class="control-button btn-sm">Downgrade</button>
        <button id="cancel" class="control-button btn-sm bg-red-600 hover:bg-red-700">Cancel</button>
      </div>
      <div>
        <h2 class="font-semibold mt-4">Change Password</h2>
        <form id="pw-form" class="flex gap-2 mt-2">
          <input type="password" name="pw" class="border p-1 text-black" placeholder="New password" required />
          <button class="control-button btn-sm">Change</button>
        </form>
        <div id="pw-msg" class="hidden text-sm"></div>
      </div>
      ${canSubUsers ? `
      <div id="sub-users" class="mt-6">
        <h2 class="font-semibold">Sub Users</h2>
        <ul id="sub-users-list" class="mt-2 space-y-1"></ul>
        <form id="sub-user-form" class="flex flex-wrap gap-2 mt-2">
          <input type="email" name="email" class="border p-1 text-black" placeholder="Email" required />
          <input type="password" name="pw" class="border p-1 text-black" placeholder="Password" required />
          <select name="role" class="border p-1 text-black">
            <option value="producer">Producer</option>
            <option value="sportsAdmin">Sports Admin</option>
          </select>
          <input type="text" name="events" class="border p-1 text-black" placeholder="Event IDs" />
          <button class="control-button btn-sm">Add</button>
        </form>
      </div>` : ''}
    </div>`;
  const plans = ['bronze','silver','gold'];
  div.querySelector('#upgrade').onclick = async () => {
    const idx = plans.indexOf(tier);
    if (idx < plans.length - 1) {
      await onTierChange(plans[idx+1]);
      tier = plans[idx+1];
      div.querySelector('#acc-tier').textContent = tier;
    }
  };
  div.querySelector('#downgrade').onclick = async () => {
    const idx = plans.indexOf(tier);
    if (idx > 0) {
      await onTierChange(plans[idx-1]);
      tier = plans[idx-1];
      div.querySelector('#acc-tier').textContent = tier;
    }
  };
  div.querySelector('#cancel').onclick = async () => {
    await onCancel();
    div.querySelector('#acc-sub').textContent = 'Subscription ID: none';
  };
  div.querySelector('#pw-form').onsubmit = async ev => {
    ev.preventDefault();
    const pw = new FormData(ev.target).get('pw');
    await onChangePw(pw);
    const msg = div.querySelector('#pw-msg');
    msg.textContent = 'Password updated';
    msg.classList.remove('hidden');
  };
  if (canSubUsers) {
    setupSubUsers(div, parentEmail);
  }
}

function setupSubUsers(div, parentEmail) {
  const listEl = div.querySelector('#sub-users-list');
  const form = div.querySelector('#sub-user-form');

  function refresh() {
    const users = getLocalUsers();
    const subs = Object.keys(users).filter(e => users[e].parent === parentEmail);
    listEl.innerHTML = subs.length
      ? subs.map(e => {
          const info = users[e];
          const evs = (info.events || []).join(', ');
          return `<li>${e} - ${info.role || ''} ${evs ? `(<span class="text-xs">${evs}</span>)` : ''} <button data-del="${e}" class="text-red-600">Remove</button></li>`;
        }).join('')
      : '<li class="text-sm text-gray-500">No sub users</li>';
    listEl.querySelectorAll('button[data-del]').forEach(btn => {
      btn.onclick = () => {
        const email = btn.getAttribute('data-del');
        const u = getLocalUsers();
        delete u[email];
        saveLocalUsers(u);
        refresh();
      };
    });
  }
  refresh();

  form.onsubmit = async ev => {
    ev.preventDefault();
    const data = new FormData(form);
    const email = data.get('email');
    const pw = data.get('pw');
    const role = data.get('role');
    const events = (data.get('events') || '').split(',').map(e => e.trim()).filter(Boolean);
    const users = getLocalUsers();
    const subs = Object.keys(users).filter(e => users[e].parent === parentEmail);
    if (subs.length >= 5) { alert('Sub user limit reached'); return; }
    if (users[email]) { alert('Email already exists'); return; }
    const hashed = await hashPassword(pw);
    users[email] = { passwordHash: hashed, role, parent: parentEmail, events };
    saveLocalUsers(users);
    form.reset();
    refresh();
  };
}

init();
