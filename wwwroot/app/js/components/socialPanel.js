import { listenMatchLog, updateMatchLogEntry, listenBranding } from '../firebase.js';
import { generateSocialAssets } from '../socialAssets.js';
import { renderBrandingModal } from './brandingModal.js';

export function renderSocialPanel(container, eventId) {
  class SocialPanel extends HTMLElement {
    connectedCallback() {
      this.eventId = eventId;
      this.logs = [];
      this.templateStyle = 'style1';
      listenBranding(eventId, b => { this.templateStyle = b?.socialTemplateStyle || 'style1'; });
      listenMatchLog(eventId, logs => { this.logs = logs || []; this.render(); });
    }

    async handleGenerate(id) {
      const log = this.logs.find(l => l.id === id);
      if (!log) return;
      const urls = await generateSocialAssets(this.eventId, id, this.templateStyle);
      await updateMatchLogEntry(this.eventId, id, { ...log, social: urls });
    }

    render() {
      this.innerHTML = `
        <top-bar></top-bar>
        <div class="p-4 space-y-6">
          <section>
            <h2 class="font-bold mb-2">Live Match Log</h2>
            <ul class="space-y-2">
              ${this.logs.map(l => `
                <li class="flex justify-between items-center bg-white text-black p-2 rounded">
                  <span>${l.eventType || l.id}</span>
                  <button class="generate control-button btn-sm" data-id="${l.id}">Generate Post</button>
                </li>
              `).join('')}
            </ul>
          </section>
          <section>
            <h2 class="font-bold mb-2">Generated Posts</h2>
            <div class="grid grid-cols-3 gap-4">
              ${this.logs.filter(l => l.social).map(l =>
                Object.entries(l.social).map(([ratio,url]) => `
                  <div class="text-center">
                    <img src="${url}" class="w-full object-cover mb-1" />
                    <a href="${url}" download class="control-button btn-sm">Download</a>
                  </div>
                `).join('')
              ).join('')}
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
