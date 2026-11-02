---
# COPY THIS FILE to write a tactics article. Files starting with "_" are never published.
title: "How to hide in melee"
date: 2026-11-03
tag: Positioning                  # used for the filters on the Tactics page: Positioning, Activations, Objectives, Your move...
standfirst: "The idea of the article in one or two sentences."
image: /img/articles/your-image.jpg   # optional, shown on the cards
image_alt: ""
takeaway: "The one thing to remember, shown in the orange box at the end."
teams: []
# BOARD (optional): build it on /editor/ and paste the "scene:" text here, replacing the lines below.
# mode: steps = explain step by step, puzzle = hide the answer behind "Show solution".
scene:
  map: volkus-1
  mode: steps
  sides:
    A: { team: kasrkin }
    B: { team: legionaries }
  units:
    - { id: K1, side: A, name: "Kasrkin trooper", at: E20 }
    - { id: L1, side: B, name: "Legionary", at: H17 }
  steps:
    - label: Step 1
      title: "Get into base contact behind the wall"
      text: "One or two sentences."
      moves: [[K1, F19], [K1, G18]]
    - label: Step 2
      title: "Now nobody can shoot you"
      text: "One or two sentences."
---
Write the article here.

[[board]]

Text after the board. Write [[board]] where the board should appear; without it, the board goes at the end.
