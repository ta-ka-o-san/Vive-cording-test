export enum BlockType {
  AIR = 'AIR',
  GROUND = 'GROUND',
  DIRT = 'DIRT',
  BRICK = 'BRICK',
  BRICK_EMPTY = 'BRICK_EMPTY',
  MYSTERY_COIN = 'MYSTERY_COIN',
  MYSTERY_MUSHROOM = 'MYSTERY_MUSHROOM',
  MYSTERY_STAR = 'MYSTERY_STAR',
  COIN = 'COIN',
  SPIKE = 'SPIKE',
  LAVA = 'LAVA',
  TRAMPOLINE = 'TRAMPOLINE',
  FLAG_POLE = 'FLAG_POLE',
  FLAG_TOP = 'FLAG_TOP',
  PIPE_LEFT = 'PIPE_LEFT',
  PIPE_RIGHT = 'PIPE_RIGHT',
  PIPE_TOP_LEFT = 'PIPE_TOP_LEFT',
  PIPE_TOP_RIGHT = 'PIPE_TOP_RIGHT',
  BG_BUSH = 'BG_BUSH',
  BG_CLOUD = 'BG_CLOUD',
  BG_HILL = 'BG_HILL',
  STAGE_SWITCH = 'STAGE_SWITCH',
}

export enum EnemyType {
  WALKER = 'WALKER', // Standard slow walking enemy (Goomba-like)
  SHELL = 'SHELL',   // Enemy with shell, retreats to shell when jumped on (Koopa-like)
  FLYER = 'FLYER',   // Flies up and down
  BOSS = 'BOSS',     // Massive fire-throwing stage boss
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isDead: boolean;
  deathTimer: number; // For squash animations
  isShellSpinning?: boolean;
  health?: number;
  direction: 1 | -1;
  shootCooldown?: number;
  patrolYStart?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'FIREBALL' | 'BOSS_FIRE';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
  gravity?: boolean;
  text?: string;
}

export interface CollectibleItem {
  id: string;
  type: 'MUSHROOM' | 'STAR' | 'COIN';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isSpawned: boolean;
  spawnTimer: number; // For popping-up animation out of block
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  width: number; // Grid width (e.g., 200 tiles)
  height: number; // Grid height (e.g., 15 tiles)
  bgColor: string;
  grid: BlockType[][]; // Row major grid[y][x]
  enemies: { type: EnemyType; x: number; y: number }[];
  startX: number;
  startY: number;
  timeLimit: number;
}

export interface MovingPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number; // 0 to 1 oscillation
  direction: 1 | -1;
  type: 'HORIZONTAL' | 'VERTICAL' | 'FALLING';
  state?: 'STABLE' | 'SHAKING' | 'FALLING' | 'RESPAWNING';
  shakeTimer?: number;
  fallSpeed?: number;
}

export interface GameScoreRecord {
  stageId: string;
  highScore: number;
  bestTime: number; // seconds
  coinsCollected: number;
  starsCollected: number;
}
