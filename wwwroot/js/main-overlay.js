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
    sponsors: []
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
        document.getElementById('lower-third').innerHTML =
            `<div class='${styleClass}' style='position:absolute;${stylePos}min-width:300px;font-family:${branding.font};'>`+
            `${branding.logoPrimary ? `<img src='${branding.logoPrimary}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}`+
            `<span style='vertical-align:middle;'><span style='font-weight:bold;font-size:1.2em;'>${lowerThird.title}</span><br><span style='font-size:1em;'>${lowerThird.subtitle}</span></span>`+
            `</div>`;
    } else if (!previewMode) {
        document.getElementById('lower-third').innerHTML = '';
    }
    if (state && state.musicVisible && state.nowPlaying) {
        document.getElementById('now-playing').innerHTML = `<div class='now-playing' style='position:absolute;top:2rem;right:2rem;background:var(--brand-secondary1);color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;font-family:${branding.font};'>Now Playing: ${state.nowPlaying.name}</div>`;
        if (!window.musicAudio || window.musicAudio.src !== state.nowPlaying.audioUrl) {
            if (window.musicAudio) window.musicAudio.pause();
            window.musicAudio = new Audio(state.nowPlaying.audioUrl);
            window.musicAudio.volume = masterVolume * musicVolume;
            window.musicAudio.play().catch(err => console.warn('Music autoplay failed', err));
        }
        if (window.musicAudio) window.musicAudio.volume = masterVolume * musicVolume;
    } else {
        document.getElementById('now-playing').innerHTML = '';
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
        programOverlay.style.position = 'absolute';
        programOverlay.style.bottom = '2rem';
        programOverlay.style.right = '2rem';
        programOverlay.style.background = branding.primaryColor + 'cc';
        programOverlay.style.color = '#fff';
        programOverlay.style.padding = '1rem 2rem';
        programOverlay.style.borderRadius = '0.5rem';
        programOverlay.style.boxShadow = '0 2px 8px #0003';
        programOverlay.style.fontFamily = branding.font;
        programOverlay.innerHTML = `<div class='font-bold text-lg mb-2'>Program</div><table><tbody>${program.map(item => `<tr><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td>${item.presenter}</td></tr>`).join('')}</tbody></table>`;
    } else if (previewMode && state && state.previewProgramVisible && program && program.length) {
        if (!programOverlay) {
            programOverlay = document.createElement('div');
            programOverlay.id = 'program-overlay';
            overlayContainer.appendChild(programOverlay);
        }
        programOverlay.style.position = 'absolute';
        programOverlay.style.bottom = '2rem';
        programOverlay.style.right = '2rem';
        programOverlay.style.background = branding.primaryColor + 'cc';
        programOverlay.style.color = '#fff';
        programOverlay.style.padding = '1rem 2rem';
        programOverlay.style.borderRadius = '0.5rem';
        programOverlay.style.boxShadow = '0 2px 8px #0003';
        programOverlay.style.fontFamily = branding.font;
        programOverlay.style.opacity = '0.6';
        programOverlay.innerHTML = `<div class='font-bold text-lg mb-2'>Program</div><table><tbody>${program.map(item => `<tr><td class='pr-4'>${item.time}</td><td class='pr-4'>${item.title}</td><td>${item.presenter}</td></tr>`).join('')}</tbody></table>`;
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
    if (scoreboardShow && scoreboardData) {
        if (!scoreboardOverlay) {
            scoreboardOverlay = document.createElement('div');
            scoreboardOverlay.id = 'scoreboard-overlay';
            overlayContainer.appendChild(scoreboardOverlay);
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
        scoreboardOverlay.innerHTML = `
            <div class="sb-row">
                <span class="sb-team" style="background:${colors[0]}">${names[0] || 'Team 1'}</span>
                <span class="sb-score" style="background:${brand}">${sA} | ${sB}</span>
                <span class="sb-team" style="background:${colors[1]}">${names[1] || 'Team 2'}</span>
            </div>
            ${infoHtml}`;
    } else if (scoreboardOverlay) {
        scoreboardOverlay.remove();
    }
}

let lastState = null;
let lastGraphics = null;
let lastBranding = DEFAULT_BRANDING;
let teamsData = null;

function updateOverlay() {
    renderOverlayFromFirebase(lastState, lastGraphics, lastBranding);
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