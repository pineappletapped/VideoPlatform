import { requireAuth, logout } from './auth.js';
import { getUser, updateUser } from './firebase.js';
import './components/topBar.js';

async function init() {
  const user = await requireAuth('account.html');
  const uid = user.uid.replace('local-','');
  const topBar = document.createElement('top-bar');
  if (user.email === 'ryanadmin') topBar.setAttribute('is-admin','true');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('admin-panel', () => window.location.href = 'admin.html');
  topBar.addEventListener('brand-settings', () => {});
  topBar.addEventListener('edit-account', () => {});
  document.getElementById('top-bar').appendChild(topBar);

  const remoteInfo = await getUser(uid) || {};
  const locals = JSON.parse(localStorage.getItem('localUsers') || '{}');
  const localInfo = locals[user.email] || {};
  let tier = remoteInfo.tier || localInfo.tier || 'single';
  let subId = remoteInfo.subscription_id || localInfo.subscription_id || '';
  renderPanel(user.email, tier, subId, async newTier => {
    tier = newTier;
    if (locals[user.email]) {
      locals[user.email].tier = newTier;
      localStorage.setItem('localUsers', JSON.stringify(locals));
    }
    await updateUser(uid, { tier: newTier });
  }, async () => {
    subId = '';
    if (locals[user.email]) {
      delete locals[user.email].subscription_id;
      localStorage.setItem('localUsers', JSON.stringify(locals));
    }
    await updateUser(uid, { subscription_id: '' });
  }, pw => {
    if (locals[user.email]) {
      locals[user.email].password = pw;
      localStorage.setItem('localUsers', JSON.stringify(locals));
      return Promise.resolve();
    }
    alert('Password change not implemented for remote accounts');
    return Promise.resolve();
  });
}

function renderPanel(email, tier, subId, onTierChange, onCancel, onChangePw) {
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
    </div>`;
  const plans = ['single','three','eight'];
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
}

init();
