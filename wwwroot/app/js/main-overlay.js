import { listenOverlayState, listenGraphicsData, listenBranding, listenSponsors, listenSponsorPlacements, addSponsorLog, updateEventMetadata, resolveAssetPath, updateOverlayState, listenTeams } from './firebase.js';
import { getDatabaseInstance } from './firebaseApp.js';
import { suggestAbbreviation } from './teamUtils.js';
import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';
const previewMode = params.get('mode') === 'preview';
updateEventMetadata(eventId, { lastOpened: Date.now() }).catch(()=>{});

let countdownInterval = null;
let vtVideo = null;
let preloadedVT = null;
let masterVolume = 1;
let vtVolume = 1;
let musicVolume = 1;
let prevScoreboardVisible = false;
let prevScoreboardData = null;
let prevStoppageVisible = false;
let prevLowerThirdId = null;
let prevLowerThirdData = null;
let prevFormationVisible = false;
let prevTableVisible = false;
let prevResultsVisible = false;
let prevStingerVisible = false;
let prevStingerData = null;
let stingerTimeout = null;
let prevPresentationVisible = false;
let prevPresentationData = null;
let prevSponsorLive = {};
let prevFixturesVisible = false;
let prevWeatherVisible = false;
const placementClassMap = {
    scoreboardTop: 'sb-sponsor top',
    scoreboardBottom: 'sb-sponsor bottom',
    formationBottom: 'sb-sponsor bottom',
    substitutionTop: 'sb-sponsor top',
    cornerTL: 'corner-sponsor tl',
    cornerTR: 'corner-sponsor tr',
    cornerBL: 'corner-sponsor bl',
    cornerBR: 'corner-sponsor br',
    intro: 'intro-sponsor'
};

const WEATHER_ICONS = {
    sun: `<svg width="40" height="40" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="yellow"/><g stroke="yellow" stroke-width="4"><line x1="32" y1="4" x2="32" y2="16"/><line x1="32" y1="48" x2="32" y2="60"/><line x1="4" y1="32" x2="16" y2="32"/><line x1="48" y1="32" x2="60" y2="32"/><line x1="12" y1="12" x2="20" y2="20"/><line x1="44" y1="44" x2="52" y2="52"/><line x1="12" y1="52" x2="20" y2="44"/><line x1="44" y1="20" x2="52" y2="12"/></g></svg>`,
    cloud: `<svg width="40" height="40" viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="20" ry="12" fill="#ccc"/><ellipse cx="24" cy="34" rx="12" ry="8" fill="#ccc"/><ellipse cx="40" cy="34" rx="12" ry="8" fill="#ccc"/></svg>`,
    rain: `<svg width="40" height="40" viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="20" ry="12" fill="#ccc"/><ellipse cx="24" cy="26" rx="12" ry="8" fill="#ccc"/><ellipse cx="40" cy="26" rx="12" ry="8" fill="#ccc"/><line x1="22" y1="44" x2="22" y2="56" stroke="#00f" stroke-width="4"/><line x1="32" y1="44" x2="32" y2="56" stroke="#00f" stroke-width="4"/><line x1="42" y1="44" x2="42" y2="56" stroke="#00f" stroke-width="4"/></svg>`,
    thunder: `<svg width="40" height="40" viewBox="0 0 64 64"><ellipse cx="32" cy="28" rx="20" ry="12" fill="#ccc"/><ellipse cx="24" cy="22" rx="12" ry="8" fill="#ccc"/><ellipse cx="40" cy="22" rx="12" ry="8" fill="#ccc"/><polygon points="30,32 24,48 32,48 28,60 40,40 32,40" fill="yellow"/></svg>`,
    snow: `<svg width="40" height="40" viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="20" ry="12" fill="#ccc"/><ellipse cx="24" cy="26" rx="12" ry="8" fill="#ccc"/><ellipse cx="40" cy="26" rx="12" ry="8" fill="#ccc"/><g stroke="#00f" stroke-width="3"><line x1="22" y1="44" x2="22" y2="52"/><line x1="18" y1="48" x2="26" y2="48"/><line x1="32" y1="44" x2="32" y2="52"/><line x1="28" y1="48" x2="36" y2="48"/><line x1="42" y1="44" x2="42" y2="52"/><line x1="38" y1="48" x2="46" y2="48"/></g></svg>`,
    wind: `<svg width="40" height="40" viewBox="0 0 64 64"><path d="M8 24c4-4 12-4 16 0s12 4 16 0" stroke="#ccc" stroke-width="4" fill="none"/><path d="M8 40c4-4 12-4 16 0s12 4 16 0" stroke="#ccc" stroke-width="4" fill="none"/></svg>`,
    suncloud: `<svg width="40" height="40" viewBox="0 0 64 64"><circle cx="20" cy="20" r="10" fill="yellow"/><g stroke="yellow" stroke-width="3"><line x1="20" y1="4" x2="20" y2="12"/><line x1="20" y1="28" x2="20" y2="36"/><line x1="4" y1="20" x2="12" y2="20"/><line x1="28" y1="20" x2="36" y2="20"/><line x1="8" y1="8" x2="12" y2="12"/><line x1="28" y1="28" x2="32" y2="32"/><line x1="8" y1="32" x2="12" y2="28"/><line x1="28" y1="12" x2="32" y2="8"/></g><ellipse cx="40" cy="40" rx="20" ry="12" fill="#ccc"/><ellipse cx="32" cy="34" rx="12" ry="8" fill="#ccc"/><ellipse cx="48" cy="34" rx="12" ry="8" fill="#ccc"/></svg>`
};

