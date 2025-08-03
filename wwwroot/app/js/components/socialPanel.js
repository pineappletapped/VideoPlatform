import { listenMatchLog, updateMatchLogEntry, listenBranding } from '../firebase.js';
import { generateSocialAssets } from '../socialAssets.js';
import { renderBrandingModal } from './brandingModal.js';

export function renderSocialPanel(container, eventId) {
  class SocialPanel extends HTMLElement {
    connectedCallback() {
      this.eventId = eventId;
      this.logs = [];
      this.generating = new Set();
      this.templateStyle = 'style1';
      listenBranding(eventId, b => { this.templateStyle = b?.socialTemplateStyle || 'style1'; });
      listenMatchLog(eventId, logs => {
        this.logs = logs || [];
        this.logs.forEach(l => { if (l.social) this.generating.delete(l.id); });
        this.render();
      });
    }

    async handleGenerate(id) {
      if (this.generating.has(id)) return;
      const log = this.logs.find(l => l.id === id);
      if (!log) return;
      this.generating.add(id);
      this.render();
      try {
        const urls = await generateSocialAssets(this.eventId, id, this.templateStyle);
        await updateMatchLogEntry(this.eventId, id, { ...log, social: urls });
      } catch (e) {
        console.error(e);
        this.generating.delete(id);
        this.render();
      }
    }

    logRow(l) {
      const team = l.team === 'a' ? 'Home' : l.team === 'b' ? 'Away' : (l.team || '');
      const type = l.eventType || l.type || '';
      const player = l.playerName || l.player || '';
      const time = l.time || '';
      return `<tr data-id="${l.id}">
          <td class="pr-2">${time}</td>
          <td class="pr-2">${team}</td>
          <td class="pr-2">${type}</td>
          <td class="pr-2">${player}</td>
          <td class="text-right"><button class="generate control-button btn-sm" data-id="${l.id}">Generate</button></td>
        </tr>`;
    }

    postBlock(l) {
      const header = `<div class="mb-2 text-xs font-semibold">${l.time || ''} ${l.eventType || l.type || ''}${l.playerName ? ' - ' + l.playerName : ''}</div>`;
      if (l.social) {
        const imgs = Object.entries(l.social).map(([ratio, url]) => `
          <div class="text-center">
            <img src="${url}" class="w-full object-cover mb-1" />
            <a href="${url}" download class="control-button btn-sm">Download</a>
          </div>`).join('');
        return `<div class="border p-2">${header}<div class="grid grid-cols-3 gap-2">${imgs}</div></div>`;
      }
      if (this.generating.has(l.id)) {
        return `<div class="border p-2">${header}
          <div class="w-full h-32 bg-gray-200 animate-pulse mb-2"></div>
          <div class="w-full h-2 bg-gray-200 overflow-hidden"><div class="h-full w-full animate-pulse" style="background: var(--brand-color,#e16316)"></div></div>
        </div>`;
      }
      return '';
    }

    render() {
      this.innerHTML = `
        <top-bar></top-bar>
        <div class="p-4 grid grid-cols-2 gap-6">
          <section>
            <h2 class="font-bold mb-2">Live Match Log</h2>
            <table class="w-full text-sm">
              <thead><tr><th class="text-left pr-2">Time</th><th class="text-left pr-2">Team</th><th class="text-left pr-2">Type</th><th class="text-left pr-2">Player</th><th></th></tr></thead>
              <tbody>
                ${this.logs.map(l => this.logRow(l)).join('')}
              </tbody>
            </table>
          </section>
          <section id="posts">
            <h2 class="font-bold mb-2">Generated Posts</h2>
            <div class="space-y-4">
              ${this.logs.map(l => this.postBlock(l)).join('') || '<div class="text-gray-500 text-sm">No posts yet.</div>'}
            </div>
          </section>
        </div>
      `;
      this.querySelectorAll('button.generate').forEach(btn => {
        btn.onclick = () => this.handleGenerate(btn.dataset.id);
      });
      const top = this.querySelector('top-bar');
      top.addEventListener('brand-settings', () => {
        let modal = document.getElementById('branding-modal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'branding-modal'; document.body.appendChild(modal); }
        renderBrandingModal(modal, { eventId: this.eventId });
        modal.classList.remove('hidden');
      });
    }
  }
  if (!customElements.get('social-panel')) customElements.define('social-panel', SocialPanel);
  container.innerHTML = '<social-panel></social-panel>';
}
