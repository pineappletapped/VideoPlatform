export function renderSportPanel(container, eventData, onChange) {
    const eventId = eventData.id || 'demo';
    const sport = eventData.sport || 'Football';
    const sports = ['Football','Rugby','Hockey','Ice Hockey','Boxing','Darts','Snooker','Tennis','Table Tennis','Pool','Basketball','Netball','Golf'];
    container.innerHTML = `
        <div class='sport-panel'>
            <h2 class="font-bold text-lg mb-2">Select Sport</h2>
            <select id="sport-select" class="border p-1 w-full">
                ${sports.map(s=>`<option ${s===sport?'selected':''}>${s}</option>`).join('')}
            </select>
        </div>
    `;
    const sel = container.querySelector('#sport-select');
    sel.onchange = () => {
        const newSport = sel.value;
        if (onChange) onChange(eventId, newSport);
    };
}
