export function renderSquashScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    gamesA = 0,
    gamesB = 0,
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
    <table class="sb-squash-table">
      <tr><th></th><th>Games</th><th>Pts</th></tr>
      <tr><td class="sb-team${aClassA}${serveA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</td><td>${gamesA}</td><td>${scoreA}</td></tr>
      <tr><td class="sb-team${aClassB}${serveB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</td><td>${gamesB}</td><td>${scoreB}</td></tr>
    </table>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
