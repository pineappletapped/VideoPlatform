export function renderRugbyScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    timeStr,
    period,
    triesA = 0,
    triesB = 0,
    convA = 0,
    convB = 0,
    penA = 0,
    penB = 0,
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
  const detailsPart = (triesA || triesB || convA || convB || penA || penB) ? `
    <div class="sb-rugby-details">
      <span class="sb-detail" style="background:${colors[0]};color:${textA}">${triesA}T ${convA}C ${penA}P</span>
      <span class="sb-detail" style="background:${colors[1]};color:${textB}">${triesB}T ${convB}C ${penB}P</span>
    </div>` : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA} - ${scoreB}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
      ${periodPart}
      ${timePart}
    </div>
    ${detailsPart}
    ${sbSponsorHtml}
    ${bottomImg}`;
}
