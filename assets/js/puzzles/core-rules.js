// RULES USED BY THE PUZZLE ENGINE.
// verified:true  = from the Kill Team Lite Rules (July 2025) or the datacards.
// verified:false = simplification or invented. Change here or in engine.js (PZ.C).
window.PZ=window.PZ||{};
PZ.RULES={
 stats:{value:"APL, Move, Save, Wounds, weapon Atk/Hit/Dmg and rules from the datacards",verified:true,note:"All 47 teams."},
 actions:{value:"Reposition, Dash, Charge, Shoot, Fight: 1 AP. Each action once per activation",verified:true,note:"Lite Rules. Reposition and Dash can be combined; Charge cannot be combined with Reposition or Dash."},
 movement:{value:"Reposition = Move stat, Dash = 3, Charge = Move + 2 (inches)",verified:true,note:"Simplified to a grid: 1 square = 1 inch, orthogonal steps, no walls or operatives crossed. Reposition and Dash cannot enter an enemy control range, Charge must end in one."},
 controlRange:{value:"1 inch, visible",verified:true,note:"Grid: the 8 squares around an operative, with line of sight. Shooting is not allowed inside an enemy control range."},
 visible:{value:"A straight line between square centres, blocked by wall squares",verified:false,note:"Simplified. If it is visible it can be shot. Cover, Conceal and Engage orders are not used."},
 shooting:{value:"Attack and defence dice rules, Lethal, Piercing, Piercing Crits, Accurate, Balanced, Ceaseless, Brutal, Rending, Punishing, Severe, Devastating, Range, Heavy",verified:true,note:"Lite Rules. Blast, Torrent, Hot, Shock, Stun, Limited and special rules of team abilities are not modelled. The best usable weapon is chosen for you."},
 fighting:{value:"Both roll, then alternate strike or block, attacker first",verified:true,note:"Lite Rules. Each player picks the action with the biggest immediate swing and always takes a killing strike. The target retaliates with its best melee weapon."},
 probability:{value:"No dice are thrown: every shot or fight gives a probability",verified:false,note:"Results come from 40,000 fixed-seed simulated attacks per weapon. An operative is treated as removed once it is more likely dead than alive (for line of sight, movement and who can act). Victory points are expected values."},
 mission:{value:"SECURE AND HOLD: invented practice mission",verified:false,note:"Mission action SECURE: 1 AP, +2 VP, once per marker, within 1 square. HOLD: at the end, +1 VP per marker with a friendly operative within 1 square and no enemy within 1 square. KILL: +1 VP per enemy incapacitated."},
 enemy:{value:"Enemy operatives do not act. Injured penalties are ignored",verified:false,note:"Puzzle simplification."}
};
PZ.C={dash:3,chargeBonus:2,cost:1,secureVP:2,holdVP:1,killVP:1,reach:1,samples:40000};
