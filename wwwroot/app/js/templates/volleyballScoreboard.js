export function renderVolleyballScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    setsA = 0,
    setsB = 0,
    turn = null,
    sbSponsorHtml,
    topImg,
    bottomImg,
    aClassA,
    aClassB,
    textA,
    textB,
    brand,
    textBrand
  } = opts;
  const serveA = turn === 0 ? ' serve' : '';
  const serveB = turn === 1 ? ' serve' : '';
  return `
    ${topImg}
    <table class="sb-volleyball-table">
      <tr><th></th><th>Sets</th><th>Pts</th></tr>
      <tr><td class="sb-team${aClassA}${serveA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</td><td>${setsA}</td><td>${scoreA}</td></tr>
      <tr><td class="sb-team${aClassB}${serveB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</td><td>${setsB}</td><td>${scoreB}</td></tr>
    </table>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
