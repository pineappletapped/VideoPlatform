export const sportsData = {
  "Football": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["GK","LB","CB","RB","LWB","RWB","DM","CM","AM","LW","RW","ST"],
    scoreboard: { periods: 2, periodLabel: "Half", time: true, timeDirection: 'up' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['goal','substitution','corner','throw in','yellow card','red card','free kick']
  },
  "Rugby": {
    teamCount: 2,
    playersPerTeam: 15,
    subs: 8,
    positions: [
      "Loosehead Prop","Hooker","Tighthead Prop","Lock","Lock",
      "Flanker","Flanker","Number 8","Scrum-half","Fly-half",
      "Wing","Inside Centre","Outside Centre","Wing","Full-back"
    ],
    scoreboard: { periods: 2, periodLabel: "Half", time: true, timeDirection: 'up' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [
      { label: "Try", value: 5, color: "#ef4444" },
      { label: "Conv", value: 2, color: "#3b82f6" },
      { label: "Pen", value: 3, color: "#fbbf24" },
      { label: "Drop", value: 3, color: "#9ca3af" }
    ],
    logEvents: ['try','conversion','penalty','drop goal','yellow card','red card','substitution']
  },
  "Hockey": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["Goalkeeper","Defender","Midfielder","Forward"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true, timeDirection: 'up' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['goal','substitution','green card','yellow card','red card']
  },
  "Ice Hockey": {
    teamCount: 2,
    playersPerTeam: 6,
    subs: 6,
    positions: ["Goalie","Defense","Center","Winger"],
    scoreboard: { periods: 3, periodLabel: "Period", time: true, timeDirection: 'down' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['goal','penalty','power play','substitution','timeout']
  },
  "Boxing": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Fighter"],
    scoreboard: { round: true, time: true, timeDirection: 'down' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['knockdown','knockout','warning','round end']
  },
  "Darts": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, legs: true, turn: true, start: 501, checkout: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [
      { label: "-1", value: -1, color: "#10b981" },
      { label: "-5", value: -5, color: "#3b82f6" },
      { label: "-10", value: -10, color: "#6366f1" },
      { label: "-20", value: -20, color: "#f59e0b" },
      { label: "-60", value: -60, color: "#ef4444" }
    ],
    logEvents: ['180','checkout','set won','leg won']
  },
  "Snooker": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true, breaks: true, highBreak: true, turn: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [
      { label: "Red", value: 1, color: "#b00000" },
      { label: "Yel", value: 2, color: "#ffd400", textColor: "#000" },
      { label: "Grn", value: 3, color: "#008000" },
      { label: "Brn", value: 4, color: "#8b4513" },
      { label: "Blu", value: 5, color: "#0066ff" },
      { label: "Pnk", value: 6, color: "#ff69b4" },
      { label: "Blk", value: 7, color: "#000000" },
      { label: "Foul", value: -4, color: "#ffffff", textColor: "#000" }
    ],
    logEvents: ['147','100+ break','foul','frame win']
  },
  "Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, games: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['ace','double fault','break point','set won']
  },
  "Table Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { games: true, points: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['point','fault','timeout','game won']
  },
  "Pool": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['ball potted','foul','rack won','break']
  },
  "Basketball": {
    teamCount: 2,
    playersPerTeam: 5,
    subs: 7,
    positions: ["PG","SG","SF","PF","C"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true, timeDirection: 'down' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [
      { label: "+1", value: 1, color: "#3b82f6" },
      { label: "+2", value: 2, color: "#10b981" },
      { label: "+3", value: 3, color: "#ef4444" }
    ],
    logEvents: ['point','substitution','foul','timeout']
  },
  "Netball": {
    teamCount: 2,
    playersPerTeam: 7,
    subs: 5,
    positions: ["GS","GA","WA","C","WD","GD","GK"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true, timeDirection: 'down' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['goal','turnover','interception','timeout','substitution']
  },
  "Cricket": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["Batter","Bowler","All-rounder","Wicketkeeper"],
    scoreboard: { overs: true, wickets: true, balls: true, turn: true },
    scoreboardStyles: ['cricket','style1','style2'],
    scoringButtons: [
      { label: "+1", value: 1, color: "#10b981" },
      { label: "Wkt", value: "w", color: "#ef4444" }
    ],
    logEvents: ['bowled out','wicket','four','six','no ball','wide']
  },
  "Golf": {
    teamCount: 1,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { golf: true },
    scoreboardStyles: ['style1'],
    scoringButtons: [],
    logEvents: ['birdie','eagle','bogey','par','hole in one']
  },
  "Baseball": {
    teamCount: 2,
    playersPerTeam: 9,
    subs: 5,
    positions: [
      "Pitcher","Catcher","First Base","Second Base","Shortstop",
      "Third Base","Left Field","Center Field","Right Field"
    ],
    scoreboard: { periods: 9, periodLabel: "Inning" },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "Run", value: 1, color: "#10b981" }],
    logEvents: ['home run','strikeout','walk','error','substitution']
  },
  "American Football": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true, timeDirection: 'down' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [
      { label: "TD", value: 6, color: "#10b981" },
      { label: "FG", value: 3, color: "#3b82f6" },
      { label: "XP", value: 1, color: "#fbbf24" },
      { label: "2P", value: 2, color: "#8b5cf6" }
    ],
    logEvents: ['touchdown','field goal','extra point','two-point conversion','safety','turnover','penalty','timeout']
  },
  "Volleyball": {
    teamCount: 2,
    playersPerTeam: 6,
    subs: 6,
    positions: ["Setter","Opposite","Outside","Middle","Libero","Defensive Specialist"],
    scoreboard: { games: true, points: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['point','ace','block','timeout','substitution']
  },
  "Badminton": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { games: true, points: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['point','fault','timeout','game won']
  },
  "Squash": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { games: true, points: true },
    scoreboardStyles: ['style1','style2','style3','style4','style5'],
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }],
    logEvents: ['point','stroke','timeout','game won']
  },
  "Gaelic Football": {
    teamCount: 2,
    playersPerTeam: 15,
    subs: 5,
    positions: [
      "Goalkeeper","Corner Back","Full Back","Corner Back","Wing Back",
      "Centre Back","Wing Back","Midfield","Midfield","Wing Forward",
      "Centre Forward","Wing Forward","Corner Forward","Full Forward",
      "Corner Forward"
    ],
    scoreboard: { periods: 2, periodLabel: "Half", time: true, timeDirection: 'up' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [
      { label: "Point", value: 1, color: "#10b981" },
      { label: "Goal", value: 3, color: "#ef4444" }
    ],
    logEvents: ['point','goal','free kick','substitution','yellow card','red card']
  },
  "Hurling": {
    teamCount: 2,
    playersPerTeam: 15,
    subs: 5,
    positions: [
      "Goalkeeper","Corner Back","Full Back","Corner Back","Wing Back",
      "Centre Back","Wing Back","Midfield","Midfield","Wing Forward",
      "Centre Forward","Wing Forward","Corner Forward","Full Forward",
      "Corner Forward"
    ],
    scoreboard: { periods: 2, periodLabel: "Half", time: true, timeDirection: 'up' },
    scoreboardStyles: ['style1','style2','style3','style4','style5','h1','h2'],
    scoringButtons: [
      { label: "Point", value: 1, color: "#10b981" },
      { label: "Goal", value: 3, color: "#ef4444" }
    ],
    logEvents: ['point','goal','free puck','substitution','yellow card','red card']
  }
};

export function getTeamLabel(sport){
  const cfg = sportsData[sport] || sportsData['Football'];
  return cfg.playersPerTeam === 1 ? 'Players' : 'Teams';
}
