import { listenOverlayState, listenGraphicsData, listenBranding } from './firebase.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let countdownInterval = null;

// Overlay heartbeat for status bar feedback
setInterval(() => {
    localStorage.setItem('overlayHeartbeat', Date.now().toString());
}, 2000);

function applyBranding(branding) {
    document.body.style.fontFamily = branding.font;
    document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
    document.documentElement.style.setProperty('--brand-secondary1', branding.secondaryColor1);
    document.documentElement.style.setProperty('--brand-secondary2', branding.secondaryColor2);
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

function renderOverlayFromFirebase(state, graphics, branding) {
    applyBranding(branding);
    const overlayContainer = document.getElementById('overlay-container');
    if (!overlayContainer) return;
    // Remove overlays
    overlayContainer.querySelector('#program-overlay')?.remove();
    overlayContainer.querySelector('#holdslate-overlay')?.remove();
    // Lower Third
    let lowerThird = null;
    let liveLowerThirdId = graphics && graphics.liveLowerThirdId;
    if (graphics && graphics.lowerThirds && liveLowerThirdId) {
        lowerThird = graphics.lowerThirds.find(lt => lt.id === liveLowerThirdId);
    }
    document.getElementById('lower-third').innerHTML = lowerThird
        ? `<div class='lower-third' style='position:absolute;bottom:2rem;left:2rem;min-width:300px;background:var(--brand-primary);color:#fff;padding:1rem 2rem;border-radius:0.5rem;box-shadow:0 2px 8px #0003;font-family:${branding.font};'>
            ${branding.logoPrimary ? `<img src='${branding.logoPrimary}' alt='Logo' style='height:32px;display:inline-block;margin-right:1rem;vertical-align:middle;' />` : ''}
            <span style='vertical-align:middle;'><span style='font-weight:bold;font-size:1.2em;'>${lowerThird.title}</span><br><span style='font-size:1em;'>${lowerThird.subtitle}</span></span>
        </div>`
        : '';
    // Now Playing (stub)
    document.getElementById('now-playing').innerHTML = `<div class='now-playing' style='position:absolute;top:2rem;right:2rem;background:var(--brand-secondary1);color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;font-family:${branding.font};'>Now Playing: Demo Track</div>`;
    // Title Slide
    let titleSlide = null;
    let liveTitleSlideId = graphics && graphics.liveTitleSlideId;
    if (graphics && graphics.titleSlides && liveTitleSlideId) {
        titleSlide = graphics.titleSlides.find(ts => ts.id === liveTitleSlideId);
    }
    document.getElementById('title-slide').innerHTML = titleSlide
        ? `<div class='title-slide' style='position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);min-width:350px;background:var(--brand-secondary2);color:#004a77;padding:2rem 2.5rem;border-radius:0.5rem;box-shadow:0 2px 8px #0003;font-family:${branding.font};text-align:center;'>
            ${branding.logoSecondary ? `<img src='${branding.logoSecondary}' alt='Logo' style='height:40px;display:block;margin:0 auto 1rem auto;' />` : ''}
            <div style='font-weight:bold;font-size:2em;margin-bottom:0.5rem;'>${titleSlide.title}</div>
            <div style='font-size:1.2em;'>${titleSlide.subtitle}</div>
        </div>`
        : '';
    // Program Overlay
    let program = state && state.program;
    let programOverlay = overlayContainer.querySelector('#program-overlay');
    if (state && state.liveProgramVisible && program && program.length) {
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
    } else if (programOverlay) {
        programOverlay.remove();
    }
    // Holdslate Overlay
    let holdslateOverlay = overlayContainer.querySelector('#holdslate-overlay');
    const holdslateData = state && state.holdslate;
    if (state && state.holdslateVisible && holdslateData && holdslateData.image) {
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
        renderHoldslateCountdown(holdslateData, branding);
        if (countdownInterval) clearInterval(countdownInterval);
        if (holdslateData.countdown) {
            countdownInterval = setInterval(() => renderHoldslateCountdown(holdslateData, branding), 1000);
        }
    } else if (holdslateOverlay) {
        holdslateOverlay.remove();
        if (countdownInterval) clearInterval(countdownInterval);
    }
}

let lastState = null;
let lastGraphics = null;
let lastBranding = null;

function updateOverlay() {
    renderOverlayFromFirebase(lastState, lastGraphics, lastBranding);
}

listenOverlayState(eventId, (state) => {
    lastState = state || {};
    updateOverlay();
});
listenGraphicsData(eventId, (graphics) => {
    lastGraphics = graphics || { lowerThirds: [], titleSlides: [] };
    updateOverlay();
});
listenBranding(eventId, (branding) => {
    lastBranding = branding || {
        primaryColor: '#00ADF1',
        secondaryColor1: '#004a77',
        secondaryColor2: '#e0f7ff',
        logoPrimary: '',
        logoSecondary: '',
        font: 'Arial'
    };
    updateOverlay();
});