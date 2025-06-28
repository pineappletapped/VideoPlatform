export function renderScoreboardPanel(container, sport='Football') {
    container.innerHTML = `<div class='text-gray-500'>Scoreboard controls for <span class="font-semibold">${sport}</span> coming soon.</div>`;
    if (!container.dataset.heartbeat) {
        setInterval(() => localStorage.setItem('sportsHeartbeat', Date.now().toString()), 5000);
        container.dataset.heartbeat = 'true';
    }
}