function contrastColor(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    const lum = (0.299*r + 0.587*g + 0.114*b)/255;
    return lum > 0.6 ? '#000' : '#fff';
}

function buildInfoWindow(title, bodyHtml, branding, sponsorKey, style='style1'){
    const sponsor = sponsorsData[sponsorKey];
    const sponsorHtml = sponsor ? `<div class='info-window-sponsor'><img src='${sponsor.logo}' alt='${sponsor.name}'></div>` : '';
    const headColor = contrastColor(branding.primaryColor);
    return `<div class='info-window info-window-${style}' style='font-family:${branding.font};'>`+
        `<div class='info-window-head' style='background:${branding.primaryColor};color:${headColor};'>${title}</div>`+
        `<div class='info-window-body'>${bodyHtml}${sponsorHtml}</div>`+
        `</div>`;
}

function parseTime(str){
    const [m='0',s='0'] = str.split(':');
    return parseInt(m)*60 + parseInt(s);
}
function formatTime(secs){
    return `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
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

async function renderIntroOverlay(introData, branding, introSettings = {}, scoreboardData = {}) {
    const holdslateOverlay = document.getElementById('holdslate-overlay');
    if (!holdslateOverlay) return;
    const home = scoreboardData.names?.[0] || scoreboardData.homeName || '';
    const away = scoreboardData.names?.[1] || scoreboardData.awayName || '';
    let titleHtml = introData.title ? `<div style="font-size:3rem;font-weight:bold;margin-bottom:1rem;">${introData.title}</div>` : '';
    let teamsHtml = (home || away) ? `<div style="font-size:2rem;margin-bottom:1rem;">${home} ${home && away ? 'vs' : ''} ${away}</div>` : '';
    let locationHtml = introSettings.venue ? `<div style="font-size:1.5rem;margin-bottom:1rem;">${introSettings.venue}</div>` : '';
    const sponsor = sponsorsData[sponsorPlacements.intro];
    let sponsorHtml = sponsor ? `<img src="${sponsor.logo}" style="max-width:30%;margin-top:1rem;"/>` : '';
    let messageHtml = '';
    if (introData.message) {
        messageHtml = `<div style="background:rgba(0,0,0,0.6);color:#fff;padding:1.5rem 2.5rem;border-radius:0.5rem;font-size:2rem;max-width:80vw;text-align:center;margin-top:1rem;">${introData.message}</div>`;
    }
    let countdownHtml = '';
    if (introData.countdown) {
        const now = Date.now();
        const target = new Date(introData.countdown).getTime();
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
    let weatherHtml = '';
    if (introSettings.weatherSlots && introSettings.weatherSlots.length) {
        const header = introSettings.weatherLoc ? `<div style="text-align:center;font-size:1.25rem;margin-bottom:0.5rem;">${introSettings.weatherLoc}</div>` : '';
        const slotHtml = introSettings.weatherSlots.map(s=>`<div style='display:flex;flex-direction:column;align-items:center;padding:0 0.5rem;'><div>${s.time}</div><div>${WEATHER_ICONS[s.icon] || ''}</div><div>${s.temp}</div></div>`).join('');
        weatherHtml = `<div style="margin-top:1rem;font-size:1.5rem;">${header}<div style='display:flex;justify-content:center;'>${slotHtml}</div></div>`;
    }
    holdslateOverlay.innerHTML = `<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">${titleHtml}${teamsHtml}${locationHtml}${sponsorHtml}${messageHtml}${countdownHtml}${weatherHtml}</div>`;
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
            `${branding.logoPrimary ? `<img src='${resolveAssetPath(branding.logoPrimary)}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}`+
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
        ltWrap.innerHTML = `${branding.logoPrimary ? `<img src='${resolveAssetPath(branding.logoPrimary)}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}`+
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
    // Sponsor Lower Third Banner
    let spEl = overlayContainer.querySelector('#sponsor-lt');
    const spUrl = state && state.sponsorLtUrl;
    const spShow = previewMode ? state && state.sponsorLtPreviewVisible : state && state.sponsorLtVisible;
    if (spShow && spUrl) {
        if (!spEl) {
            spEl = document.createElement('div');
            spEl.id = 'sponsor-lt';
            overlayContainer.appendChild(spEl);
        }
        spEl.style.position = 'absolute';
        spEl.style.left = '0';
        spEl.style.right = '0';
        spEl.style.bottom = '0';
        spEl.style.opacity = previewMode ? '0.6' : '1';
        spEl.innerHTML = `<img src='${spUrl}' style='width:100%;height:auto;'>`;
    } else if (spEl) {
        spEl.remove();
    }
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
        const eventLogo = resolveAssetPath(branding.logoSecondary || branding.logoPrimary || '');
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
        let html = `<div class='font-bold text-lg mb-2'>Schedule</div>`;
        if(eventLogo && layout==='center') html += `<img src='${eventLogo}' alt='Logo' style='height:80px;margin:0.5rem auto;'>`;
        html += `<table><tbody>${program.map(item=>`<tr class='${item.done?'opacity-60 line-through':''}'><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td class='pr-4'>${item.type||''}</td><td>${(item.speakers||[]).join(', ')}</td></tr>`).join('')}</tbody></table>`;
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
        const eventLogo2 = resolveAssetPath(branding.logoSecondary || branding.logoPrimary || '');
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
        let html2 = `<div class='font-bold text-lg mb-2'>Schedule</div>`;
        if(eventLogo2 && layoutPrev==='center') html2 += `<img src='${eventLogo2}' alt='Logo' style='height:80px;margin:0.5rem auto;'>`;
        html2 += `<table><tbody>${program.map(item=>`<tr class='${item.done?'opacity-60 line-through':''}'><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td class='pr-4'>${item.type||''}</td><td>${(item.speakers||[]).join(', ')}</td></tr>`).join('')}</tbody></table>`;
        html2 += sponsorHtml2;
        programOverlay.innerHTML = html2;
    } else if (programOverlay) {
        programOverlay.remove();
    }
    // Intro Overlay
    let holdslateOverlay = overlayContainer.querySelector('#holdslate-overlay');
    const holdslateData = state && state.holdslate;
    const introSettings = state && state.holdslateSettings || {};
    const sb = state && state.scoreboard || {};
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
        renderIntroOverlay(holdslateData, branding, introSettings, sb);
        if (countdownInterval) clearInterval(countdownInterval);
        if (holdslateData.countdown) {
            countdownInterval = setInterval(() => renderIntroOverlay(holdslateData, branding, introSettings, sb), 1000);
        }
    } else if (holdslateOverlay) {
        holdslateOverlay.remove();
        if (countdownInterval) clearInterval(countdownInterval);
    }

    // Fixtures Overlay
    let fixturesOverlay = overlayContainer.querySelector('#fixtures-overlay');
    const fixturesData = state && state.fixtures;
    const fixturesShow = previewMode ? state && state.fixturesPreviewVisible : state && state.fixturesVisible;
    if (fixturesShow && fixturesData) {
        if (!fixturesOverlay) {
            fixturesOverlay = document.createElement('div');
            fixturesOverlay.id = 'fixtures-overlay';
            fixturesOverlay.className = 'info-overlay';
            overlayContainer.appendChild(fixturesOverlay);
        }
        fixturesOverlay.style.opacity = previewMode ? '0.6' : '1';
        const listHtml = (fixturesData.list||[]).map(f=>`<div>${f.home} vs ${f.away}</div>`).join('');
        fixturesOverlay.innerHTML = buildInfoWindow('Fixtures', listHtml || 'No fixtures', branding, sponsorPlacements.intro, fixturesData.style || 'style1');
        if(!prevFixturesVisible){
            const sp = sponsorsData[sponsorPlacements.intro];
            if(sp) addSponsorLog(eventId,{ts:Date.now(),placement:'intro',sponsor:sponsorPlacements.intro,action:'show'});
        }
    } else if (fixturesOverlay) {
        if(prevFixturesVisible){
            const sp = sponsorsData[sponsorPlacements.intro];
            if(sp) addSponsorLog(eventId,{ts:Date.now(),placement:'intro',sponsor:sponsorPlacements.intro,action:'hide'});
        }
        fixturesOverlay.remove();
    }
    prevFixturesVisible = fixturesShow;

    // Course Overlay
    let courseOverlay = overlayContainer.querySelector('#course-overlay');
    const courseData = state && state.course;
    const courseShow = previewMode ? state && state.coursePreviewVisible : state && state.courseVisible;
    if (courseShow && courseData) {
        if (!courseOverlay) {
            courseOverlay = document.createElement('div');
            courseOverlay.id = 'course-overlay';
            overlayContainer.appendChild(courseOverlay);
        }
        courseOverlay.style.position = 'absolute';
        courseOverlay.style.top = '0';
        courseOverlay.style.left = '0';
        courseOverlay.style.width = '100vw';
        courseOverlay.style.height = '100vh';
        courseOverlay.style.background = 'rgba(0,0,0,0.8)';
        courseOverlay.style.color = '#fff';
        courseOverlay.style.display = 'flex';
        courseOverlay.style.alignItems = 'center';
        courseOverlay.style.justifyContent = 'center';
        courseOverlay.style.zIndex = '110';
        courseOverlay.style.fontFamily = branding.font;
        courseOverlay.style.opacity = previewMode ? '0.6' : '1';
        const rows = (courseData.holes||[]).map((h,i)=>`<tr><td>${i+1}</td><td>${h.tee||''}</td><td>${h.length||''}</td><td>${h.par||''}</td></tr>`).join('');
        courseOverlay.innerHTML = `<div style="text-align:center;">
            <div style="font-size:3rem;">${courseData.name || 'Course details'}</div>
            ${rows?`<table style="margin:1rem auto;font-size:2rem;"><thead><tr><th>#</th><th>Tee</th><th>Length</th><th>Par</th></tr></thead><tbody>${rows}</tbody></table>`:''}
        </div>`;
    } else if (courseOverlay) {
        courseOverlay.remove();
    }

    let weatherOverlay = overlayContainer.querySelector('#weather-overlay');
    const weatherData = state && state.weather;
    const weatherShow = previewMode ? state && state.weatherPreviewVisible : state && state.weatherVisible;
    if (weatherShow && weatherData) {
        if (!weatherOverlay) {
            weatherOverlay = document.createElement('div');
            weatherOverlay.id = 'weather-overlay';
            weatherOverlay.className = 'info-overlay';
            overlayContainer.appendChild(weatherOverlay);
        }
        weatherOverlay.style.opacity = previewMode ? '0.6' : '1';
        const slotHtml = (weatherData.slots || []).map(s=>`<div style='display:flex;flex-direction:column;align-items:center;padding:0 0.5rem;'><div>${s.time}</div><div>${WEATHER_ICONS[s.icon] || ''}</div><div>${s.temp}</div></div>`).join('');
        const header = weatherData.weatherLoc ? `<div style="text-align:center;font-size:1.25rem;margin-bottom:0.5rem;">${weatherData.weatherLoc}</div>` : '';
        const bodyHtml = `${header}<div style='display:flex;justify-content:center;'>${slotHtml}</div>`;
        weatherOverlay.innerHTML = buildInfoWindow('Weather', bodyHtml, branding, sponsorPlacements.intro, 'style1');
        if(!prevWeatherVisible){
            const sp = sponsorsData[sponsorPlacements.intro];
            if(sp) addSponsorLog(eventId,{ts:Date.now(),placement:'intro',sponsor:sponsorPlacements.intro,action:'show'});
        }
    } else if (weatherOverlay) {
        if(prevWeatherVisible){
            const sp = sponsorsData[sponsorPlacements.intro];
            if(sp) addSponsorLog(eventId,{ts:Date.now(),placement:'intro',sponsor:sponsorPlacements.intro,action:'hide'});
        }
        weatherOverlay.remove();
    }
    prevWeatherVisible = weatherShow;

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
        let baseClass = '';
        if(style === 'football' || style.startsWith('football-')) baseClass = 'sb-football ';
        else if(style.startsWith('basketball-')) baseClass = 'sb-basketball ';
        else if(style.startsWith('af-')) baseClass = 'sb-af ';
        else if(style === 'tennis' || style.startsWith('ten-')) baseClass = 'sb-tennis ';
        scoreboardOverlay.className = `sb-container ${baseClass}sb-${style}`;
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
        const teamA = getTeam(0) || { name: 'Team 1', abbrev: 'T1', color: '#333', logo: '' };
        const teamB = getTeam(1) || { name: 'Team 2', abbrev: 'T2', color: '#333', logo: '' };
        teamA.logo = resolveAssetPath(teamA.logo);
        teamB.logo = resolveAssetPath(teamB.logo);
        const nameAF = teamA.name || 'Team 1';
        const nameBF = teamB.name || 'Team 2';
        const abbrA = teamA.abbrev || suggestAbbreviation(nameAF);
        const abbrB = teamB.abbrev || suggestAbbreviation(nameBF);
        const useAbbrev = scoreboardData.abbreviate;
        const names = [useAbbrev ? abbrA : nameAF, useAbbrev ? abbrB : nameBF];
        const colors = [teamA.color || '#333', teamB.color || '#333'];
        const logos = scoreboardData.showLogos !== false ? [teamA.logo || null, teamB.logo || null] : [null,null];
        const showLogos = logos[0] && logos[1];
        const longest = Math.max(names[0].length, names[1].length);
        scoreboardOverlay.style.setProperty('--sb-team-width', `${longest}ch`);
        const sA = scoreboardData.scores?.[0] ?? 0;
        const sB = scoreboardData.scores?.[1] ?? 0;
        let timeStr = scoreboardData.time || '';
        if(scoreboardData.timerRunning && scoreboardData.timerStart){
            const elapsed = Math.floor((Date.now() - scoreboardData.timerStart)/1000);
            const base = scoreboardData.timerBase || parseTime(timeStr || '0:00');
            const countDown = (scoreboardData.timeDirection || 'up') === 'down';
            const secs = countDown ? Math.max(0, base - elapsed) : base + elapsed;
            timeStr = formatTime(secs);
        }
        const info = [];
        if (timeStr) info.push(timeStr);
        if (scoreboardData.period) {
            if(scoreboardData.extraTime && scoreboardData.period > 2) info.push('ET' + (scoreboardData.period - 2));
            else info.push('P' + scoreboardData.period);
        }
        if (scoreboardData.round) info.push('R' + scoreboardData.round);
        if (scoreboardData.sets) info.push('Sets ' + scoreboardData.sets.join('-'));
        if (scoreboardData.games) info.push('Games ' + scoreboardData.games.join('-'));
        if (scoreboardData.frames) {
            info.push('Frames ' + scoreboardData.frames.join('-'));
            if (scoreboardData.frameTarget) {
                const lbl = scoreboardData.frameFormat === 'bestOf' ? 'Best of' : 'First to';
                info.push(`${lbl} ${scoreboardData.frameTarget}`);
            }
        }
        if (scoreboardData.legs) info.push('Legs ' + scoreboardData.legs.join('-'));
        if (scoreboardData.points) info.push('Pts ' + scoreboardData.points.join('-'));
        if (scoreboardData.overs) info.push('Ov ' + scoreboardData.overs.join('-'));
        if (scoreboardData.wickets) info.push('Wk ' + scoreboardData.wickets.join('-'));
        const infoHtml = info.length ? `<div class='sb-info'>${info.join(' | ')}</div>` : '';
        const brand = branding.primaryColor || '#e16316';
        const textA = contrastColor(colors[0]);
        const textB = contrastColor(colors[1]);
        const textBrand = contrastColor(brand);
        const breakInd = breakVisible && scoreboardData.currentBreak !== undefined ? `<div class='sb-current-break ${breakPlayer === 1 ? 'right' : 'left'}'>${scoreboardData.currentBreak}</div>` : '';
        const checkoutHtml = scoreboardData.checkoutText ? `<div class='sb-checkout'>${names[scoreboardData.checkoutPlayer || 0]}: ${scoreboardData.checkoutText}</div>` : '';
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
        const topSp = sponsorsData[sponsorPlacements.scoreboardTop];
        const bottomSp = sponsorsData[sponsorPlacements.scoreboardBottom];
        const topImg = topSp ? `<img src='${topSp.logo}' class='sb-sponsor top'>` : '';
        const bottomImg = bottomSp ? `<img src='${bottomSp.logo}' class='sb-sponsor bottom'>` : '';
        if(style==='cricket'){
            const oA = scoreboardData.overs?.[0] ?? 0;
            const bA = scoreboardData.balls?.[0] ?? 0;
            const wA = scoreboardData.wickets?.[0] ?? 0;
            const oB = scoreboardData.overs?.[1] ?? 0;
            const bB = scoreboardData.balls?.[1] ?? 0;
            const wB = scoreboardData.wickets?.[1] ?? 0;
            scoreboardOverlay.innerHTML = `
            ${topImg}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${names[0]}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA}/${wA} (${oA}.${bA})</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${names[1]}</span>
            </div>
            ${sbSponsorHtml}
            ${bottomImg}`;
        } else if(style==='football' || style.startsWith('football-')){
            const timePart = timeStr ? `<span class="sb-time">${timeStr}</span>` : '';
            const stopPart = scoreboardData.showStoppage && scoreboardData.stoppage ? `<span class="sb-time">+${scoreboardData.stoppage}</span>` : '';
            scoreboardOverlay.innerHTML = `
            ${topImg}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA} - ${sB}</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
                ${timePart}
                ${stopPart}
            </div>
            ${sbSponsorHtml}
            ${bottomImg}`;
        } else if(style.startsWith('basketball-')){
            const period = scoreboardData.period || 1;
            const timePart = timeStr ? `<span class="sb-time">${timeStr}</span>` : '';
            const periodPart = `<span class="sb-time">Q${period}</span>`;
            scoreboardOverlay.innerHTML = `
            ${topImg}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA} - ${sB}</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
                ${periodPart}
                ${timePart}
            </div>
            ${sbSponsorHtml}
            ${bottomImg}`;
        } else if(style.startsWith('af-')){
            const period = scoreboardData.period || 1;
            const timePart = timeStr ? `<span class="sb-time">${timeStr}</span>` : '';
            const periodPart = `<span class="sb-time">Q${period}</span>`;
            scoreboardOverlay.innerHTML = `
            ${topImg}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA} - ${sB}</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
                ${periodPart}
                ${timePart}
            </div>
            ${sbSponsorHtml}
            ${bottomImg}`;
        } else if(style==='tennis' || style.startsWith('ten-')){
            const setsA = scoreboardData.sets?.[0] ?? 0;
            const setsB = scoreboardData.sets?.[1] ?? 0;
            const gamesA = scoreboardData.games?.[0] ?? 0;
            const gamesB = scoreboardData.games?.[1] ?? 0;
            scoreboardOverlay.innerHTML = `
            ${topImg}
            <table class="sb-tennis-table">
                <tr><th></th><th>Sets</th><th>Games</th><th>Pts</th></tr>
                <tr><td class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${names[0]}</td><td>${setsA}</td><td>${gamesA}</td><td>${sA}</td></tr>
                <tr><td class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${names[1]}</td><td>${setsB}</td><td>${gamesB}</td><td>${sB}</td></tr>
            </table>
            ${sbSponsorHtml}
            ${bottomImg}`;
        } else {
            scoreboardOverlay.innerHTML = `
            ${topImg}
            ${breakInd}
            <div class="sb-row">
                <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
                <span class="sb-score" style="background:${brand};color:${textBrand}">${sA} | ${sB}</span>
                <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
            </div>
            ${infoHtml}
            ${checkoutHtml}
            ${sbSponsorHtml}
            ${bottomImg}`;
        }
        let stopEl = overlayContainer.querySelector('#stoppage-overlay');
        if(!(style==='football' || style.startsWith('football-')) && scoreboardData.showStoppage && scoreboardData.stoppage){
            if(!stopEl){
                stopEl = document.createElement('div');
                stopEl.id = 'stoppage-overlay';
                overlayContainer.appendChild(stopEl);
            }
            stopEl.innerHTML = `<div class='lower-third-default' style='font-family:${branding.font};'>+${scoreboardData.stoppage}'</div>`;
        } else if(stopEl){
            stopEl.remove();
        }
        if(!prevScoreboardVisible){
            if(topSp) addSponsorLog(eventId,{ts:Date.now(),placement:'scoreboardTop',sponsor:sponsorPlacements.scoreboardTop,action:'show'});
            if(bottomSp) addSponsorLog(eventId,{ts:Date.now(),placement:'scoreboardBottom',sponsor:sponsorPlacements.scoreboardBottom,action:'show'});
        }
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
        if(prevScoreboardVisible){
            const topSp = sponsorsData[sponsorPlacements.scoreboardTop];
            const bottomSp = sponsorsData[sponsorPlacements.scoreboardBottom];
            if(topSp) addSponsorLog(eventId,{ts:Date.now(),placement:'scoreboardTop',sponsor:sponsorPlacements.scoreboardTop,action:'hide'});
            if(bottomSp) addSponsorLog(eventId,{ts:Date.now(),placement:'scoreboardBottom',sponsor:sponsorPlacements.scoreboardBottom,action:'hide'});
        }
        scoreboardOverlay = null;
        overlayContainer.querySelector('#high-break')?.remove();
    }
    prevScoreboardVisible = scoreboardShow;
    prevScoreboardData = scoreboardData;

    // Shootout Overlay
    let shootOverlay = overlayContainer.querySelector('#shootout-overlay');
    const shootData = state && state.scoreboard && state.scoreboard.shootout;
    const shootShow = previewMode ? state && state.shootoutPreviewVisible : state && state.shootoutVisible;
    if(shootShow && shootData){
        if(!shootOverlay){
            shootOverlay = document.createElement('div');
            shootOverlay.id = 'shootout-overlay';
            overlayContainer.appendChild(shootOverlay);
        }
        shootOverlay.style.position = 'absolute';
        shootOverlay.style.bottom = '2rem';
        shootOverlay.style.left = '50%';
        shootOverlay.style.transform = 'translateX(-50%)';
        shootOverlay.style.fontFamily = branding.font;
        shootOverlay.style.opacity = previewMode ? '0.6' : '1';
        const tA = getTeam(0) || {name:'Team 1'};
        const tB = getTeam(1) || {name:'Team 2'};
        const shotsA = shootData.shots?.[0] || [];
        const shotsB = shootData.shots?.[1] || [];
        const scoreA = shotsA.filter(s=>s && s.result==='goal').length;
        const scoreB = shotsB.filter(s=>s && s.result==='goal').length;
        const rows = Array.from({length:Math.max(shotsA.length, shotsB.length)}).map((_,i)=>{
            const a = shotsA[i] || {};
            const b = shotsB[i] || {};
            const aMark = a.result==='goal' ? '✓' : a.result==='miss' ? '✗' : '';
            const bMark = b.result==='goal' ? '✓' : b.result==='miss' ? '✗' : '';
            const aPlayer = a.player || '';
            const bPlayer = b.player || '';
            return `<tr><td>${aPlayer}</td><td class='text-center'>${aMark}</td><td class='px-4'></td><td>${bPlayer}</td><td class='text-center'>${bMark}</td></tr>`;
        }).join('');
        shootOverlay.innerHTML = `<div class='lower-third-default'><div class='font-bold mb-1'>Shoot-out ${scoreA}-${scoreB}</div><table class='text-sm'><tbody>${rows}</tbody></table></div>`;
    } else if(shootOverlay){
        shootOverlay.remove();
    }

    // Corner Sponsors
    ['tl','tr','bl','br'].forEach(pos=>{
        const idx = sponsorPlacements['corner'+pos.toUpperCase()] || '';
        const sponsor = sponsorsData[idx];
        const id = `corner-sponsor-${pos}`;
        let el = overlayContainer.querySelector('#'+id);
        if(sponsor){
            if(!el){
                el = document.createElement('img');
                el.id = id;
                el.className = `corner-sponsor ${pos}`;
                overlayContainer.appendChild(el);
            }
            el.src = sponsor.logo;
        } else if(el){
            el.remove();
        }
    });

    const live = (state && state.sponsorPlacementsLive) || {};
    const allPlacements = new Set([...Object.keys(prevSponsorLive), ...Object.keys(live)]);
    allPlacements.forEach(p=>{
        const vis = !!live[p];
        const idx = sponsorPlacements[p];
        const sponsor = sponsorsData[idx];
        const id = `manual-sponsor-${p}`;
        let el = overlayContainer.querySelector('#'+id);
        if(vis && sponsor){
            if(!el){
                el = document.createElement('img');
                el.id = id;
                el.className = placementClassMap[p] || '';
                overlayContainer.appendChild(el);
            }
            el.src = sponsor.logo;
            if(!prevSponsorLive[p]) addSponsorLog(eventId,{ts:Date.now(),placement:p,sponsor:idx,action:'show'});
            prevSponsorLive[p] = true;
        } else if(el){
            el.remove();
            if(prevSponsorLive[p]) addSponsorLog(eventId,{ts:Date.now(),placement:p,sponsor:idx,action:'hide'});
            prevSponsorLive[p] = false;
        } else if(prevSponsorLive[p]){
            addSponsorLog(eventId,{ts:Date.now(),placement:p,sponsor:idx,action:'hide'});
            prevSponsorLive[p] = false;
        }
    });

    // Formation Overlay
    let formOverlay = overlayContainer.querySelector('#formation-overlay');
    const formData = state && state.formation;
    const formShow = state && state.formationVisible;
    if (formShow && formData) {
        if (!formOverlay) {
            formOverlay = document.createElement('div');
            formOverlay.id = 'formation-overlay';
            formOverlay.className = 'info-overlay';
            overlayContainer.appendChild(formOverlay);
        }
        const showPhoto = teamsData && teamsData.showPhotosFormation;
        const pitchHtml = `<div class='formation-pitch'>`+
            formData.players.map(p=>{
                const photo = showPhoto && p.photo ? `<img src='${p.photo}' class='formation-photo'>` : '';
                const num = p.number ? `#${p.number} ` : '';
                const pos = p.pos ? `<div class='text-xs'>${p.pos}</div>` : '';
                return `<div class='formation-player' style='top:${p.y}%;left:${p.x}%;font-family:${branding.font};'>${photo}<span>${num}${p.name}</span>${pos}</div>`;
            }).join('') + `</div>`;
        formOverlay.innerHTML = buildInfoWindow(formData.teamName || 'Formation', pitchHtml, branding, sponsorPlacements.formationBottom, formData.style || 'style1');
        if(!prevFormationVisible){
            const bottomSp = sponsorsData[sponsorPlacements.formationBottom];
            if(bottomSp) addSponsorLog(eventId,{ts:Date.now(),placement:'formationBottom',sponsor:sponsorPlacements.formationBottom,action:'show'});
        }
    } else if (formOverlay) {
        if(prevFormationVisible){
            const bottomSp = sponsorsData[sponsorPlacements.formationBottom];
            if(bottomSp) addSponsorLog(eventId,{ts:Date.now(),placement:'formationBottom',sponsor:sponsorPlacements.formationBottom,action:'hide'});
        }
        formOverlay.remove();
    }
    prevFormationVisible = formShow;

    // Lineup Table Overlay
    let tableOverlay = overlayContainer.querySelector('#lineup-table-overlay');
    const tableData = state && state.lineupTable;
    const tableShow = previewMode ? state && state.lineupTablePreviewVisible : state && state.lineupTableVisible;
    if(tableShow && tableData){
        if(!tableOverlay){
            tableOverlay = document.createElement('div');
            tableOverlay.id = 'lineup-table-overlay';
            overlayContainer.appendChild(tableOverlay);
        }
        const showPhoto = teamsData && teamsData.showPhotosFormation;
        tableOverlay.style.opacity = previewMode ? '0.6' : '1';
        tableOverlay.innerHTML = `<div class='lineup-table' style='font-family:${branding.font};'>`+
            tableData.players.map(p=>{
                const photo = showPhoto && p.photo ? `<img src='${p.photo}' class='lineup-table-photo'>` : '';
                const num = p.number ? `${p.number} ` : '';
                return `<div class='lineup-row'>${photo}<span>${num}${p.name}${p.pos?` (${p.pos})`:''}</span></div>`;
            }).join('')+`</div>`;
    } else if(tableOverlay){
        tableOverlay.remove();
    }
    prevTableVisible = tableShow;

    // Results Overlay
    let resOverlay = overlayContainer.querySelector('#results-overlay');
    const resData = state && state.results;
    const resShow = state && state.resultsVisible || state && state.resultsPreviewVisible;
    if(resShow && resData){
        if(!resOverlay){
            resOverlay = document.createElement('div');
            resOverlay.id = 'results-overlay';
            overlayContainer.appendChild(resOverlay);
        }
        const scorersA = (resData.teamA.scorers||[]).map(s=>`<div>${s}</div>`).join('');
        const scorersB = (resData.teamB.scorers||[]).map(s=>`<div>${s}</div>`).join('');
        const body = `<div class='results-teams'>${resData.teamA.name} ${resData.teamA.score} - ${resData.teamB.score} ${resData.teamB.name}</div>`+
            `<div class='results-grid'><div><h3>${resData.teamA.name}</h3>${scorersA}</div>`+
            `<div><h3>${resData.teamB.name}</h3>${scorersB}</div></div>`;
        resOverlay.innerHTML = buildInfoWindow('Match Result', body, branding, resData.sponsor, resData.style||'style1');
    } else if(resOverlay){
        resOverlay.remove();
    }
    prevResultsVisible = resShow;

    // Standings Overlay
    let standOverlay = overlayContainer.querySelector('#standings-overlay');
    const standData = state && state.standings;
    const standShow = state && state.standingsVisible;
    if(standShow && standData){
        if(!standOverlay){
            standOverlay = document.createElement('div');
            standOverlay.id = 'standings-overlay';
            overlayContainer.appendChild(standOverlay);
        }
        const rows = (standData.rows||[]).map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.played}</td><td>${r.won}</td><td>${r.draw}</td><td>${r.lost}</td><td>${r.for}</td><td>${r.against}</td><td>${r.diff}</td><td>${r.points}</td></tr>`).join('');
        const body = `<table class='standings-table'><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>`;
        standOverlay.innerHTML = buildInfoWindow('Standings', body, branding, standData.sponsor, standData.style||'style1');
    } else if(standOverlay){
        standOverlay.remove();
    }

    // Match Log Overlay
    let logOverlay = overlayContainer.querySelector('#log-overlay');
    const logData = state && state.matchLog;
    const logShow = state && state.matchLogVisible;
    if(logShow && logData && logData.length){
        if(!logOverlay){
            logOverlay = document.createElement('div');
            logOverlay.id = 'log-overlay';
            overlayContainer.appendChild(logOverlay);
        }
        const rows = logData.map(e=>{
            const teamObj = e.team==='a'?getTeam(0):getTeam(1);
            const teamName = teamObj ? teamObj.name : e.team;
            return `<div>${e.time} - ${teamName} ${e.type}${e.player?` - ${e.player}`:''}</div>`;
        }).join('');
        logOverlay.innerHTML = `<div class='results-box' style='font-family:${branding.font};max-height:80vh;overflow-y:auto;'>${rows}</div>`;
    } else if(logOverlay){
        logOverlay.remove();
    }

    // Stats Overlay
    let statOverlay = overlayContainer.querySelector('#stat-overlay');
    const statData = state && state.stat;
    const statShow = previewMode ? state && state.statPreviewVisible : state && state.statVisible;
    if (statShow && statData && statData.rows && statData.rows.length) {
        if (!statOverlay) {
            statOverlay = document.createElement('div');
            statOverlay.id = 'stat-overlay';
            overlayContainer.appendChild(statOverlay);
        }
        statOverlay.style.position = 'absolute';
        statOverlay.style.fontFamily = branding.font;
        statOverlay.style.opacity = previewMode ? '0.6' : '1';

        // Positioning
        statOverlay.style.top = statOverlay.style.bottom = statOverlay.style.left = statOverlay.style.right = '';
        statOverlay.style.transform = '';
        switch(statData.position){
            case 'top-left':
                statOverlay.style.top = '2rem';
                statOverlay.style.left = '2rem';
                break;
            case 'top-right':
                statOverlay.style.top = '2rem';
                statOverlay.style.right = '2rem';
                break;
            case 'bottom-left':
                statOverlay.style.bottom = '2rem';
                statOverlay.style.left = '2rem';
                break;
            case 'bottom-right':
                statOverlay.style.bottom = '2rem';
                statOverlay.style.right = '2rem';
                break;
            case 'top-center':
                statOverlay.style.top = '2rem';
                statOverlay.style.left = '50%';
                statOverlay.style.transform = 'translateX(-50%)';
                break;
            default:
                statOverlay.style.bottom = '2rem';
                statOverlay.style.left = '50%';
                statOverlay.style.transform = 'translateX(-50%)';
        }

        const transition = statData.transition === 'fade-slide';
        const head = `<thead class='stat-head ${transition?'fade-in':''}'><tr><th></th><th>${statData.teamA}</th><th>${statData.teamB}</th></tr></thead>`;
        const body = `<tbody class='stat-body ${transition?'slide-down':''}'>${statData.rows.map(r=>`<tr><td>${r.label}</td><td>${r.a}</td><td>${r.b}</td></tr>`).join('')}</tbody>`;
        statOverlay.innerHTML = `<div class='stats-box ${statData.style || 'standard'}'><table>${head}${body}</table></div>`;
    } else if (statOverlay) {
        statOverlay.remove();
    }

    // Player Stat/Facts Overlay
    let playerStatOverlay = overlayContainer.querySelector('#player-stat-overlay');
    const playerStatData = state && state.playerStat;
    const playerStatShow = previewMode ? state && state.playerStatPreviewVisible : state && state.playerStatVisible;
    if (playerStatShow && playerStatData && playerStatData.player && playerStatData.fact) {
        if (!playerStatOverlay) {
            playerStatOverlay = document.createElement('div');
            playerStatOverlay.id = 'player-stat-overlay';
            overlayContainer.appendChild(playerStatOverlay);
        }
        playerStatOverlay.style.position = 'absolute';
        playerStatOverlay.style.bottom = '2rem';
        playerStatOverlay.style.left = '2rem';
        playerStatOverlay.style.fontFamily = branding.font;
        playerStatOverlay.style.opacity = previewMode ? '0.6' : '1';
        playerStatOverlay.innerHTML = `<div class='stats-box'><strong>${playerStatData.player}</strong>: ${playerStatData.fact}</div>`;
    } else if (playerStatOverlay) {
        playerStatOverlay.remove();
    }

    // Stinger Overlay
    let stingerOverlay = overlayContainer.querySelector('#stinger-overlay');
    const stingerData = state && state.stinger;
    const stingerShow = previewMode ? state && state.stingerPreviewVisible : state && state.stingerVisible;
    const stingerChanged = stingerShow !== prevStingerVisible || JSON.stringify(stingerData) !== JSON.stringify(prevStingerData);
    if (stingerShow && stingerData) {
        if (!stingerOverlay) {
            stingerOverlay = document.createElement('div');
            stingerOverlay.id = 'stinger-overlay';
            overlayContainer.appendChild(stingerOverlay);
        }
        stingerOverlay.style.fontFamily = branding.font;
        stingerOverlay.style.opacity = previewMode ? '0.6' : '1';
        if (stingerChanged) {
            const style = stingerData.style || 'logo';
            const colors = stingerData.colors || [branding.primaryColor || '#000', branding.secondaryColor1 || '#fff'];
            const textColor = branding.primaryColor || '#fff';
            const logoUrl = resolveAssetPath(stingerData.logo);
            stingerOverlay.style.background = 'transparent';
            if (style === 'split') {
                stingerOverlay.innerHTML = `
                <div class="stinger-split">
                    <div class="stinger-split-top" style="background:${colors[0]}"></div>
                    <div class="stinger-split-bottom" style="background:${colors[1]}"></div>
                    ${logoUrl ? `<img src='${logoUrl}' class='stinger-logo'>` : stingerData.text ? `<div class='stinger-logo stinger-text' style='color:${textColor}'>${stingerData.text}</div>` : ''}
                </div>`;
            } else {
                stingerOverlay.innerHTML = logoUrl ? `<img src='${logoUrl}'>` : stingerData.text ? `<div class='stinger-text' style='color:${textColor}'>${stingerData.text}</div>` : '';
            }
            clearTimeout(stingerTimeout);
            stingerTimeout = setTimeout(()=>updateOverlayState(eventId,{stingerVisible:false,stingerPreviewVisible:false}),2000);
        }
    } else if (stingerOverlay) {
        stingerOverlay.remove();
    }
    prevStingerVisible = stingerShow;
    prevStingerData = stingerData;

    // Presentation Overlay
    let presOverlay = overlayContainer.querySelector('#presentation-overlay');
    const presData = state && state.presentation;
    const presShow = previewMode ? state && state.presentationPreviewVisible : state && state.presentationVisible;
    if(presShow && presData && presData.url){
        if(!presOverlay){
            presOverlay = document.createElement('div');
            presOverlay.id = 'presentation-overlay';
            overlayContainer.appendChild(presOverlay);
        }
        presOverlay.className = presData.mode === 'pip' ? 'presentation-overlay pip' : 'presentation-overlay full';
        presOverlay.style.opacity = previewMode ? '0.6' : '1';
        presOverlay.innerHTML = `<iframe src='${presData.url}#page=${presData.page||1}'></iframe>`;
    } else if(presOverlay){
        presOverlay.remove();
    }
}

let lastState = null;
let lastGraphics = null;
let lastBranding = DEFAULT_BRANDING;
let teamsData = null;
let scoreboardPersist = null;
let sponsorsData = [];
let sponsorPlacements = {};

function getTeam(idx){
    if(!teamsData) return null;
    if(teamsData.teams){
        const sel = idx===0 ? teamsData.currentA||0 : teamsData.currentB||1;
        return teamsData.teams[sel] || null;
    }
    return idx===0 ? teamsData.teamA : teamsData.teamB;
}

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
listenTeams(eventId, data => {
    teamsData = data || null;
    updateOverlay();
});
onValue(ref(getDatabaseInstance(), `scoreboard/${eventId}`), snap => {
    scoreboardPersist = snap.val();
    updateOverlay();
});
listenSponsors(eventId, data => { sponsorsData = data || []; updateOverlay(); });
listenSponsorPlacements(eventId, data => { sponsorPlacements = data || {}; updateOverlay(); });

setInterval(()=>{
    if(lastState && lastState.scoreboard && lastState.scoreboard.timerRunning){
        updateOverlay();
    }
},1000);

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