// PUZZLE TEMPLATES. Roles (runner/gunner/fighter/any) are filled with the real operatives of the chosen teams.
// units: side F = you, E = enemy (does not act). wounds = starting wounds (default full). objectives = [x,y].
window.KTT=window.KTT||{};
KTT.puzzles=[
 {id:"split",title:"Split the markers",goal:"Secure both markers, then hold them.",w:10,h:8,walls:[[4,2],[4,3],[4,4],[5,3],[5,4],[5,5]],objectives:[[8,1],[8,6]],activations:2,
  units:[{id:"a",side:"F",role:"runner",x:1,y:3},{id:"b",side:"F",role:"runner",x:1,y:4},{id:"e1",side:"E",role:"any",x:9,y:3,label:"Guard"}]},
 {id:"shoot",title:"Shoot or secure?",goal:"Kill the guards or take the marker. Pick the best mix.",w:7,h:6,walls:[[3,2],[3,3]],objectives:[[5,5]],activations:2,
  units:[{id:"a",side:"F",role:"gunner",x:0,y:1},{id:"b",side:"F",role:"gunner",x:0,y:4},{id:"e1",side:"E",role:"any",x:6,y:1,label:"Guard 1"},{id:"e2",side:"E",role:"any",x:6,y:4,label:"Guard 2"}]},
 {id:"dash",title:"Dash to the marker",goal:"Reach the marker through the gap, then hold it.",w:10,h:6,walls:[[3,0],[3,1],[3,2],[3,4],[3,5],[6,0],[6,1],[6,3],[6,4],[6,5]],objectives:[[8,2]],activations:2,
  units:[{id:"a",side:"F",role:"runner",x:1,y:2},{id:"b",side:"F",role:"gunner",x:1,y:4},{id:"e1",side:"E",role:"any",x:9,y:4,label:"Guard"}]},
 {id:"charge",title:"Charge and fight",goal:"Take down the wounded enemy fighters.",w:8,h:6,walls:[[3,2],[3,3]],objectives:[[7,2]],activations:2,
  units:[{id:"a",side:"F",role:"fighter",x:0,y:2},{id:"b",side:"F",role:"fighter",x:0,y:4},{id:"e1",side:"E",role:"fighter",x:6,y:1,label:"Enemy 1",hp:.6},{id:"e2",side:"E",role:"fighter",x:6,y:4,label:"Enemy 2",hp:.6}]}
];
// builds a playable definition from a template and two teams
KTT.buildPuzzle=function(t,you,enemy){const used={F:[],E:[]},tm={F:you,E:enemy};
 return{id:t.id,title:t.title,goal:t.goal,w:t.w,h:t.h,walls:t.walls,objectives:t.objectives,activations:t.activations,
  units:t.units.map(u=>{const d=PZ.pick(tm[u.side],u.role,used[u.side]);return{id:u.id,side:u.side,label:u.label||(u.side==="F"?d.name:d.name),x:u.x,y:u.y,data:d,wounds:u.hp?Math.max(1,Math.round(d.max*u.hp)):(u.wounds&&u.wounds<99?u.wounds:undefined)}})}};
