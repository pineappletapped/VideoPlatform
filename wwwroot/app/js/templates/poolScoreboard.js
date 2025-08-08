export function renderPoolScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    rack = '',
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
  const turnA = turn === 0 ? '<span class="sb-turn">●</span>' : '';
  const turnB = turn === 1 ? '<span class="sb-turn">●</span>' : '';
  const rackHtml = rack ? `<div class=\"sb-pool-details\"><span class=\"sb-detail\" style=\"background:${brand};color:${textBrand}\">Rack ${rack}</span></div>` : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}${turnA}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA} - ${scoreB}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}${turnB}</span>
    </div>
    ${rackHtml}
    ${sbSponsorHtml}
    ${bottomImg}`;
}
