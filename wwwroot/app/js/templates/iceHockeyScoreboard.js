export function renderIceHockeyScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    timeStr,
    period,
    shotsA = null,
    shotsB = null,
    ppA = false,
    ppB = false,
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
  const timePart = timeStr ? `<span class="sb-time">${timeStr}</span>` : '';
  const periodPart = period ? `<span class="sb-time">${period}</span>` : '';
  const shotsPart = (shotsA !== null && shotsB !== null) ? `
    <div class="sb-icehockey-details">
      <span class="sb-detail" style="background:${colors[0]};color:${textA}">SOG ${shotsA}</span>
      <span class="sb-detail" style="background:${colors[1]};color:${textB}">SOG ${shotsB}</span>
    </div>` : '';
  const ppIndicatorA = ppA ? `<span class="sb-pp" style="background:${colors[0]};color:${textA}">PP</span>` : '';
  const ppIndicatorB = ppB ? `<span class="sb-pp" style="background:${colors[1]};color:${textB}">PP</span>` : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}${ppIndicatorA}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA} - ${scoreB}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}${ppIndicatorB}</span>
      ${periodPart}
      ${timePart}
    </div>
    ${shotsPart}
    ${sbSponsorHtml}
    ${bottomImg}`;
}
