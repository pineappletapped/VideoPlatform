export function renderCricketScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    wicketsA,
    wicketsB,
    oversA,
    ballsA,
    oversB,
    ballsB,
    runRate,
    requiredRate,
    target,
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
  const rrPart = runRate ? `<span class="sb-detail">RR ${parseFloat(runRate).toFixed(2)}</span>` : '';
  const targetPart = target ? `<span class="sb-detail">Target ${target}</span>` : '';
  const reqPart = requiredRate ? `<span class="sb-detail">Req ${parseFloat(requiredRate).toFixed(2)}</span>` : '';
  return `
    ${topImg}
    <div class="sb-row">
      <span class="sb-team${aClassA}" style="background:${colors[0]};color:${textA}">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreA}/${wicketsA}</span>
      <span class="sb-overs">${oversA}.${ballsA}</span>
      <span class="sb-team${aClassB}" style="background:${colors[1]};color:${textB}">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
      <span class="sb-score" style="background:${brand};color:${textBrand}">${scoreB}/${wicketsB}</span>
      <span class="sb-overs">${oversB}.${ballsB}</span>
    </div>
    <div class="sb-row detail">
      ${rrPart}
      ${targetPart}
      ${reqPart}
    </div>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
