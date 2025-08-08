export function renderGolfScoreboard(opts){
  const { courseName, players, brand, textBrand, sbSponsorHtml = '', topImg = '', bottomImg = '' } = opts;
  const rows = (players||[]).slice().sort((a,b)=>(a.total||0)-(b.total||0)).map(p=>
    `<tr><td class='pr-4'>${p.name}</td><td>${p.total}</td><td>${p.thru||0}</td><td>${p.today>=0?`+${p.today}`:p.today}</td></tr>`
  ).join('');
  return `
    ${topImg}
    <div class='sb-row'><span class='sb-team' style='background:${brand};color:${textBrand}'>${courseName}</span></div>
    <table class='golf-table text-sm mt-1'>
      <thead><tr><th>Name</th><th>Tot</th><th>Thru</th><th>Today</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
