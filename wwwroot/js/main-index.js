import { onAuth, login, register, logout } from './auth.js';
import { getAllEventsMetadata, setEventMetadata } from './firebase.js';
import './components/topBar.js';

document.addEventListener('DOMContentLoaded', () => {
  const topBar = document.createElement('top-bar');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
  document.getElementById('top-bar').appendChild(topBar);
  const authSection = document.getElementById('auth');
  const dashSection = document.getElementById('dashboard');
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const createForm = document.getElementById('create-form');
  const eventsList = document.getElementById('events-list');
  const signoutBtn = document.getElementById('signout-btn');

  async function loadEvents() {
    const events = await getAllEventsMetadata() || {};
    eventsList.innerHTML = Object.keys(events).map(id => {
      const ev = events[id];
      const name = ev.title || id;
      const ctl = `control.html?event_id=${id}`;
      const gfx = `graphics.html?event_id=${id}`;
      const ovl = `overlay.html?event_id=${id}`;
      const lst = `listener.html?event_id=${id}`;
      const sport = `sports.html?event_id=${id}`;
      return `<li class="bg-white p-3 rounded shadow"><div class="font-semibold">${name}</div><div class="text-xs text-gray-500 mb-2">${id}</div><a class="control-button btn-sm" href="${ctl}">Control</a> <a class="control-button btn-sm" href="${gfx}">Graphics</a> <a class="control-button btn-sm" href="${ovl}" target="_blank">Overlay</a> <a class="control-button btn-sm" href="${sport}">Sports</a> <a class="control-button btn-sm" href="${lst}">Listener</a></li>`;
    }).join('');
  }

  onAuth(user => {
    const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
    if (user && Date.now() - loginTime < 8 * 60 * 60 * 1000) {
      authSection.classList.add('hidden');
      dashSection.classList.remove('hidden');
      loadEvents();
    } else {
      authSection.classList.remove('hidden');
      dashSection.classList.add('hidden');
    }
  });

  loginForm.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));
    try {
      await login(data.email, data.password);
    } catch (err) {
      alert('Login failed');
    }
  };

  regForm.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(regForm));
    try {
      await register(data.email, data.password);
    } catch (err) {
      alert('Registration failed');
    }
  };

  signoutBtn.onclick = () => logout();

  createForm.onsubmit = async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(createForm));
    await setEventMetadata(data.id, { title: data.title });
    createForm.reset();
    loadEvents();
  };
});
