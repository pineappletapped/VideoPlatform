export function renderPostStyleModal(container, { branding = {}, settings = {}, onSave }) {
  const sponsors = branding.sponsors || [];
  const defaults = {
    includeEventLogo: true,
    eventLogoChoice: 'primary',
    includeBrandLogo: true,
    includePlayerPhotos: true,
    includeTeamLogos: true,
    includeTeamColors: true,
    sponsors: sponsors.map(() => ({ include: true, placement: 'bottom-right' }))
  };
  const opts = { ...defaults, ...settings };
  if (opts.sponsors.length !== sponsors.length) {
    opts.sponsors = sponsors.map((s, i) => opts.sponsors[i] || { include: true, placement: 'bottom-right' });
  }
  const paletteBox = c => c ? `<div class="w-6 h-6 border" style="background:${c}"></div>` : '';
  const brandPalette = ['primaryColor', 'secondaryColor1', 'secondaryColor2']
    .map(k => paletteBox(branding[k]))
    .join('');
  const eventPalette = paletteBox(branding.eventColor || branding.primaryColor);
  const teamPalette = [branding.teamColorA, branding.teamColorB]
    .map(paletteBox)
    .join('');
  const sponsorPalette = sponsors.map(s => paletteBox(s.color)).join('');
  const sponsorRows = sponsors.map((s, i) => `
    <div class="flex items-center gap-2 mb-1">
      <input type="checkbox" id="sponsor-${i}" ${opts.sponsors[i]?.include ? 'checked' : ''}/>
      <label for="sponsor-${i}" class="flex-1">${s.name || 'Sponsor ' + (i + 1)}</label>
      <select id="sponsor-place-${i}" class="border p-1 text-xs">
        <option value="top-left" ${opts.sponsors[i]?.placement==='top-left'?'selected':''}>Top Left</option>
        <option value="top-right" ${opts.sponsors[i]?.placement==='top-right'?'selected':''}>Top Right</option>
        <option value="bottom-left" ${opts.sponsors[i]?.placement==='bottom-left'?'selected':''}>Bottom Left</option>
        <option value="bottom-right" ${opts.sponsors[i]?.placement==='bottom-right'?'selected':''}>Bottom Right</option>
      </select>
    </div>`).join('');
  container.innerHTML = `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white text-black p-4 rounded shadow-lg w-[360px] max-h-[90vh] overflow-y-auto">
        <h2 class="font-bold text-lg mb-4">Edit Post Style</h2>
        <form id="post-style-form" class="space-y-4 text-sm">
          <div>
            <label class="block font-semibold mb-1">Elements</label>
            <div class="mb-1">
              <label class="inline-flex items-center gap-1"><input type="checkbox" name="includeEventLogo" ${opts.includeEventLogo?'checked':''}/> Event Logo</label>
              <div class="ml-4">
                <label class="inline-flex items-center gap-1"><input type="radio" name="eventLogoChoice" value="primary" ${opts.eventLogoChoice!=='secondary'?'checked':''}/> Primary</label>
                <label class="inline-flex items-center gap-1 ml-2"><input type="radio" name="eventLogoChoice" value="secondary" ${opts.eventLogoChoice==='secondary'?'checked':''}/> Secondary</label>
              </div>
            </div>
            <div class="mb-1"><label class="inline-flex items-center gap-1"><input type="checkbox" name="includeBrandLogo" ${opts.includeBrandLogo?'checked':''}/> Brand Logo</label></div>
            <div class="mb-1"><label class="inline-flex items-center gap-1"><input type="checkbox" name="includePlayerPhotos" ${opts.includePlayerPhotos?'checked':''}/> Player Photos</label></div>
            <div class="mb-1"><label class="inline-flex items-center gap-1"><input type="checkbox" name="includeTeamLogos" ${opts.includeTeamLogos?'checked':''}/> Team Logos</label></div>
            <div class="mb-1"><label class="inline-flex items-center gap-1"><input type="checkbox" name="includeTeamColors" ${opts.includeTeamColors?'checked':''}/> Team Colours</label></div>
          </div>
          ${sponsors.length ? `<div><label class="block font-semibold mb-1">Sponsors</label>${sponsorRows}</div>` : ''}
          <div>
            <label class="block font-semibold mb-1">Color Palettes</label>
            <div class="flex items-center gap-2 mb-1"><span class="w-20 text-xs">Brand</span>${brandPalette}</div>
            <div class="flex items-center gap-2 mb-1"><span class="w-20 text-xs">Event</span>${eventPalette}</div>
            <div class="flex items-center gap-2 mb-1"><span class="w-20 text-xs">Teams</span>${teamPalette}</div>
            <div class="flex items-center gap-2"><span class="w-20 text-xs">Sponsors</span>${sponsorPalette}</div>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="control-button btn-sm">Save</button>
            <button type="button" id="post-style-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  container.classList.remove('hidden');
  const form = container.querySelector('#post-style-form');
  form.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(form);
    const newSettings = {
      includeEventLogo: !!f.get('includeEventLogo'),
      eventLogoChoice: f.get('eventLogoChoice') || 'primary',
      includeBrandLogo: !!f.get('includeBrandLogo'),
      includePlayerPhotos: !!f.get('includePlayerPhotos'),
      includeTeamLogos: !!f.get('includeTeamLogos'),
      includeTeamColors: !!f.get('includeTeamColors'),
      sponsors: sponsors.map((s, i) => ({
        include: form.querySelector(`#sponsor-${i}`)?.checked || false,
        placement: form.querySelector(`#sponsor-place-${i}`)?.value || 'bottom-right'
      }))
    };
    onSave && onSave(newSettings);
  };
  container.querySelector('#post-style-cancel').onclick = () => container.classList.add('hidden');
}
