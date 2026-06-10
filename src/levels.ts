import { BlockType, EnemyType, LevelConfig } from './types';

// Helper to construct a blank grid and populate it
function createBlankGrid(width: number, height: number, defaultTile = BlockType.AIR): BlockType[][] {
  const grid: BlockType[][] = [];
  for (let r = 0; r < height; r++) {
    const row: BlockType[] = [];
    for (let c = 0; c < width; c++) {
      row.push(defaultTile);
    }
    grid.push(row);
  }
  return grid;
}

// Map characters to BlockTypes for text-based level design
const CHAR_MAP: Record<string, BlockType> = {
  '.': BlockType.AIR,
  'G': BlockType.GROUND,
  'D': BlockType.DIRT,
  'B': BlockType.BRICK,
  '?': BlockType.MYSTERY_COIN,
  'M': BlockType.MYSTERY_MUSHROOM,
  'S': BlockType.MYSTERY_STAR,
  'o': BlockType.COIN,
  '^': BlockType.SPIKE,
  '~': BlockType.LAVA,
  'T': BlockType.TRAMPOLINE,
  'F': BlockType.FLAG_POLE,
  'Y': BlockType.FLAG_TOP,
  '[': BlockType.PIPE_TOP_LEFT,
  ']': BlockType.PIPE_TOP_RIGHT,
  'p': BlockType.PIPE_LEFT,
  'P': BlockType.PIPE_RIGHT,
  'b': BlockType.BG_BUSH,
  'c': BlockType.BG_CLOUD,
  'h': BlockType.BG_HILL,
  'K': BlockType.STAGE_SWITCH,
};

function parseTextLevel(
  textLines: string[],
  enemiesData: { type: EnemyType; x: number; y: number }[]
): { grid: BlockType[][]; width: number; height: number; enemies: { type: EnemyType; x: number; y: number }[] } {
  const height = textLines.length;
  const width = textLines[0].length;
  const grid: BlockType[][] = [];

  for (let r = 0; r < height; r++) {
    const row: BlockType[] = [];
    for (let c = 0; c < width; c++) {
      const char = textLines[r][c] || '.';
      row.push(CHAR_MAP[char] || BlockType.AIR);
    }
    grid.push(row);
  }

  return {
    grid,
    width,
    height,
    enemies: enemiesData,
  };
}

// LEVEL 1: Grassland Adventure (Classic introductory level)
const lvl1Map = [
  '......................................................................................................................................................',
  '.....................c.........................c....................c..........................c.....................................c................',
  '...........c...................c.........................c...................c..........................c..............c............Y.................',
  '............................................................................................................................................F.........',
  '....................................................................................[..]....................................................F.........',
  '.......................o.o..........................o.o.............................p..P........................o.o.........................F.........',
  '.......?....B.?.B....[..].................B.?..B..[..]..............B.?.B..B.?.B....p..P........[..].........[..]..B.B.?....................F.........',
  '.....................p..P.........................p..P..............................p..P........p..P.........p..P..........................F.........',
  '....b...............p..P.....h............p..P....................................p..P........p..P.........p..P...........................F.........',
  '..G.G.G...G.G.G.....p..P...G.G.G...G.G....p..P..........b.......G.G.G...G.G.G.....p..P........p..P...G.G...p..P......T.......T..........T...F.........',
  'GGGGGGGGGGGGGGGG^^GGGGGGGGGGGGGGGGGGGG^^GGGGGGGGGGGGGGGGGGGG^^GGGGGGGGGGGGGGGGGGGGGGGGGGGG^^GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
];
const lvl1Enemies = [
  { type: EnemyType.WALKER, x: 20, y: 9 },
  { type: EnemyType.WALKER, x: 25, y: 9 },
  { type: EnemyType.SHELL, x: 38, y: 9 },
  { type: EnemyType.WALKER, x: 55, y: 9 },
  { type: EnemyType.WALKER, x: 62, y: 9 },
  { type: EnemyType.WALKER, x: 74, y: 9 },
  { type: EnemyType.WALKER, x: 88, y: 9 },
  { type: EnemyType.SHELL, x: 98, y: 9 },
  { type: EnemyType.WALKER, x: 105, y: 9 },
  { type: EnemyType.WALKER, x: 110, y: 9 },
  { type: EnemyType.WALKER, x: 130, y: 9 },
];

