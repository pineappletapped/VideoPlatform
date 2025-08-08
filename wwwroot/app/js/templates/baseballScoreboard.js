export function renderBaseballScoreboard(opts) {
  const {
    names,
    colors,
    logos,
    showLogos,
    scoreA,
    scoreB,
    inning = 1,
    balls = 0,
    strikes = 0,
    outs = 0,
    bases = [false, false, false],
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
  const inningPart = inning ? `<span class=\"sb-time\">In ${inning}</span>` : '';
  const basesPart = `<span class=\"sb-bases\">`+
    `<span class=\"base first ${bases[0] ? 'on' : ''}\"></span>`+
    `<span class=\"base second ${bases[1] ? 'on' : ''}\"></span>`+
    `<span class=\"base third ${bases[2] ? 'on' : ''}\"></span>`+
  `</span>`;
  return `
    ${topImg}
    <div class=\"sb-row\">
      <span class=\"sb-team${aClassA}\" style=\"background:${colors[0]};color:${textA}\">${showLogos ? `<img src='${logos[0]}' class='sb-team-logo'>` : ''}${names[0]}</span>
      <span class=\"sb-score\" style=\"background:${brand};color:${textBrand}\">${scoreA} - ${scoreB}</span>
      <span class=\"sb-team${aClassB}\" style=\"background:${colors[1]};color:${textB}\">${showLogos ? `<img src='${logos[1]}' class='sb-team-logo'>` : ''}${names[1]}</span>
      ${inningPart}
    </div>
    <div class=\"sb-row detail\">
      <span class=\"sb-detail\">B ${balls}</span>
      <span class=\"sb-detail\">S ${strikes}</span>
      <span class=\"sb-detail\">O ${outs}</span>
      ${basesPart}
    </div>
    ${sbSponsorHtml}
    ${bottomImg}`;
}
