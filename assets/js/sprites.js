// Pixel-art team portraits (original art, 16x16, mirrored). Edit TEMPLATES / PALETTES / TEAM_ART to change a look.
// Symbols: # outline, a main, b shade, c light, g accent, e eyes, k dark, w bone/teeth, m metal
window.KTT=window.KTT||{};
KTT.SPR=(function(){
const T={ // left half of a 16x16 sprite (8 columns, col 7 = centre)
marine:["......##","....###c","...#aaac","..#aaaac","..#aaaaa",".#aaaaaa",".#aeeaaa",".#aaakaa",".#aaakbb","##aaakbb","#ggaakkb","#gggaabb","#ggggbbb","#gggggbb","########","........"],
chaos:["#.......","#a......","#a..####",".#.#aaac","..#aaaac","..#aaaaa","..#aaaaa","..#aeeaa","..#aaakk","...#aakk","..##akkk","..#aabbb",".#aabbbb",".#abbbbb","########","........"],
ork:["........","...#####","..#aaaaa",".#aaaaaa",".#aaaaaa",".#aeaaaa",".#aaakaa",".#aaaaaa",".#awaaaa",".#awkkkk",".#aakkkk","..#aaaaa","..#abbbb","...#####","........","........"],
eldar:[".......#","......#c",".....#ac","....#aac","...#aaac","...#aaac","..#aaaaa","..#aaaaa","..#aeeaa","..#aaaaa","..#abaaa","...#bbaa","...#bbbb","....####","........","........"],
tau:["........","....####","...#aaaa","..#aaaac",".#aaaacc",".#aaaaaa",".#aaaeee",".#aaaaee",".#aaaaaa",".#abaaaa","..#bbbbb","...#bbbb","....####","........","........","........"],
guard:["........","...#####","..#aaaaa",".#aaaaaa",".#bbbbbb",".#aaaaaa",".#akeeea",".#akkkkk",".#aaaaaa",".#abwwww",".#abwkww","..#abwww","..#bbbbb","...######","........","........"],
skull:["........","...#####","..#wwwww",".#wwwwww",".#wwwwww",".#wkkwww",".#wkeewk",".#wwkwwk",".#wwwwww","..#wwkkk","..#wkwkw","...#wwww","...#bbbb","....####","........","........"],
bug:["#.......","##......","#a#.####",".#a#aaaa","..#aaaac","..#aaaaa",".#aeeaaa",".#aaakaa",".#aaaaaa",".#aawkwk",".#aawkwk","..#aakkk","...#abbb","....####","........","........"],
hood:["........","....####","...#aaaa","..#aaaaa","..#aabbb",".#aabkkk",".#aabkke",".#aabkkk",".#aabkkk",".#aaabbb",".#aaaabb","#aaaaabb","#aaaabbb","#bbbbbbb","########","........"],
drone:["........","....####","...#aaaa","..#aaaac",".#aaaacc",".#ammmmm",".#amkkkk",".#amkeee",".#amkkkk",".#ammmmm",".#aaaaaa","..#bbbbb","...#bbbb","....####","....#ma.","....#mm."]
};
const P={
blue:{a:"#5b87c5",b:"#2c4a85",c:"#8db6e6",g:"#f2a73a",e:"#e03a47",k:"#1c2a4a",w:"#dfe6f2",m:"#8c9bb4"},
red:{a:"#c23b3b",b:"#7b1f1f",c:"#e8776b",g:"#f2c14a",e:"#fff2a0",k:"#3a1212",w:"#f0e2d0",m:"#b0a8a0"},
black:{a:"#3d424d",b:"#1c1f26",c:"#7c8594",g:"#c9ccd2",e:"#e03a47",k:"#0b0c10",w:"#dfe0e4",m:"#8f95a3"},
olive:{a:"#7b8b3a",b:"#4a5a1e",c:"#aebd5e",g:"#b5651d",e:"#d6e24a",k:"#262d10",w:"#d9d6a8",m:"#8b8f6a"},
green:{a:"#6aa84f",b:"#3d7330",c:"#9ad07a",g:"#d9a441",e:"#ff4d3a",k:"#1f3b17",w:"#f3ecc8",m:"#8a8a80"},
purple:{a:"#8a4fb5",b:"#4d2a73",c:"#b98ae0",g:"#e0c04a",e:"#8cffb0",k:"#22123a",w:"#e6dcf0",m:"#9a90a8"},
teal:{a:"#3fa6a0",b:"#1f6663",c:"#7fd6cf",g:"#f2d04a",e:"#ffffff",k:"#103836",w:"#e0f4f0",m:"#90a8a6"},
sand:{a:"#c8a96b",b:"#8a6d3a",c:"#e6d29a",g:"#6a8a4a",e:"#1a1a1a",k:"#3a2e14",w:"#f2ead0",m:"#9a9078"},
grey:{a:"#8d97a6",b:"#566070",c:"#c3cad6",g:"#e0a040",e:"#e03a47",k:"#262c36",w:"#e8ecf2",m:"#aab2bf"},
white:{a:"#e8e6e0",b:"#a8a49a",c:"#ffffff",g:"#d8332f",e:"#2a2a2a",k:"#46423a",w:"#ffffff",m:"#b5b0a5"},
orange:{a:"#d9772a",b:"#8f4a14",c:"#f2a85f",g:"#3a3a3a",e:"#ffe066",k:"#3a210a",w:"#f3e4c8",m:"#8a8378"},
pink:{a:"#d95a9a",b:"#8a2a5e",c:"#f09ac4",g:"#2a2a2a",e:"#ffffff",k:"#3a1226",w:"#fbe6f0",m:"#a890a0"},
brown:{a:"#8a5a3a",b:"#53321c",c:"#b8845e",g:"#d8c8a0",e:"#ff5a3a",k:"#24140a",w:"#ebdcc0",m:"#8a7e70"},
bone:{a:"#cfd8c4",b:"#7a8c70",c:"#f0f6e8",g:"#3ac56a",e:"#58ff90",k:"#1a2a1c",w:"#eef2e4",m:"#9aa890"},
navy:{a:"#34508a",b:"#1c2c52",c:"#6a8ad0",g:"#d8d8d8",e:"#ffd23a",k:"#0e1630",w:"#e0e6f2",m:"#8a94aa"}
};
const TEAM={"XV26 Stealth Battlesuits":["tau","black"],"Wrecka Krew":["ork","green"],"Wolf Scouts":["marine","grey"],"Vespid Stingwings":["bug","orange"],"Tempestus Aquilon":["guard","navy"],"Spectre Squad":["hood","black"],"Scout Squad":["marine","olive"],"Sanctifiers":["marine","white"],"Raveners":["bug","purple"],"Ratlings":["guard","brown"],"Plague Marines":["marine","olive"],"Murderwing":["chaos","brown"],"Nemesis Claw":["chaos","black"],"Mandrakes":["hood","black"],"Inquisitorial Agents":["hood","black"],"Hernkyn Yaegirs":["guard","brown"],"Goremongers":["chaos","red"],"Exodite Dragon Masters":["eldar","orange"],"Deathwatch":["marine","black"],"Chaos Cult":["hood","brown"],"Celestian Insidiants":["marine","black"],"Canoptek Circle":["skull","black"],"Brood Brothers":["guard","purple"],"Blades Of Khaine":["eldar","green"],"Battleclade":["hood","red"],"Angels Of Death":["marine","blue"],"Blooded":["chaos","brown"],"Corsair Voidscarred":["eldar","teal"],"Death Korps":["guard","olive"],"Elucidian Starstriders":["hood","navy"],"Exaction Squad":["guard","black"],"Fellgor Ravagers":["chaos","brown"],"Gellerpox Infected":["chaos","green"],"Hand Of The Archon":["eldar","black"],"Hearthkyn Salvagers":["guard","orange"],"Hierotek Circle":["skull","black"],"Hunter Clade":["hood","orange"],"Imperial Navy Breachers":["guard","black"],"Kasrkin":["guard","black"],"Kommandos":["ork","olive"],"Legionaries":["chaos","black"],"Novitiates":["hood","white"],"Pathfinders":["tau","sand"],"Phobos Strike Team":["marine","black"],"Void-Dancer Troupe":["eldar","bone"],"Warpcoven":["marine","navy"],"Wyrmblade":["guard","navy"]};
function grid(t){return T[t].map(r=>r+r.split("").reverse().join(""))}
function svg(team,px,opt){opt=opt||{};px=px||8;const slug=team.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 return `<img class="spr" src="assets/img/team-${slug}.svg" alt="${(opt.alt||team).replace(/"/g,"")} pixel art" height="${16*px}" style="height:${16*px}px;width:auto;image-rendering:pixelated">`}
return{svg,TEAM,T,P};
})();
