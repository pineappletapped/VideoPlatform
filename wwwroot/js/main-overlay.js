import { listenOverlayState, listenGraphicsData, listenBranding } from './firebase.js';
import { getDatabaseInstance } from './firebaseApp.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';
const previewMode = params.get('mode') === 'preview';

let countdownInterval = null;
let vtVideo = null;
let preloadedVT = null;
let masterVolume = 1;
let vtVolume = 1;
let musicVolume = 1;
let prevScoreboardVisible = false;
let prevScoreboardData = null;
let prevLowerThirdId = null;
let prevLowerThirdData = null;

function contrastColor(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    const lum = (0.299*r + 0.587*g + 0.114*b)/255;
    return lum > 0.6 ? '#000' : '#fff';
}

function playTransition(el, type, name) {
    if (!el) return;
    if (!name || name === 'cut') {
        if (type === 'out') el.remove();
        return;
    }
    const cls = `${type === 'in' ? 'slide-in' : 'slide-out'}-${name.replace('slide-','')}`;
    const fadeCls = name === 'fade' ? (type === 'in' ? 'fade-in' : 'fade-out') : cls;
    el.classList.add(fadeCls);
    if (type === 'out') {
        el.addEventListener('animationend', () => el.remove(), { once: true });
    }
}

// Overlay heartbeat for status bar feedback
setInterval(() => {
    localStorage.setItem('overlayHeartbeat', Date.now().toString());
}, 2000);

const DEFAULT_BRANDING = {
    primaryColor: '#e16316',
    secondaryColor1: '#004a77',
    secondaryColor2: '#e0f7ff',
    logoPrimary: '',
    logoSecondary: '',
    font: 'Arial',
    logos: { tl:'', tr:'', bl:'', br:'' },
    sponsors: [],
    scheduleSponsorPlacement: 'bottom-spaced',
    scheduleLayout: 'corner'
};

function applyBranding(branding = DEFAULT_BRANDING) {
    document.body.style.fontFamily = branding.font;
    document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
    document.documentElement.style.setProperty('--brand-secondary1', branding.secondaryColor1);
    document.documentElement.style.setProperty('--brand-secondary2', branding.secondaryColor2);
    ['tl','tr','bl','br'].forEach(pos=>{
        const img=document.getElementById(`logo-${pos}`);
        if(img) img.src = (branding.logos && branding.logos[pos]) ? branding.logos[pos] : '';
    });
}

function renderHoldslateCountdown(holdslateData, branding) {
    const holdslateOverlay = document.getElementById('holdslate-overlay');
    if (!holdslateOverlay) return;
    let messageHtml = '';
    if (holdslateData.message) {
        messageHtml = `<div style="background:rgba(0,0,0,0.6);color:#fff;padding:1.5rem 2.5rem;border-radius:0.5rem;font-size:2rem;max-width:80vw;text-align:center;">${holdslateData.message}</div>`;
    }
    let countdownHtml = '';
    if (holdslateData.countdown) {
        const now = Date.now();
        const target = new Date(holdslateData.countdown).getTime();
        const diff = target - now;
        let countdownDisplay = '';
        if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            countdownDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
            countdownDisplay = '00:00';
        }
        countdownHtml = `<div style="background:rgba(0,0,0,0.7);color:#fff;padding:1.5rem 2.5rem;border-radius:0.5rem;font-size:2.5rem;max-width:80vw;text-align:center;margin-top:1.5rem;">${countdownDisplay}</div>`;
    }
    holdslateOverlay.innerHTML = `<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">${messageHtml}${countdownHtml}</div>`;
}

function playVT(vt) {
    const container = document.getElementById('vt-overlay');
    if (!container) return;
    if (vtVideo) {
        vtVideo.pause();
        container.innerHTML = '';
    }
    if (preloadedVT && preloadedVT.src === vt.videoUrl) {
        vtVideo = preloadedVT;
        preloadedVT = null;
    } else {
        vtVideo = document.createElement('video');
        vtVideo.src = vt.videoUrl;
    }
    vtVideo.style.position = 'absolute';
    vtVideo.style.top = '0';
    vtVideo.style.left = '0';
    vtVideo.style.width = '100%';
    vtVideo.style.height = '100%';
    vtVideo.style.objectFit = 'cover';
    vtVideo.autoplay = true;
    vtVideo.onended = () => { container.innerHTML = ''; vtVideo = null; };
    vtVideo.oncanplaythrough = () => {
        set(ref(db, `status/${eventId}/vtReady`), true);
    };
    vtVideo.volume = masterVolume * vtVolume;
    container.appendChild(vtVideo);
    vtVideo.play().catch(err => console.warn('VT autoplay failed', err));
    set(ref(db, `status/${eventId}/vtReady`), false);
}

