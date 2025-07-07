// Stub for lower third overlay
export function renderLowerThird(container, data) {
    container.innerHTML = `<div class='lower-third'>Lower Third: ${data?.title || ''}</div>`;
}