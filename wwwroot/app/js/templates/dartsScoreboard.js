export function renderDartsScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    setsA = 0,
    setsB = 0,
    legsA = 0,
    legsB = 0,
    turn = null,
    checkoutHtml = '',
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
  const turnA = turn === 0 ? '<span class="sb-turn">▶</span>' : '';
  const turnB = turn === 1 ? '<span class="sb-turn">▶</span>' : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}${turnA}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}${turnB}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreB}</span>
    </div>
    <div class="sb-darts-details">
      <span class="sb-detail" style="background:${colors[0]};color:${textA}">S${setsA} L${legsA}</span>
      <span class="sb-detail" style="background:${colors[1]};color:${textB}">S${setsB} L${legsB}</span>
    </div>
    ${checkoutHtml}
    ${sbSponsorHtml}
    ${bottomImg}`;
}
