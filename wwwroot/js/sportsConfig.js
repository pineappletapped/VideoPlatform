export const sportsData = {
  "Football": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["GK","LB","CB","RB","LWB","RWB","DM","CM","AM","LW","RW","ST"],
    scoreboard: { periods: 2, periodLabel: "Half", time: true }
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
    scoreboard: { periods: 2, periodLabel: "Half", time: true }
  },
  "Hockey": {
    teamCount: 2,
    playersPerTeam: 11,
    subs: 5,
    positions: ["Goalkeeper","Defender","Midfielder","Forward"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true }
  },
  "Ice Hockey": {
    teamCount: 2,
    playersPerTeam: 6,
    subs: 6,
    positions: ["Goalie","Defense","Center","Winger"],
    scoreboard: { periods: 3, periodLabel: "Period", time: true }
  },
  "Boxing": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Fighter"],
    scoreboard: { round: true, timer: true }
  },
  "Darts": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, legs: true }
  },
  "Snooker": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true }
  },
  "Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { sets: true, games: true }
  },
  "Table Tennis": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { games: true, points: true }
  },
  "Pool": {
    teamCount: 2,
    playersPerTeam: 1,
    subs: 0,
    positions: ["Player"],
    scoreboard: { frames: true }
  },
  "Basketball": {
    teamCount: 2,
    playersPerTeam: 5,
    subs: 7,
    positions: ["PG","SG","SF","PF","C"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true }
  },
  "Netball": {
    teamCount: 2,
    playersPerTeam: 7,
    subs: 5,
    positions: ["GS","GA","WA","C","WD","GD","GK"],
    scoreboard: { periods: 4, periodLabel: "Quarter", time: true }
  }
};
