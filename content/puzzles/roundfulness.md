---
title: "Puzzle: Take advantage of your versatility"
date: 2026-10-22
tag: Your move
moved_from: tactics/roundfulness/
standfirst: "This is an endgame. You have to score 2 VP to win it. Find the way."
image: /img/art/activation.svg
image_alt: "Pixel art question mark in a targeting frame above a game board"
teams: [angels-of-death, raveners]
takeaway: "Order matters. Score the objective first, then commit to the fight: the charge doesn't stop you from collecting the point on the way."
scene:
  map: divided-field
  mode: puzzle
  goal: Score 2 VP
  actions: [reposition, charge, fight, shoot, loot]
  vp_goal: 2
  question: "Your Angel of Death stands next to the objective. The Ravener waits behind the wall. One activation left. What do you do?"
  sides:
    A: { team: angels-of-death, player: You }
    B: { team: raveners }
  objectives: [D7]
  units:
    - { id: AD, side: A, name: "Angel of Death", at: C7 }
    - { id: RV, side: B, name: "Ravener", at: G3 }
  steps:
    - label: Step 1
      action: loot
      unit: AD
      title: Loot the objective first
      text: Before anything else, take the point that is already in reach.
      captured: [D7]
      vp: 1
    - label: Step 2
      action: charge
      unit: AD
      title: Charge through the gap
      text: Go around the wall through the opening and end in contact with the Ravener.
      moves: [[AD, E6], [AD, G6], [AD, G4]]
    - label: Step 3
      action: fight
      unit: AD
      title: Fight and kill the Ravener
      text: The kill gives the second VP. Puzzle solved.
      fights: [[AD, RV]]
      kills: [RV]
      vp: 1
---
[[board]]
