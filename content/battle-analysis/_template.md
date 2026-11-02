---
# COPY THIS FILE to write a battle analysis. Files starting with "_" are never published.
title: "Short headline about the game"
date: 2026-11-03
event: "Tournament name · Round 2"
standfirst: "Two sentences: who played, what decided the game."
map_name: Volkus
score: "14 – 9"
winner: { player: "Player name", team: kasrkin }       # team = file name from content/teams
loser: { player: "Player name", team: legionaries }
teams: [kasrkin, legionaries]
lesson: "The one lesson to take home (orange box)."
video: ""                                              # link to the stream, optional
# BOARD: build it on /editor/ (type "Battle analysis") and paste the "scene:" text here.
scene:
  map: volkus-1
  mode: moments
  sides:
    A: { team: kasrkin, player: "Player name" }
    B: { team: legionaries, player: "Player name" }
  units:
    - { id: K1, side: A, name: "Kasrkin trooper", at: E26 }
    - { id: L1, side: B, name: "Legionary", at: H4 }
  steps:
    - label: Turning point 1
      title: "First key moment"
      text: "What happened and why it matters."
      moves: [[K1, E20]]
---
## What happened

A short summary of the whole game.
