import { listenMatchLog, updateMatchLogEntry, listenBranding, listenTeams } from '../firebase.js';
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
      this.renderBase();

      const db = getDatabaseInstance();
      onValue(ref(db, `scoreboard/${eventId}`), snap => { this.scoreboard = snap.val(); this.updateScoreboard(); });
      listenTeams(eventId, data => { this.teams = data; this.updateScoreboard(); });
      listenBranding(eventId, b => {
        this.templateStyle = b?.socialTemplateStyle || 'style1';
        this.branding = b;
        const sel = this.querySelector('#style-select');
        if (sel) sel.value = this.templateStyle;
        this.updateScoreboard();
      });
      listenMatchLog(eventId, logs => {
        this.logs = logs || [];
        this.logs.forEach(l => { if (l.social) this.generating.delete(l.id); });
        this.updateLogs();
        this.updatePosts();
      });
    }

    renderBase() {
      this.innerHTML = `
        <top-bar></top-bar>
        <div class="p-4">
          <div id="scoreboard" class="mb-4"></div>
          <div class="mb-4 flex items-center gap-2 text-sm">
            <label class="font-semibold">Post Style</label>
            <select id="style-select" class="border p-1">
              <option value="style1">Style 1</option>
              <option value="style2">Style 2</option>
              <option value="style3">Style 3</option>
              <option value="bold">Bold</option>
            </select>
            <button id="edit-style" class="control-button btn-sm">Edit Style</button>
          </div>
          <div class="grid grid-cols-2 gap-6">
            <section>
              <h2 class="font-bold mb-2">Live Match Log</h2>
              <table class="w-full text-sm">
                <thead><tr><th class="text-left pr-2">Time</th><th class="text-left pr-2">Team</th><th class="text-left pr-2">Type</th><th class="text-left pr-2">Player</th><th></th></tr></thead>
                <tbody id="log-body"></tbody>
              </table>
            </section>
            <section>
              <div class="flex items-center justify-between mb-2">
                <h2 class="font-bold">Generated Posts</h2>
                <button id="generate-final" class="control-button btn-sm">Final Score Post</button>
              </div>
              <div id="posts-list" class="space-y-4"></div>
            </section>
          </div>
        </div>`;
      this.logBody = this.querySelector('#log-body');
      this.postsList = this.querySelector('#posts-list');
      this.scoreboardEl = this.querySelector('#scoreboard');
      const styleSel = this.querySelector('#style-select');
      styleSel.value = this.templateStyle;
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
      this.querySelector('#generate-final').onclick = () => this.handleGenerateFinal();
      const top = this.querySelector('top-bar');
      top.addEventListener('brand-settings', () => {
        let modal = document.getElementById('branding-modal');
        if (!modal) { modal = document.createElement('div'); modal.id = 'branding-modal'; document.body.appendChild(modal); }
        renderBrandingModal(modal, { eventId: this.eventId });
        modal.classList.remove('hidden');
      });
      this.updateScoreboard();
      this.updateLogs();
      this.updatePosts();
    }

    async handleGenerate(id) {
      if (this.generating.has(id)) return;
      const log = this.logs.find(l => l.id === id);
      if (!log) return;
      this.generating.add(id);
      this.updateLogs();
      this.updatePosts();
      try {
        const urls = await generateSocialAssets(this.eventId, id, this.templateStyle, this.styleSettings);
        await updateMatchLogEntry(this.eventId, id, { ...log, social: urls });
      } catch (e) {
        console.error(e);
        this.generating.delete(id);
        const miss = e.message?.match(/^missing:(.+)$/);
        if (miss) {
          if (confirm(`Missing image: ${miss[1]}. Generate without it?`)) {
            const opts = { ...this.styleSettings, ignoreMissing: true };
            if (miss[1].includes('/portraits/')) opts.includePlayerPhotos = false;
            if (miss[1].includes('/logos/')) opts.includeTeamLogos = false;
            try {
              const urls = await generateSocialAssets(this.eventId, id, this.templateStyle, opts);
              await updateMatchLogEntry(this.eventId, id, { ...log, social: urls });
            } catch (e2) {
              alert(`Failed to generate post: ${e2.message}`);
            }
          }
        } else {
          alert(`Failed to generate post: ${e.message}`);
        }
      }
      this.updateLogs();
      this.updatePosts();
    }

    async handleGenerateFinal(){
      if(this.generatingFinal) return;
      this.generatingFinal = true;
      this.updatePosts();
      try{
        this.finalPost = await generateFinalScoreAssets(this.eventId, this.templateStyle, this.styleSettings);
      }catch(e){
        console.error(e);
        const miss = e.message?.match(/^missing:(.+)$/);
        if (miss && confirm(`Missing image: ${miss[1]}. Generate without it?`)) {
          const opts = { ...this.styleSettings, ignoreMissing: true };
          if (miss[1].includes('/logos/')) opts.includeTeamLogos = false;
          try {
            this.finalPost = await generateFinalScoreAssets(this.eventId, this.templateStyle, opts);
          } catch (e2) {
            alert(`Failed to generate final post: ${e2.message}`);
            this.finalPost = null;
          }
        } else {
          alert(`Failed to generate final post: ${e.message}`);
          this.finalPost = null;
        }
      }
      this.generatingFinal = false;
      this.updatePosts();
    }

    resolveUrl(url){
      if(!url) return '';
      if(url.startsWith('http') || url.startsWith('/') || url.startsWith('../')) return url;
      if(url.startsWith('assets/')) return `../${url}`;
      return `../assets/social/${this.eventId}/${url}`;
    }

    buildPostBlock(l) {
      const wrapper = document.createElement('div');
      wrapper.className = 'border p-2';
      const header = document.createElement('div');
      header.className = 'mb-2 text-xs font-semibold';
      const playerInfo = l.playerName || l.player || '';
      const playerLabel = playerInfo ? ` - ${l.playerNumber ? '#' + l.playerNumber + ' ' : ''}${playerInfo}` : '';
      header.textContent = `${l.time || ''} ${l.eventType || l.type || ''}${playerLabel}`;
      wrapper.appendChild(header);
      if (l.social) {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-3 gap-2';
        Object.entries(l.social).forEach(([ratio, url]) => {
          const d = document.createElement('div');
          d.className = 'text-center';
          const img = document.createElement('img');
          img.src = this.resolveUrl(url);
          img.className = 'w-full object-cover mb-1';
          d.appendChild(img);
          const a = document.createElement('a');
          a.href = this.resolveUrl(url);
          a.download = '';
          a.className = 'control-button btn-sm';
          a.textContent = 'Download';
          d.appendChild(a);
          grid.appendChild(d);
        });
        wrapper.appendChild(grid);
        return wrapper;
      }
      if (this.generating.has(l.id)) {
        const ph = document.createElement('div');
        ph.className = 'w-full h-32 bg-gray-200 animate-pulse mb-2';
        wrapper.appendChild(ph);
        const barOuter = document.createElement('div');
        barOuter.className = 'w-full h-2 bg-gray-200 overflow-hidden';
        const bar = document.createElement('div');
        bar.className = 'h-full w-full animate-pulse';
        bar.style.background = 'var(--brand-color,#e16316)';
        barOuter.appendChild(bar);
        wrapper.appendChild(barOuter);
        return wrapper;
      }
      return null;
    }

    buildFinalBlock() {
      if (!this.finalPost && !this.generatingFinal) return null;
      const wrapper = document.createElement('div');
      wrapper.className = 'border p-2';
      const header = document.createElement('div');
      header.className = 'mb-2 text-xs font-semibold';
      header.textContent = 'Final Score';
      wrapper.appendChild(header);
      if (this.finalPost) {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-3 gap-2';
        Object.entries(this.finalPost).forEach(([ratio, url]) => {
          const d = document.createElement('div');
          d.className = 'text-center';
          const img = document.createElement('img');
          img.src = this.resolveUrl(url);
          img.className = 'w-full object-cover mb-1';
          d.appendChild(img);
          const a = document.createElement('a');
          a.href = this.resolveUrl(url);
          a.download = '';
          a.className = 'control-button btn-sm';
          a.textContent = 'Download';
          d.appendChild(a);
          grid.appendChild(d);
        });
        wrapper.appendChild(grid);
      } else if (this.generatingFinal) {
        const ph = document.createElement('div');
        ph.className = 'w-full h-32 bg-gray-200 animate-pulse mb-2';
        wrapper.appendChild(ph);
        const barOuter = document.createElement('div');
        barOuter.className = 'w-full h-2 bg-gray-200 overflow-hidden';
        const bar = document.createElement('div');
        bar.className = 'h-full w-full animate-pulse';
        bar.style.background = 'var(--brand-color,#e16316)';
        barOuter.appendChild(bar);
        wrapper.appendChild(barOuter);
      }
      return wrapper;
    }

    updateLogs() {
      if (!this.logBody) return;
      this.logBody.textContent = '';
      this.logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.dataset.id = l.id;
        const playerText = l.playerName || l.player || '';
        const cols = [
          l.time || '',
          l.team === 'a' ? 'Home' : l.team === 'b' ? 'Away' : (l.team || ''),
          l.eventType || l.type || '',
          l.playerNumber ? `#${l.playerNumber} ${playerText}` : playerText
        ];
        cols.forEach(text => {
          const td = document.createElement('td');
          td.className = 'pr-2';
          td.textContent = text;
          tr.appendChild(td);
        });
        const tdBtn = document.createElement('td');
        tdBtn.className = 'text-right';
        const btn = document.createElement('button');
        btn.className = 'generate control-button btn-sm';
        btn.textContent = 'Generate';
        btn.disabled = this.generating.has(l.id);
        btn.onclick = () => this.handleGenerate(l.id);
        tdBtn.appendChild(btn);
        tr.appendChild(tdBtn);
        this.logBody.appendChild(tr);
      });
    }

    updatePosts() {
      if (!this.postsList) return;
      this.postsList.textContent = '';
      const final = this.buildFinalBlock();
      if (final) this.postsList.appendChild(final);
      this.logs.forEach(l => {
        const block = this.buildPostBlock(l);
        if (block) this.postsList.appendChild(block);
      });
      if (!this.postsList.children.length) {
        const div = document.createElement('div');
        div.className = 'text-gray-500 text-sm';
        div.textContent = 'No posts yet.';
        this.postsList.appendChild(div);
      }
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
      const el = this.scoreboardEl;
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
  }
  if (!customElements.get('social-panel')) customElements.define('social-panel', SocialPanel);
  container.innerHTML = '<social-panel></social-panel>';
}
