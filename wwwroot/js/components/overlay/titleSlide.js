// Stub for title slide overlay
export function renderTitleSlide(container, data) {
    container.innerHTML = `<div class='title-slide'>Title Slide: ${data?.title || ''}</div>`;
}