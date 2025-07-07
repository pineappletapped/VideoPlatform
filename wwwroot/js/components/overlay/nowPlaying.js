// Stub for now playing overlay
export function renderNowPlaying(container, data) {
    container.innerHTML = `<div class='now-playing'>Now Playing: ${data?.track || ''}</div>`;
}