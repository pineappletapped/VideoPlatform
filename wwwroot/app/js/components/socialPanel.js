import { listenMatchLog, updateMatchLogEntry, listenBranding } from '../firebase.js';
import { generateSocialAssets, generateFinalScoreAssets } from '../socialAssets.js';
import { renderBrandingModal } from './brandingModal.js';
import { renderPostStyleModal } from './postStyleModal.js';
import { getDatabaseInstance } from '../firebaseApp.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

function formatTime(secs){
  return `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
}
function parseTime(str){
  const [m='0',s='0'] = str.split(':');
  return parseInt(m)*60 + parseInt(s);
}
function contrastColor(hex){
  let c = hex?.replace('#','') || '';
  if(c.length===3) c = c.split('').map(x=>x+x).join('');
  const r=parseInt(c.substr(0,2)||'0',16);
  const g=parseInt(c.substr(2,2)||'0',16);
  const b=parseInt(c.substr(4,2)||'0',16);
  const lum=(0.299*r+0.587*g+0.114*b)/255;
  return lum>0.6?'#000':'#fff';
}

export function renderSocialPanel(container, eventId) {
  class SocialPanel extends HTMLElement {
    connectedCallback() {
      this.eventId = eventId;
      this.logs = [];
      this.generating = new Set();
      this.templateStyle = 'style1';
      this.branding = null;
      this.styleSettings = {
        includeEventLogo: true,
        eventLogoChoice: 'primary',
        includeBrandLogo: true,
        includePlayerPhotos: true,
        includeTeamLogos: true,
        includeTeamColors: true,
        sponsors: []
      };
      this.scoreboard = null;
      this.teams = null;
      this.finalPost = null;
      this.generatingFinal = false;
      const db = getDatabaseInstance();
      onValue(ref(db, `scoreboard/${eventId}`), snap => { this.scoreboard = snap.val(); this.updateScoreboard(); });
      onValue(ref(db, `teams/${eventId}`), snap => { this.teams = snap.val(); this.updateScoreboard(); });
      listenBranding(eventId, b => {
        this.templateStyle = b?.socialTemplateStyle || 'style1';
        this.branding = b;
        this.updateScoreboard();
      });
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
        const urls = await generateSocialAssets(this.eventId, id, this.templateStyle, this.styleSettings);
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

    async handleGenerateFinal(){
      if(this.generatingFinal) return;
      this.generatingFinal = true;
      this.render();
      try{
        this.finalPost = await generateFinalScoreAssets(this.eventId, this.templateStyle, this.styleSettings);
      }catch(e){
        console.error(e);
        this.finalPost = null;
      }
      this.generatingFinal = false;
      this.render();
    }

    finalBlock() {
      const header = `<div class="mb-2 text-xs font-semibold">Final Score</div>`;
      if (this.finalPost) {
        const imgs = Object.entries(this.finalPost).map(([ratio,url])=>`
          <div class="text-center">
            <img src="${url}" class="w-full object-cover mb-1" />
            <a href="${url}" download class="control-button btn-sm">Download</a>
          </div>`).join('');
        return `<div class="border p-2">${header}<div class="grid grid-cols-3 gap-2">${imgs}</div></div>`;
      }
      if (this.generatingFinal) {
        return `<div class="border p-2">${header}
          <div class="w-full h-32 bg-gray-200 animate-pulse mb-2"></div>
          <div class="w-full h-2 bg-gray-200 overflow-hidden"><div class="h-full w-full animate-pulse" style="background: var(--brand-color,#e16316)"></div></div>
        </div>`;
      }
      return '';
    }

    getTeam(key){
      if(!this.teams) return {name:'',color:'#333'};
      if(this.teams.teams){
        const idx = key==='a' ? (this.teams.currentA||0) : (this.teams.currentB||1);
        return this.teams.teams[idx] || {name:'',color:'#333'};
      }
      return key==='a' ? (this.teams.teamA || {name:'',color:'#333'}) : (this.teams.teamB || {name:'',color:'#333'});
    }

    updateScoreboard(){
      const el = this.querySelector('#scoreboard');
      if(!el) return;
      if(!this.scoreboard || !this.teams){
        el.innerHTML = '<div class="text-gray-500 text-sm">No scoreboard data</div>';
        return;
      }
      const tA = this.getTeam('a');
      const tB = this.getTeam('b');
      const names = [tA.name, tB.name];
      const colors = [tA.color||'#333', tB.color||'#333'];
      const longest = Math.max(names[0].length, names[1].length);
      const brand = this.branding?.brandColor || '#e16316';
      const textA = contrastColor(colors[0]);
      const textB = contrastColor(colors[1]);
      const textBrand = contrastColor(brand);
      let timeStr = this.scoreboard.time || '';
      if(this.scoreboard.timerRunning && this.scoreboard.timerStart){
        const elapsed = Math.floor((Date.now() - this.scoreboard.timerStart)/1000);
        const base = this.scoreboard.timerBase || parseTime(timeStr || '0:00');
        const down = (this.scoreboard.timeDirection || 'up') === 'down';
        const secs = down ? Math.max(0, base - elapsed) : base + elapsed;
        timeStr = formatTime(secs);
      }
      const info = [];
      if(timeStr) info.push(timeStr);
      if(this.scoreboard.period) info.push('P'+this.scoreboard.period);
      el.innerHTML = `<div class='sb-container sb-style1' style='--sb-team-width:${longest}ch;font-size:1.5rem;'>
          <div class='sb-row'>
            <span class='sb-team' style='background:${colors[0]};color:${textA}'>${names[0]}</span>
            <span class='sb-score' style='background:${brand};color:${textBrand}'>${this.scoreboard.scores?.[0]??0} | ${this.scoreboard.scores?.[1]??0}</span>
            <span class='sb-team' style='background:${colors[1]};color:${textB}'>${names[1]}</span>
          </div>
          ${info.length?`<div class='sb-info'>${info.join(' | ')}</div>`:''}
        </div>`;
    }

    render() {
      this.innerHTML = `
        <top-bar></top-bar>
        <div class="p-4">
          <div id="scoreboard" class="mb-4"></div>
          <div class="mb-4 flex items-center gap-2 text-sm">
            <label class="font-semibold">Post Style</label>
            <select id="style-select" class="border p-1">
              <option value="style1" ${this.templateStyle==='style1'?'selected':''}>Style 1</option>
              <option value="style2" ${this.templateStyle==='style2'?'selected':''}>Style 2</option>
              <option value="style3" ${this.templateStyle==='style3'?'selected':''}>Style 3</option>
            </select>
            <button id="edit-style" class="control-button btn-sm">Edit Style</button>
          </div>
          <div class="grid grid-cols-2 gap-6">
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
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-bold">Generated Posts</h2>
              <button id="generate-final" class="control-button btn-sm">Final Score Post</button>
            </div>
            <div class="space-y-4">
              ${this.finalBlock()}${this.logs.map(l => this.postBlock(l)).join('') || '<div class="text-gray-500 text-sm">No posts yet.</div>'}
            </div>
          </section>
          </div>
        </div>
      `;
      this.querySelectorAll('button.generate').forEach(btn => {
        btn.onclick = () => this.handleGenerate(btn.dataset.id);
      });
      const finalBtn = this.querySelector('#generate-final');
      if(finalBtn) finalBtn.onclick = () => this.handleGenerateFinal();
      const styleSel = this.querySelector('#style-select');
      styleSel.onchange = () => { this.templateStyle = styleSel.value; };
      this.querySelector('#edit-style').onclick = () => {
        let modal = document.getElementById('post-style-modal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'post-style-modal'; document.body.appendChild(modal); }
        renderPostStyleModal(modal, {
          branding: this.branding || {},
          settings: this.styleSettings,
          onSave: opts => { this.styleSettings = opts; modal.classList.add('hidden'); }
        });
      };
      const top = this.querySelector('top-bar');
      top.addEventListener('brand-settings', () => {
        let modal = document.getElementById('branding-modal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'branding-modal'; document.body.appendChild(modal); }
        renderBrandingModal(modal, { eventId: this.eventId });
        modal.classList.remove('hidden');
      });
      this.updateScoreboard();
    }
  }
  if (!customElements.get('social-panel')) customElements.define('social-panel', SocialPanel);
  container.innerHTML = '<social-panel></social-panel>';
}
