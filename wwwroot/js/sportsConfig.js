export const sportsData = {
  "Football": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["GK","LB","CB","RB","LWB","RWB","DM","CM","AM","LW","RW","ST"],
    scoreboard: { periods: 2, periodLabel: "Half", time: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
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
    scoreboard: { periods: 2, periodLabel: "Half", time: true },
    scoringButtons: [
      { label: "Try", value: 5, color: "#ef4444" },
      { label: "Conv", value: 2, color: "#3b82f6" },
      { label: "Pen", value: 3, color: "#fbbf24" },
      { label: "Drop", value: 3, color: "#9ca3af" }
    ]
  },
  "Hockey": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["Goalkeeper","Defender","Midfielder","Forward"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Ice Hockey": {
    teamCount: 2,
    playersPerTeam: 6,
    subs: 6,
    positions: ["Goalie","Defense","Center","Winger"],
    scoreboard: { periods: 3, periodLabel: "Period", time: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Boxing": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Fighter"],
    scoreboard: { round: true, timer: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Darts": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, legs: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Snooker": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true },
    scoringButtons: [
      { label: "Red", value: 1, color: "#b00000" },
      { label: "Yel", value: 2, color: "#ffd400", textColor: "#000" },
      { label: "Grn", value: 3, color: "#008000" },
      { label: "Brn", value: 4, color: "#8b4513" },
      { label: "Blu", value: 5, color: "#0066ff" },
      { label: "Pnk", value: 6, color: "#ff69b4" },
      { label: "Blk", value: 7, color: "#000000" },
      { label: "Foul", value: -4, color: "#ffffff", textColor: "#000" }
    ]
  },
  "Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, games: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Table Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { games: true, points: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Pool": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  },
  "Basketball": {
    teamCount: 2,
    playersPerTeam: 5,
    subs: 7,
    positions: ["PG","SG","SF","PF","C"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true },
    scoringButtons: [
      { label: "+1", value: 1, color: "#3b82f6" },
      { label: "+2", value: 2, color: "#10b981" },
      { label: "+3", value: 3, color: "#ef4444" }
    ]
  },
  "Netball": {
    teamCount: 2,
    playersPerTeam: 7,
    subs: 5,
    positions: ["GS","GA","WA","C","WD","GD","GK"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true },
    scoringButtons: [{ label: "+1", value: 1, color: "#10b981" }]
  }
};
