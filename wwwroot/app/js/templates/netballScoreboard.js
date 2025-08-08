export function renderNetballScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    timeStr,
    period = 1,
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
  const timePart = timeStr ? `<span class="sb-time">${timeStr}</span>` : '';
  const periodPart = period ? `<span class="sb-time">Q${period}</span>` : '';
  const cpA = turn === 0 ? ' cp' : '';
  const cpB = turn === 1 ? ' cp' : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}${cpA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA} - ${scoreB}</span>
      <span class="sb-team${aClassB}${cpB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
      ${periodPart}
      ${timePart}
    </div>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