function renderOverlayFromFirebase(state, graphics, branding) {
    applyBranding(branding);
    const overlayContainer = document.getElementById('overlay-container');
    if (!overlayContainer) return;
    // Remove overlays
    overlayContainer.querySelector('#program-overlay')?.remove();
    overlayContainer.querySelector('#holdslate-overlay')?.remove();
    if (!previewMode) overlayContainer.querySelector('#preview-lower-third')?.remove();
    // Lower Thirds
    let lowerThird = null;
    let previewLowerThird = null;
    let liveLowerThirdId = graphics && graphics.liveLowerThirdId;
    let previewLowerThirdId = graphics && graphics.previewLowerThirdId;
    if (graphics && graphics.lowerThirds && liveLowerThirdId) {
        lowerThird = graphics.lowerThirds.find(lt => lt.id === liveLowerThirdId);
    }
    if (graphics && graphics.lowerThirds && previewLowerThirdId) {
        previewLowerThird = graphics.lowerThirds.find(lt => lt.id === previewLowerThirdId);
    }
    if (previewMode && previewLowerThird) {
        const pos = previewLowerThird.position || 'bottom-left';
        let stylePos = '';
        if (pos.startsWith('custom')) {
            const [x,y] = pos.split(':')[1].split(',');
            stylePos = `top:${y}px;left:${x}px;`;
        } else if (pos === 'bottom-right') stylePos = 'bottom:2rem;right:2rem;';
        else if (pos === 'top-left') stylePos = 'top:2rem;left:2rem;';
        else if (pos === 'top-right') stylePos = 'top:2rem;right:2rem;';
        else stylePos = 'bottom:2rem;left:2rem;';
        const styleClass = `lower-third-${previewLowerThird.style || 'default'}`;
        document.getElementById('preview-lower-third').innerHTML =
            `<div class='${styleClass}' style='opacity:0.6;position:absolute;${stylePos}min-width:300px;font-family:${branding.font};'>`+
            `${branding.logoPrimary ? `<img src='${branding.logoPrimary}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}`+
            `<span style='vertical-align:middle;'><span style='font-weight:bold;font-size:1.2em;'>${previewLowerThird.title}</span><br><span style='font-size:1em;'>${previewLowerThird.subtitle}</span></span>`+
            `</div>`;
    } else if (previewMode) {
        document.getElementById('preview-lower-third').innerHTML = '';
    }
    if (!previewMode && lowerThird) {
        const pos = lowerThird.position || 'bottom-left';
        let stylePos = '';
        if (pos.startsWith('custom')) {
            const [x,y] = pos.split(':')[1].split(',');
            stylePos = `top:${y}px;left:${x}px;`;
        } else if (pos === 'bottom-right') stylePos = 'bottom:2rem;right:2rem;';
        else if (pos === 'top-left') stylePos = 'top:2rem;left:2rem;';
        else if (pos === 'top-right') stylePos = 'top:2rem;right:2rem;';
        else stylePos = 'bottom:2rem;left:2rem;';
        const styleClass = `lower-third-${lowerThird.style || 'default'}`;
        const containerEl = document.getElementById('lower-third');
        const oldEl = containerEl.firstElementChild;
        if (oldEl && prevLowerThirdId && prevLowerThirdId !== liveLowerThirdId) {
            playTransition(oldEl,'out',prevLowerThirdData?.transitionOut);
        } else {
            containerEl.innerHTML = '';
        }
        const ltWrap = document.createElement('div');
        ltWrap.className = styleClass;
        ltWrap.style.position = 'absolute';
        ltWrap.style.cssText += stylePos + `min-width:300px;font-family:${branding.font};`;
        ltWrap.innerHTML = `${branding.logoPrimary ? `<img src='${branding.logoPrimary}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}`+
            `<span style='vertical-align:middle;'><span style='font-weight:bold;font-size:1.2em;'>${lowerThird.title}</span><br><span style='font-size:1em;'>${lowerThird.subtitle}</span></span>`;
        containerEl.appendChild(ltWrap);
        playTransition(ltWrap,'in',lowerThird.transitionIn);
    } else if (!previewMode) {
        const ltWrap = document.getElementById('lower-third').firstElementChild;
        if (ltWrap) playTransition(ltWrap,'out',prevLowerThirdData?.transitionOut);
        else document.getElementById('lower-third').innerHTML = '';
    }
    prevLowerThirdId = liveLowerThirdId;
    prevLowerThirdData = lowerThird;
    if (state && state.musicVisible && state.nowPlaying) {
        let np = document.getElementById('now-playing');
        if (!np) {
            np = document.createElement('div');
            np.id = 'now-playing';
            overlayContainer.appendChild(np);
        }
        np.innerHTML = `<div class='now-playing' style='position:absolute;top:2rem;right:2rem;background:var(--brand-secondary1);color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;font-family:${branding.font};'>Now Playing: ${state.nowPlaying.name}</div>`;
        if (!window.musicAudio || window.musicAudio.src !== state.nowPlaying.audioUrl) {
            if (window.musicAudio) window.musicAudio.pause();
            window.musicAudio = new Audio(state.nowPlaying.audioUrl);
            window.musicAudio.volume = masterVolume * musicVolume;
            window.musicAudio.play().catch(err => console.warn('Music autoplay failed', err));
        }
        if (window.musicAudio) window.musicAudio.volume = masterVolume * musicVolume;
    } else {
        const np = document.getElementById('now-playing');
        if (np) np.innerHTML = '';
        if (window.musicAudio) {
            window.musicAudio.pause();
            window.musicAudio = null;
        }
    }
    // Title Slide
    let titleSlide = null;
    let previewTitleSlide = null;
    let liveTitleSlideId = graphics && graphics.liveTitleSlideId;
    let previewTitleSlideId = graphics && graphics.previewTitleSlideId;
    if (graphics && graphics.titleSlides && liveTitleSlideId) {
        titleSlide = graphics.titleSlides.find(ts => ts.id === liveTitleSlideId);
    }
    if (graphics && graphics.titleSlides && previewTitleSlideId) {
        previewTitleSlide = graphics.titleSlides.find(ts => ts.id === previewTitleSlideId);
    }
    document.getElementById('title-slide').innerHTML = !previewMode && titleSlide
        ? `<div class='title-slide' style='position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);min-width:350px;background:var(--brand-secondary2);color:#004a77;padding:2rem 2.5rem;border-radius:0.5rem;box-shadow:0 2px 8px #0003;font-family:${branding.font};text-align:center;'>
            ${branding.logoSecondary ? `<img src='${branding.logoSecondary}' alt='Logo' style='height:40px;display:block;margin:0 auto 1rem auto;' />` : ''}
            <div style='font-weight:bold;font-size:2em;margin-bottom:0.5rem;'>${titleSlide.title}</div>
            <div style='font-size:1.2em;'>${titleSlide.subtitle}</div>
        </div>`
        : '';
    if (!previewMode) {
        document.getElementById('preview-title-slide')?.remove();
    }
    if (previewMode && previewTitleSlide) {
        const div = document.createElement('div');
        div.id = 'preview-title-slide';
        div.style.position = 'absolute';
        div.style.top = '40%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%,-50%)';
        div.style.minWidth = '350px';
        div.style.opacity = '0.6';
        div.style.background = 'var(--brand-secondary2)';
        div.style.color = '#004a77';
        div.style.padding = '2rem 2.5rem';
        div.style.borderRadius = '0.5rem';
        div.style.boxShadow = '0 2px 8px #0003';
        div.style.fontFamily = branding.font;
        div.style.textAlign = 'center';
        div.innerHTML = `${branding.logoSecondary ? `<img src='${branding.logoSecondary}' alt='Logo' style='height:40px;display:block;margin:0 auto 1rem auto;' />` : ''}<div style='font-weight:bold;font-size:2em;margin-bottom:0.5rem;'>${previewTitleSlide.title}</div><div style='font-size:1.2em;'>${previewTitleSlide.subtitle}</div>`;
        overlayContainer.appendChild(div);
    } else if (previewMode) {
        document.getElementById('preview-title-slide')?.remove();
    }
    // Program Overlay
    let program = state && state.program;
    let programOverlay = overlayContainer.querySelector('#program-overlay');
    if (!previewMode && state && state.liveProgramVisible && program && program.length) {
        if (!programOverlay) {
            programOverlay = document.createElement('div');
            programOverlay.id = 'program-overlay';
            overlayContainer.appendChild(programOverlay);
        }
        const layout = branding.scheduleLayout || 'corner';
        programOverlay.style.position = 'absolute';
        programOverlay.style.fontFamily = branding.font;
        programOverlay.style.background = branding.primaryColor + 'cc';
        programOverlay.style.color = '#fff';
        programOverlay.style.borderRadius = '0.5rem';
        programOverlay.style.boxShadow = '0 2px 8px #0003';
        if(layout === 'center'){
            programOverlay.style.top = '50%';
            programOverlay.style.left = '50%';
            programOverlay.style.transform = 'translate(-50%,-50%)';
            programOverlay.style.padding = '2rem 3rem';
            programOverlay.style.maxWidth = '80vw';
            programOverlay.style.bottom = '';
            programOverlay.style.right = '';
        } else {
            programOverlay.style.bottom = '2rem';
            programOverlay.style.right = '2rem';
            programOverlay.style.padding = '1rem 2rem';
            programOverlay.style.transform = '';
            programOverlay.style.top = '';
            programOverlay.style.left = '';
            programOverlay.style.maxWidth = '';
        }
        const sponsors = branding.sponsors || [];
        const placement = branding.scheduleSponsorPlacement || 'bottom-spaced';
        let sponsorHtml = '';
        const eventLogo = branding.logoSecondary || branding.logoPrimary || '';
        if (sponsors.length) {
            if (placement === 'top-right') {
                const s = sponsors[0];
                sponsorHtml = `<img src='${s.logo}' alt='${s.name}' style='height:60px;position:absolute;top:0.5rem;right:0.5rem;'/>`;
            } else if (placement === 'bottom-centered') {
                sponsorHtml = `<div style='display:flex;gap:1rem;justify-content:center;margin-top:0.5rem;'>${sponsors.map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:60px;'>`).join('')}</div>`;
            } else if (placement === 'bottom-sides') {
                const l = sponsors[0];
                const r = sponsors[1];
                sponsorHtml = `${l?`<img src='${l.logo}' alt='${l.name}' style='height:60px;position:absolute;bottom:0.5rem;left:0.5rem;'>`:''}${r?`<img src='${r.logo}' alt='${r.name}' style='height:60px;position:absolute;bottom:0.5rem;right:0.5rem;'>`:''}`;
            } else {
                sponsorHtml = `<div style='display:flex;gap:1rem;justify-content:space-around;margin-top:0.5rem;'>${sponsors.slice(0,4).map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:60px;'>`).join('')}</div>`;
            }
        }
        let html = `<div class='font-bold text-lg mb-2'>Program</div>`;
        if(eventLogo && layout==='center') html += `<img src='${eventLogo}' alt='Logo' style='height:80px;margin:0.5rem auto;'>`;
        html += `<table><tbody>${program.map(item=>`<tr><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td>${item.presenter}</td></tr>`).join('')}</tbody></table>`;
        html += sponsorHtml;
        programOverlay.innerHTML = html;
    } else if (previewMode && state && state.previewProgramVisible && program && program.length) {
        if (!programOverlay) {
            programOverlay = document.createElement('div');
            programOverlay.id = 'program-overlay';
            overlayContainer.appendChild(programOverlay);
        }
        const layoutPrev = branding.scheduleLayout || 'corner';
        programOverlay.style.position = 'absolute';
        programOverlay.style.fontFamily = branding.font;
        programOverlay.style.background = branding.primaryColor + 'cc';
        programOverlay.style.color = '#fff';
        programOverlay.style.borderRadius = '0.5rem';
        programOverlay.style.boxShadow = '0 2px 8px #0003';
        programOverlay.style.opacity = '0.6';
        if(layoutPrev === 'center'){
            programOverlay.style.top = '50%';
            programOverlay.style.left = '50%';
            programOverlay.style.transform = 'translate(-50%,-50%)';
            programOverlay.style.padding = '2rem 3rem';
            programOverlay.style.maxWidth = '80vw';
            programOverlay.style.bottom = '';
            programOverlay.style.right = '';
        } else {
            programOverlay.style.bottom = '2rem';
            programOverlay.style.right = '2rem';
            programOverlay.style.padding = '1rem 2rem';
            programOverlay.style.transform = '';
            programOverlay.style.top = '';
            programOverlay.style.left = '';
            programOverlay.style.maxWidth = '';
        }
        const sponsors2 = branding.sponsors || [];
        const placement2 = branding.scheduleSponsorPlacement || 'bottom-spaced';
        let sponsorHtml2 = '';
        const eventLogo2 = branding.logoSecondary || branding.logoPrimary || '';
        if (sponsors2.length) {
            if (placement2 === 'top-right') {
                const s = sponsors2[0];
                sponsorHtml2 = `<img src='${s.logo}' alt='${s.name}' style='height:60px;position:absolute;top:0.5rem;right:0.5rem;'/>`;
            } else if (placement2 === 'bottom-centered') {
                sponsorHtml2 = `<div style='display:flex;gap:1rem;justify-content:center;margin-top:0.5rem;'>${sponsors2.map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:60px;'>`).join('')}</div>`;
            } else if (placement2 === 'bottom-sides') {
                const l = sponsors2[0];
                const r = sponsors2[1];
                sponsorHtml2 = `${l?`<img src='${l.logo}' alt='${l.name}' style='height:60px;position:absolute;bottom:0.5rem;left:0.5rem;'>`:''}${r?`<img src='${r.logo}' alt='${r.name}' style='height:60px;position:absolute;bottom:0.5rem;right:0.5rem;'>`:''}`;
            } else {
                sponsorHtml2 = `<div style='display:flex;gap:1rem;justify-content:space-around;margin-top:0.5rem;'>${sponsors2.slice(0,4).map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:60px;'>`).join('')}</div>`;
            }
        }
        let html2 = `<div class='font-bold text-lg mb-2'>Program</div>`;
        if(eventLogo2 && layoutPrev==='center') html2 += `<img src='${eventLogo2}' alt='Logo' style='height:80px;margin:0.5rem auto;'>`;
        html2 += `<table><tbody>${program.map(item=>`<tr><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td>${item.presenter}</td></tr>`).join('')}</tbody></table>`;
        html2 += sponsorHtml2;
        programOverlay.innerHTML = html2;
    } else if (programOverlay) {
        programOverlay.remove();
    }
    // Holdslate Overlay
    let holdslateOverlay = overlayContainer.querySelector('#holdslate-overlay');
    const holdslateData = state && state.holdslate;
    const holdslateShow = previewMode ? state && state.holdslatePreviewVisible : state && state.holdslateVisible;
    if (holdslateShow && holdslateData && holdslateData.image) {
        if (!holdslateOverlay) {
            holdslateOverlay = document.createElement('div');
            holdslateOverlay.id = 'holdslate-overlay';
            overlayContainer.appendChild(holdslateOverlay);
        }
        holdslateOverlay.style.position = 'absolute';
        holdslateOverlay.style.top = '0';
        holdslateOverlay.style.left = '0';
        holdslateOverlay.style.width = '100vw';
        holdslateOverlay.style.height = '100vh';
        holdslateOverlay.style.background = `url('${holdslateData.image}') center/cover no-repeat`;
        holdslateOverlay.style.display = 'flex';
        holdslateOverlay.style.alignItems = 'center';
        holdslateOverlay.style.justifyContent = 'center';
        holdslateOverlay.style.zIndex = '100';
        holdslateOverlay.style.fontFamily = branding.font;
        holdslateOverlay.style.opacity = previewMode ? '0.6' : '1';
        renderHoldslateCountdown(holdslateData, branding);
        if (countdownInterval) clearInterval(countdownInterval);
        if (holdslateData.countdown) {
            countdownInterval = setInterval(() => renderHoldslateCountdown(holdslateData, branding), 1000);
        }
    } else if (holdslateOverlay) {
        holdslateOverlay.remove();
        if (countdownInterval) clearInterval(countdownInterval);
    }

    // Scoreboard Overlay
    let scoreboardOverlay = overlayContainer.querySelector('#scoreboard-overlay');
    const scoreboardData = state && state.scoreboard;
    const scoreboardShow = previewMode ? state && state.scoreboardPreviewVisible : state && state.scoreboardVisible;
    const breakVisible = state && state.breakVisible;
    const breakPlayer = state && state.breakPlayer;
    const highBreakVisible = state && state.highBreakVisible;
    if (scoreboardShow && scoreboardData) {
        if(scoreboardData.golf){
            if(!scoreboardOverlay){
                scoreboardOverlay = document.createElement('div');
                scoreboardOverlay.id = 'scoreboard-overlay';
                overlayContainer.appendChild(scoreboardOverlay);
                playTransition(scoreboardOverlay,'in',scoreboardData.transitionIn);
            }
            const gd = scoreboardData.golf;
            scoreboardOverlay.className = 'sb-container sb-style1';
            scoreboardOverlay.style.position = 'absolute';
            scoreboardOverlay.style.bottom = '2rem';
            scoreboardOverlay.style.left = '50%';
            scoreboardOverlay.style.transform = 'translateX(-50%)';
            const rows = (gd.players||[]).slice().sort((a,b)=>(a.total||0)-(b.total||0)).map(p=>`<tr><td class='pr-4'>${p.name}</td><td>${p.total}</td><td>${p.thru||0}</td><td>${p.today>=0?`+${p.today}`:p.today}</td></tr>`).join('');
            scoreboardOverlay.innerHTML = `<div class='sb-row'><span class='sb-team' style='background:#333'>${gd.course?.name||'Course'}</span></div><table class='golf-table text-sm mt-1'><thead><tr><th>Name</th><th>Tot</th><th>Thru</th><th>Today</th></tr></thead><tbody>${rows}</tbody></table>`;
            return;
        }
        if (!scoreboardOverlay) {
            scoreboardOverlay = document.createElement('div');
            scoreboardOverlay.id = 'scoreboard-overlay';
            overlayContainer.appendChild(scoreboardOverlay);
            playTransition(scoreboardOverlay,'in',scoreboardData.transitionIn);
        } else if (!prevScoreboardVisible) {
            playTransition(scoreboardOverlay,'in',scoreboardData.transitionIn);
        }
        const style = scoreboardData.style || 'style1';
        const pos = scoreboardData.position || 'bottom-center';
        scoreboardOverlay.className = `sb-container sb-${style}`;
        scoreboardOverlay.style.position = 'absolute';
        scoreboardOverlay.style.fontFamily = branding.font;
        scoreboardOverlay.style.fontSize = '1.5rem';
        scoreboardOverlay.style.pointerEvents = 'none';
        scoreboardOverlay.style.left = '';
        scoreboardOverlay.style.right = '';
        scoreboardOverlay.style.top = '';
        scoreboardOverlay.style.bottom = '';
        scoreboardOverlay.style.transform = '';
        if (pos === 'top-left') { scoreboardOverlay.style.top = '2rem'; scoreboardOverlay.style.left = '2rem'; }
        else if (pos === 'top-right') { scoreboardOverlay.style.top = '2rem'; scoreboardOverlay.style.right = '2rem'; }
        else if (pos === 'bottom-left') { scoreboardOverlay.style.bottom = '2rem'; scoreboardOverlay.style.left = '2rem'; }
        else if (pos === 'bottom-right') { scoreboardOverlay.style.bottom = '2rem'; scoreboardOverlay.style.right = '2rem'; }
        else if (pos === 'top-center') { scoreboardOverlay.style.top = '2rem'; scoreboardOverlay.style.left = '50%'; scoreboardOverlay.style.transform = 'translateX(-50%)'; }
        else { scoreboardOverlay.style.bottom = '2rem'; scoreboardOverlay.style.left = '50%'; scoreboardOverlay.style.transform = 'translateX(-50%)'; }
        const names = teamsData ? [teamsData.teamA?.name, teamsData.teamB?.name] : [];
        const colors = teamsData ? [teamsData.teamA?.color || '#333', teamsData.teamB?.color || '#333'] : ['#333','#333'];
        const logos = teamsData && teamsData.teamA?.logo && teamsData.teamB?.logo ? [teamsData.teamA.logo, teamsData.teamB.logo] : [null, null];
        const showLogos = logos[0] && logos[1];
        const sA = scoreboardData.scores?.[0] ?? 0;
        const sB = scoreboardData.scores?.[1] ?? 0;
        const info = [];
        if (scoreboardData.time) info.push(scoreboardData.time);
        if (scoreboardData.period) info.push('P' + scoreboardData.period);
        if (scoreboardData.round) info.push('R' + scoreboardData.round);
        if (scoreboardData.sets) info.push('Sets ' + scoreboardData.sets.join('-'));
        if (scoreboardData.games) info.push('Games ' + scoreboardData.games.join('-'));
        if (scoreboardData.frames) info.push('Frames ' + scoreboardData.frames.join('-'));
        if (scoreboardData.legs) info.push('Legs ' + scoreboardData.legs.join('-'));
        if (scoreboardData.points) info.push('Pts ' + scoreboardData.points.join('-'));
        const infoHtml = info.length ? `<div class='sb-info'>${info.join(' | ')}</div>` : '';
        const brand = branding.primaryColor || '#e16316';
        const textA = contrastColor(colors[0]);
        const textB = contrastColor(colors[1]);
        const textBrand = contrastColor(brand);
        const breakInd = breakVisible && scoreboardData.currentBreak !== undefined ? `<div class='sb-current-break ${breakPlayer === 1 ? 'right' : 'left'}'>${scoreboardData.currentBreak}</div>` : '';
        const checkoutHtml = scoreboardData.checkoutText ? `<div class='sb-checkout'>${names[scoreboardData.checkoutPlayer || 0] || ''}: ${scoreboardData.checkoutText}</div>` : '';
        const aClassA = scoreboardData.turn === 0 ? ' active' : '';
        const aClassB = scoreboardData.turn === 1 ? ' active' : '';
        const sbSponsors = branding.sponsors || [];
        const sbPlacement = branding.scheduleSponsorPlacement || 'bottom-spaced';
        let sbSponsorHtml = '';
        if(sbSponsors.length){
            if(sbPlacement === 'top-right'){
                const s = sbSponsors[0];
                sbSponsorHtml = `<img src='${s.logo}' alt='${s.name}' style='height:50px;position:absolute;top:-2.5rem;right:0;'>`;
            }else if(sbPlacement === 'bottom-centered'){
                sbSponsorHtml = `<div style='display:flex;gap:1rem;justify-content:center;margin-top:0.25rem;'>${sbSponsors.map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:50px;'>`).join('')}</div>`;
            }else if(sbPlacement === 'bottom-sides'){
                const l=sbSponsors[0]; const r=sbSponsors[1];
                sbSponsorHtml=`${l?`<img src='${l.logo}' alt='${l.name}' style='height:50px;position:absolute;bottom:-3rem;left:0;'>`:''}${r?`<img src='${r.logo}' alt='${r.name}' style='height:50px;position:absolute;bottom:-3rem;right:0;'>`:''}`;
            }else{
                sbSponsorHtml = `<div style='display:flex;gap:1rem;justify-content:space-around;margin-top:0.25rem;'>${sbSponsors.slice(0,4).map(s=>`<img src='${s.logo}' alt='${s.name}' style='height:50px;'>`).join('')}</div>`;
            }
        }
        scoreboardOverlay.innerHTML = `
            ${breakInd}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0] || 'Team 1'}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA} | ${sB}</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1] || 'Team 2'}</span>
            </div>
            ${infoHtml}
            ${checkoutHtml}
            ${sbSponsorHtml}`;
        if(highBreakVisible && scoreboardData.highBreak){
            let hb = overlayContainer.querySelector('#high-break');
            if(!hb){
                hb = document.createElement('div');
                hb.id = 'high-break';
                overlayContainer.appendChild(hb);
            }
            hb.innerHTML = `<div class='lower-third-default' style='position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);font-family:${branding.font};'>Highest Break: ${scoreboardData.highBreak}</div>`;
        } else {
            overlayContainer.querySelector('#high-break')?.remove();
        }
    } else if (scoreboardOverlay && prevScoreboardVisible) {
        playTransition(scoreboardOverlay,'out',prevScoreboardData?.transitionOut);
        scoreboardOverlay = null;
        overlayContainer.querySelector('#high-break')?.remove();
    }
    prevScoreboardVisible = scoreboardShow;
    prevScoreboardData = scoreboardData;

    // Formation Overlay
    let formOverlay = overlayContainer.querySelector('#formation-overlay');
    const formData = state && state.formation;
    const formShow = state && state.formationVisible;
    if (formShow && formData) {
        if (!formOverlay) {
            formOverlay = document.createElement('div');
            formOverlay.id = 'formation-overlay';
            overlayContainer.appendChild(formOverlay);
        }
        formOverlay.innerHTML = `<div class='formation-pitch'></div>` +
            formData.players.map(p=>`<div class='formation-player' style='top:${p.y}%;left:${p.x}%;font-family:${branding.font};'>${p.name}</div>`).join('');
    } else if (formOverlay) {
        formOverlay.remove();
    }

    // Stats Overlay
    let statOverlay = overlayContainer.querySelector('#stat-overlay');
    const statData = state && state.stat;
    const statShow = previewMode ? state && state.statPreviewVisible : state && state.statVisible;
    if (statShow && statData) {
        if (!statOverlay) {
            statOverlay = document.createElement('div');
            statOverlay.id = 'stat-overlay';
            overlayContainer.appendChild(statOverlay);
        }
        statOverlay.style.position = 'absolute';
        statOverlay.style.bottom = '2rem';
        statOverlay.style.left = '50%';
        statOverlay.style.transform = 'translateX(-50%)';
        statOverlay.style.fontFamily = branding.font;
        statOverlay.style.opacity = previewMode ? '0.6' : '1';
        const teamName = statData.team && teamsData ? (teamsData[statData.team]?.name || '') : '';
        statOverlay.innerHTML = `<div class='lower-third-default'>${statData.fact}${statData.player ? ' - ' + statData.player : ''}${teamName ? ' (' + teamName + ')' : ''}</div>`;
    } else if (statOverlay) {
        statOverlay.remove();
    }
}

let lastState = null;
let lastGraphics = null;
let lastBranding = DEFAULT_BRANDING;
let teamsData = null;
let scoreboardPersist = null;

function updateOverlay() {
    const state = { ...(lastState || {}) };
    if (!state.scoreboard && scoreboardPersist) state.scoreboard = scoreboardPersist;
    if (state.scoreboard && scoreboardPersist && state.scoreboardVisible === undefined) {
        state.scoreboardVisible = true;
    }
    renderOverlayFromFirebase(state, lastGraphics, lastBranding);
    masterVolume = lastState && lastState.masterVolume !== undefined ? lastState.masterVolume : 1;
    vtVolume = lastState && lastState.vtVolume !== undefined ? lastState.vtVolume : 1;
    musicVolume = lastState && lastState.musicVolume !== undefined ? lastState.musicVolume : 1;
    if (vtVideo) vtVideo.volume = masterVolume * vtVolume;
    if (window.musicAudio) window.musicAudio.volume = masterVolume * musicVolume;
}

listenOverlayState(eventId, (state) => {
    lastState = state || {};
    updateOverlay();
});
listenGraphicsData(eventId, (graphics) => {
    lastGraphics = graphics || { lowerThirds: [], titleSlides: [], teams: {} };
    updateOverlay();
});
listenBranding(eventId, (branding) => {
    lastBranding = branding || DEFAULT_BRANDING;
    updateOverlay();
});
onValue(ref(getDatabaseInstance(), `teams/${eventId}`), snap => {
    teamsData = snap.val() || null;
    updateOverlay();
});
onValue(ref(getDatabaseInstance(), `scoreboard/${eventId}`), snap => {
    scoreboardPersist = snap.val();
    updateOverlay();
});

const db = getDatabaseInstance();
onValue(ref(db, `status/${eventId}/vtCommand`), snap => {
    const cmd = snap.val();
    if (!cmd || cmd.action !== 'play' || !cmd.vt) return;
    playVT(cmd.vt);
});

// Preload VT when loaded in control panel
onValue(ref(db, `status/${eventId}/vt`), snap => {
    const vt = snap.val();
    if (vt && vt.videoUrl) {
        preloadedVT = document.createElement('video');
        preloadedVT.src = vt.videoUrl;
        preloadedVT.preload = 'auto';
        preloadedVT.oncanplaythrough = () => {
            set(ref(db, `status/${eventId}/vtReady`), true);
        };
        preloadedVT.onerror = () => set(ref(db, `status/${eventId}/vtReady`), false);
        preloadedVT.load();
    } else {
        preloadedVT = null;
        set(ref(db, `status/${eventId}/vtReady`), false);
    }
});