// LEVEL 2: Underworld Cavern (Tight spaces, spikes, gold chambers)
const lvl2Map = [
  'B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B.B',
  '......................................................................................................................................................',
  '.....................o.o.o..........................o.o.o.............................o.o.o........................o.o.o............................Y',
  '.........B.B.B..........................B.B.B...........................B.B.B..........................B.B.B........................................F',
  '.......?.......^......................?.......^.......................?.......^......................?.......^......................................F',
  '....................................................................................................................................................F',
  '.........................[..]...............................................................[..].....................................................F',
  '....B...M..?.....B.......p..P......B.....S..?.....B................B...M..?.....B...........p..P...T....B...M..?.....B.................T............F',
  '.........................p..P...............................................................p..P.....................................................F',
  '..B.B.B.......B.B.B......p..P....B.B.B.......B.B.B.......T......B.B.B.......B.B.B...........p..P......B.B.B.......B.B.B..........................T...F',
  'BBBBBBB^^^...BBBBBBBBBB^^p..P^^^^BBBBBB^^^...BBBBBBBBBB^^^...^^^BBBBBBB^^^...BBBBBBBBBB^^^...p..P^^^^^BBBBBBB^^^...BBBBBBBBBB^^^...............^^^^^^BB',
  'DDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'DDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'DDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
];
const lvl2Enemies = [
  { type: EnemyType.WALKER, x: 12, y: 9 },
  { type: EnemyType.SHELL, x: 26, y: 9 },
  { type: EnemyType.WALKER, x: 45, y: 9 },
  { type: EnemyType.WALKER, x: 55, y: 9 },
  { type: EnemyType.SHELL, x: 74, y: 9 },
  { type: EnemyType.WALKER, x: 88, y: 9 },
  { type: EnemyType.WALKER, x: 110, y: 9 },
];

// LEVEL 3: Sky Island Heights (Trampolines, drop pits, flyers, and floating structures)
const lvl3Map = [
  '.....................c............................................c............................................c....................................',
  '......................................................................................................................................................',
  '...............cc.......................................cc.......................................cc...................................o.o.o.o.o.Y......',
  '......................................................................................................................................B.B.B.B.BF......',
  '.......................................................................................................................o.o.o...................F......',
  '.........................B.B......................................B.B............................................T.....B.B.B..................F......',
  '.......o.o.o...........B.....B..................o.o.o...........B.....B..................o.o.o...........B.B.B..................................F......',
  '.......B.B.B.........B...o.o...B................B.B.B.........B...o.o...B................B.B.B.........B.....B....................................F......',
  '....................B...B...B...B............................B...B...B...B............................B.......B.................................F......',
  '..B.B.........B.B.....................B.B.B.............B.B.....................B.B.B.............B............................B.B..........T...F.....',
  'GGGGGG.......GGGGG...................GGGGGGG...........GGGGG...................GGGGGGG...........G...........................GGGGG.............F.....',
  'DDDDDD.......DDDDD...................DDDDDDD...........DDDDD...................DDDDDDD...........D...........................DDDDD.............F.....',
  'DDDDDD.......DDDDD...................DDDDDDD...........DDDDD...................DDDDDDD...........D...........................DDDDD.............F.....',
  'DDDDDD.......DDDDD...................DDDDDDD...........DDDDD...................DDDDDDD...........D...........................DDDDD.............F.....',
];
const lvl3Enemies = [
  { type: EnemyType.FLYER, x: 14, y: 5 },
  { type: EnemyType.FLYER, x: 38, y: 4 },
  { type: EnemyType.FLYER, x: 50, y: 6 },
  { type: EnemyType.FLYER, x: 62, y: 3 },
  { type: EnemyType.WALKER, x: 80, y: 8 },
  { type: EnemyType.FLYER, x: 92, y: 4 },
  { type: EnemyType.WALKER, x: 112, y: 8 },
];

