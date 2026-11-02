---
title: "LVO Open battle report: Balance and patience matter"
image: /img/articles/lvo-pathfinders-vs-xv26.svg
image_alt: "Pixel art of a Pathfinder facing an XV26 Stealth Battlesuit"
date: 2026-10-20
event: "LVO Kill Team Championships · Day 1"
standfirst: "A T'au mirror on a customised Gallowdark map that turned in favour of the Pathfinders: better positioning, better tempo, more activations than the XV26."
map_name: Gallowdark
score: "16 – 3"
winner: { player: Azaryah, team: pathfinders }
loser: { player: Shawn, team: xv26-stealth-battlesuits }
teams: [pathfinders, xv26-stealth-battlesuits]
lesson: "Spread your threats: give your opponent more than one problem to solve."
video: "https://www.youtube.com/watch?v=K2lrPT-wrq4"
scene:
  map: gallowdark-1
  mode: moments
  title: The game in 5 moments
  sides:
    A: { team: pathfinders, player: Azaryah }
    B: { team: xv26-stealth-battlesuits, player: Shawn }
  units:
    - { id: SH, side: B, name: "Shas'vre", at: [17.7, 8.1] }
    - { id: DC, side: A, name: "Drone Controller Pathfinder", at: [1.9, 0.2] }
    - { id: SP, side: A, name: "Shas’ui Pathfinder", at: [2.7, 13.1] }
    - { id: DE, side: B, name: "Designator", at: [17.7, 5.4] }
    - { id: MG, side: B, name: "MV15 GUN DRONE", at: [17.6, 6.6] }
    - { id: NE, side: B, name: "Neutraliser", at: [17.7, 9.3] }
    - { id: LI, side: B, name: "Liberator", at: [17.7, 10.5] }
    - { id: MM, side: B, name: "MV76 MARKER DRONE", at: [17.7, 11.7] }
    - { id: LO, side: B, name: "Lodestar", at: [17.8, 13] }
    - { id: WE, side: A, name: "Weapons Expert Pathfinder", at: [1.7, 1.4] }
    - { id: W2, side: A, name: "Weapons Expert Pathfinder 2", at: [1.7, 2.5] }
    - { id: MT, side: A, name: "Medical Technician Pathfinder", at: [2, 3.4] }
    - { id: AG, side: A, name: "Assault Grenadier Pathfinder", at: [1.6, 4.5] }
    - { id: MS, side: A, name: "MV4 SHIELD DRONE", at: [2.2, 5.4] }
    - { id: CS, side: A, name: "Comms Specialist Pathfinder", at: [1.7, 6.7] }
    - { id: MP, side: A, name: "Marksman Pathfinder", at: [2.2, 8.4] }
    - { id: MR, side: A, name: "MB3 RECON DRONE", at: [2.2, 10.8] }
    - { id: BP, side: A, name: "Blooded Pathfinder", at: [2.9, 12] }
  steps:
    - label: Turning point 1
      title: "Shawn commits to the far objective"
      text: "The isolated objective sits in his territory, so he sends the Lodestar and a drone there, and thins out his presence in the centre."
      moves: [[LO, 15.9, 15.9], [MM, 15.9, 15.9], [WE, 3.9, 1.2], [WE, 4.5, 1], [MS, 7.1, 4.8], [AG, 7, 3.7], [MP, 3.9, 3.2], [CS, 4.5, 6.2], [MR, 4.9, 9.6], [MR, 4.8, 8.3], [BP, 4.7, 10.5], [SP, 4.7, 11.9], [NE, 15.9, 6.9], [SH, 12.4, 8.6], [DE, 12.6, 6.6], [LI, 14.8, 6.1]]
    - label: Turning point 2
      title: "The Grenadier trades and escapes"
      text: "The Neutraliser breaches the wall and hits him. He answers with a fusion grenade, then uses his extra APL to run into cover."
      setup: [[DE, 13.4, 3.4], [MG, 10.4, 7.6]]
      moves: [[NE, 9.6, 4], [AG, 4.3, 6.9]]
      shots: [[NE, AG], [AG, NE, 7, 3.7]]
    - label: Turning point 2
      title: "The Recon Drone takes the centre"
      text: "It moves onto the central objective and leaves the Gun Drone on 1 wound."
      setup: [[SH, 11.8, 4.3], [MP, 7.3, 3.7]]
      moves: [[MR, 8.9, 9.2]]
      shots: [[MR, MG]]
    - label: Turning point 3
      title: "The Shas'vre ends up in the open"
      text: "He kills a Weapons Expert and steals intelligence, but ends his activation exposed."
      setup: [[MS, 4.6, 8.2]]
      moves: [[SH, 7.1, 1.9]]
      shots: [[SH, WE]]
      kills: [WE]
    - label: Turning point 3
      title: "The Pathfinders close it out"
      text: "The leader kills the Liberator, then the second Weapons Expert finishes the Shas'vre. The game is over."
      setup: [[NE, 11.4, 4.4], [MP, 10, 1.5], [DE, 10.8, 3.8], [AG, 6.7, 4.2], [MM, 11.5, 16.4], [LO, 9.2, 15.2], [LI, 12.2, 7.3], [MR, 9.6, 7], [MS, 4.7, 1.2], [MG, 13.4, 8.6], [CS, 5.2, 3.2], [BP, 4.8, 7.4]]
      removed: [NE, DE, MR]
      moves: [[SP, 3.1, 6.7], [W2, 4.8, 1.7]]
      shots: [[SP, LI], [W2, SH]]
      kills: [LI, SH]
---
Azaryah's Pathfinders controlled the whole game, even setting up bait on C2. Shawn moved a large part of his strike force there but forgot to balance his presence across the map to create different problems for Azaryah. The Lodestar spent the whole game rebooting objectives, while the rest of the team got slaughtered. Easy win for Azaryah.
