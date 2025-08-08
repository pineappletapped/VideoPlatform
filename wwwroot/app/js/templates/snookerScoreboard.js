export function renderSnookerScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    framesA = 0,
    framesB = 0,
    breakA = 0,
    breakB = 0,
    hiA = 0,
    hiB = 0,
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
  const turnA = turn === 0 ? '<span class="sb-turn">▶</span>' : '';
  const turnB = turn === 1 ? '<span class="sb-turn">▶</span>' : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA} - ${scoreB}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
    </div>
    <div class="sb-snooker-details">
      <span class="sb-detail" style="background:${colors[0]};color:${textA}">F${framesA} B${breakA} HB${hiA}${turnA}</span>
      <span class="sb-detail" style="background:${colors[1]};color:${textB}">F${framesB} B${breakB} HB${hiB}${turnB}</span>
    </div>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