// LEVEL 4: Bowser's Castle Fire Pit (Dread lava, rotating obstacles, fireballs, and the FINAL BOSS)
const lvl4Map = [
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'B..................................................................................................B',
  'B...........................................................................................Y......B',
  'B..........o.o...................o.o...................o.o..................................F......B',
  'B.........B.B.B.................B.B.B.................B.B.B.................................F......B',
  'B...........................................................................................F......B',
  'B.....B...........B.........B...........B.........B...........B........B.B.B.B.B............F......B',
  'B.....B..^.^.^.^..B.........B..^.^.^.^..B.........B..^.^.^.^..B........B.......B............F......B',
  'B.....B..B.B.B.B..B.........B..B.B.B.B..B.........B..B.B.B.B..B........B.......B............F......B',
  'B.....B..B.B.B.B..B..[..]...B..B.B.B.B..B..[..]...B..B.B.B.B..B........B.......B...T........F......B',
  'BBBB..B..B.D.D.B..B..p..P...B..B.D.D.B..B..p..P...B..B.D.D.B..B.......BBBB.K.BBBB..........F......B',
  'B~~B~~B~~B~~~~~B~~B~~p~~P~~~B~~B~~~~~B~~B~~p~~P~~~B~~B~~~~~B~~B~~~~~~~B..B...B..B~~~~~~~~~~F~~~~~~B',
  'B~~B~~B~~B~~~~~B~~B~~p~~P~~~B~~B~~~~~B~~B~~p~~P~~~B~~B~~~~~B~~B~~~~~~~B..B...B..B~~~~~~~~~~F~~~~~~B',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
];
const lvl4Enemies = [
  { type: EnemyType.SHELL, x: 16, y: 9 },
  { type: EnemyType.WALKER, x: 42, y: 9 },
  { type: EnemyType.BOSS, x: 74, y: 7 }, // Bowser Boss placed here!
];


export const PRESET_LEVELS: LevelConfig[] = [
  {
    id: '1',
    name: 'STAGE 1: Grassland',
    description: 'キノコ王国の草地。基本操作（A/Dで移動、W/Spaceでジャンプ、Sでしゃがむ）を学ぼう！敵を踏みつけて倒し、コインやキノコを集めます。',
    width: lvl1Map[0].length,
    height: lvl1Map.length,
    bgColor: '#5c94fc', // Classic sky-blue
    grid: parseTextLevel(lvl1Map, []).grid,
    enemies: lvl1Enemies,
    startX: 2,
    startY: 8,
    timeLimit: 300,
  },
  {
    id: '2',
    name: 'STAGE 2: Poison Cave',
    description: '毒のスパイクと隠されたコインが満載の地下洞窟。慎重ジャンプで進み、甲羅を使って敵を一網打尽にしよう！',
    width: lvl2Map[0].length,
    height: lvl2Map.length,
    bgColor: '#1c1c24', // Deep cave dark grey
    grid: parseTextLevel(lvl2Map, []).grid,
    enemies: lvl2Enemies,
    startX: 2,
    startY: 9,
    timeLimit: 300,
  },
  {
    id: '3',
    name: 'STAGE 3: Sky Islands',
    description: '雲の上の空中浮島！トランポリンを使って大きく飛び上がり、落下死に気をつけて空中を飛び回るパタパタをかわそう。',
    width: lvl3Map[0].length,
    height: lvl3Map.length,
    bgColor: '#a0c4ff', // Light pastel sky-blue
    grid: parseTextLevel(lvl3Map, []).grid,
    enemies: lvl3Enemies,
    startX: 2,
    startY: 9,
    timeLimit: 240,
  },
  {
    id: '4',
    name: 'STAGE 4: Bowser\'s Castle',
    description: '大魔王クッパの居城！燃え盛る溶岩の海、炎のトラップ、そして最奥に待ち構える巨大クッパ。彼の火の玉を避け、背後のスイッチを踏んで溶岩へ落とせ！',
    width: lvl4Map[0].length,
    height: lvl4Map.length,
    bgColor: '#331111', // Blood castle dark red
    grid: parseTextLevel(lvl4Map, []).grid,
    enemies: lvl4Enemies,
    startX: 2,
    startY: 9,
    timeLimit: 200,
  },
];
