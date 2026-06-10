import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';
import {
  BlockType,
  EnemyType,
  LevelConfig,
  Enemy,
  Projectile,
  Particle,
  CollectibleItem,
  MovingPlatform,
} from '../types';
import { Menu, X, RotateCcw, LogOut, Minimize2 } from 'lucide-react';

interface GameCanvasProps {
  levelConfig: LevelConfig;
  onGameComplete: (score: number, coins: number, timeSpent: number) => void;
  onGameOver: () => void;
  onBackToMenu: () => void;
}

const TILE_SIZE = 32;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  levelConfig,
  onGameComplete,
  onGameOver,
  onBackToMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas size state
  const [dimensions, setDimensions] = useState({ width: 800, height: 448 });

  // Game states we'd like to expose to React UI
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [currentLives, setCurrentLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(levelConfig.timeLimit);
  const [powerUpState, setPowerUpState] = useState<'SMALL' | 'SUPER' | 'FIRE'>('SMALL');
  const [isGameOverState, setIsGameOverState] = useState(false);
  const [isGameClearedState, setIsGameClearedState] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mutable game loop references
  const gameStateRef = useRef({
    // Grid: deep copy to allow brick breaks / block changes
    grid: JSON.parse(JSON.stringify(levelConfig.grid)) as BlockType[][],
    levelWidth: levelConfig.width,
    levelHeight: levelConfig.height,

    // Player position, velocity, and properties
    player: {
      x: levelConfig.startX * TILE_SIZE,
      y: (levelConfig.startY - 1) * TILE_SIZE,
      vx: 0,
      vy: 0,
      width: 22,
      height: 28, // Small height
      state: 'SMALL' as 'SMALL' | 'SUPER' | 'FIRE',
      health: 1, // SMALL = 1, SUPER = 2, FIRE = 3
      isGrounded: false,
      direction: 1 as 1 | -1, // 1 for Right, -1 for Left
      isInvincible: false,
      invincibleTimer: 0,
      isCrouching: false,
      isRunning: false,
      isDead: false,
      deathAnimationTimer: 0,
      isClimbingFlag: false,
      flagClimbY: 0,
      flagX: 0,
      isAutoWalking: false,
      autoWalkTimer: 0,
    },

    // Collections
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    items: [] as CollectibleItem[],
    particles: [] as Particle[],
    movingPlatforms: [] as MovingPlatform[],

    // Camera
    camera: {
      x: 0,
      y: 0,
    },

    // Global properties
    score: 0,
    coins: 0,
    lives: 3,
    timeLeft: levelConfig.timeLimit,
    gameTick: 0,
    isCleared: false,
    bossDefeated: false,
    bossDefeatedTimer: 0,
    switchPressed: false,
  });

  // Input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Setup/Initialize Game
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = Math.min(1000, containerRef.current.clientWidth);
        setDimensions({
          width,
          height: 14 * TILE_SIZE, // 448 pixels (14 rows * 32px)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Start background music
    audio.startBgm();

    return () => {
      window.removeEventListener('resize', handleResize);
      audio.stopBgm();
    };
  }, []);

  const resetStage = () => {
    const state = gameStateRef.current;
    state.grid = JSON.parse(JSON.stringify(levelConfig.grid));
    state.levelWidth = levelConfig.width;
    state.levelHeight = levelConfig.height;

    // Reset player
    state.player.x = levelConfig.startX * TILE_SIZE;
    state.player.y = (levelConfig.startY - 1) * TILE_SIZE;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.state = 'SMALL';
    state.player.health = 1;
    state.player.width = 22;
    state.player.height = 28;
    state.player.isGrounded = false;
    state.player.direction = 1;
    state.player.isInvincible = false;
    state.player.invincibleTimer = 0;
    state.player.isCrouching = false;
    state.player.isDead = false;
    state.player.deathAnimationTimer = 0;
    state.player.isClimbingFlag = false;
    state.player.isAutoWalking = false;

    // Load presets
    state.score = 0;
    state.coins = 0;
    state.lives = 3;
    state.timeLeft = levelConfig.timeLimit;
    state.gameTick = 0;
    state.isCleared = false;
    state.bossDefeated = false;
    state.bossDefeatedTimer = 0;
    state.switchPressed = false;

    // Set UI states too
    setCurrentScore(0);
    setCurrentCoins(0);
    setCurrentLives(3);
    setTimeLeft(levelConfig.timeLimit);
    setPowerUpState('SMALL');
    setIsGameOverState(false);
    setIsGameClearedState(false);
    setIsPaused(false);
    setIsMenuOpen(false);

    // Initialise enemies from config
    state.enemies = levelConfig.enemies.map((e, idx) => {
      const isBoss = e.type === EnemyType.BOSS;
      return {
        id: `enemy_${idx}`,
        type: e.type,
        x: e.x * TILE_SIZE,
        y: e.y * TILE_SIZE,
        vx: e.type === EnemyType.WALKER ? -1.0 : e.type === EnemyType.SHELL ? -1.5 : 0,
        vy: 0,
        width: isBoss ? 64 : e.type === EnemyType.SHELL ? 26 : 28,
        height: isBoss ? 64 : e.type === EnemyType.SHELL ? 24 : 28,
        isDead: false,
        deathTimer: 0,
        direction: -1,
        health: isBoss ? 5 : 1,
        shootCooldown: isBoss ? 120 : undefined,
        patrolYStart: e.type === EnemyType.FLYER ? e.y * TILE_SIZE : undefined,
      };
    });

    state.projectiles = [];
    state.items = [];
    state.particles = [];

    // Construct moving platforms & falling platforms
    const platforms: MovingPlatform[] = [];
    // Populate dynamic platforms across levels
    if (levelConfig.id === '1') {
      platforms.push({
        x: 48 * TILE_SIZE,
        y: 8 * TILE_SIZE,
        width: 64,
        height: 16,
        startX: 48 * TILE_SIZE,
        startY: 8 * TILE_SIZE,
        endX: 56 * TILE_SIZE,
        endY: 8 * TILE_SIZE,
        speed: 0.015,
        progress: 0,
        direction: 1,
        type: 'HORIZONTAL',
      });
    } else if (levelConfig.id === '2') {
      platforms.push(
        {
          x: 18 * TILE_SIZE,
          y: 6 * TILE_SIZE,
          width: 64,
          height: 16,
          startX: 18 * TILE_SIZE,
          startY: 6 * TILE_SIZE,
          endX: 18 * TILE_SIZE,
          endY: 9 * TILE_SIZE,
          speed: 0.02,
          progress: 0,
          direction: 1,
          type: 'VERTICAL',
        },
        {
          x: 48 * TILE_SIZE,
          y: 7 * TILE_SIZE,
          width: 48,
          height: 16,
          startX: 48 * TILE_SIZE,
          startY: 7 * TILE_SIZE,
          endX: 48 * TILE_SIZE,
          endY: 7 * TILE_SIZE,
          speed: 0,
          progress: 0,
          direction: 1,
          type: 'FALLING',
          state: 'STABLE',
          shakeTimer: 0,
          fallSpeed: 0,
        },
        {
          x: 82 * TILE_SIZE,
          y: 7 * TILE_SIZE,
          width: 48,
          height: 16,
          startX: 82 * TILE_SIZE,
          startY: 7 * TILE_SIZE,
          endX: 82 * TILE_SIZE,
          endY: 7 * TILE_SIZE,
          speed: 0,
          progress: 0,
          direction: 1,
          type: 'FALLING',
          state: 'STABLE',
          shakeTimer: 0,
          fallSpeed: 0,
        }
      );
    } else if (levelConfig.id === '3') {
      // Sky levels need floating horizontal and vertical platforms
      platforms.push(
        {
          x: 20 * TILE_SIZE,
          y: 8 * TILE_SIZE,
          width: 64,
          height: 16,
          startX: 20 * TILE_SIZE,
          startY: 8 * TILE_SIZE,
          endX: 28 * TILE_SIZE,
          endY: 8 * TILE_SIZE,
          speed: 0.012,
          progress: 0,
          direction: 1,
          type: 'HORIZONTAL',
        },
        {
          x: 46 * TILE_SIZE,
          y: 7 * TILE_SIZE,
          width: 48,
          height: 16,
          startX: 46 * TILE_SIZE,
          startY: 7 * TILE_SIZE,
          endX: 46 * TILE_SIZE,
          endY: 7 * TILE_SIZE,
          speed: 0,
          progress: 0,
          direction: 1,
          type: 'FALLING',
          state: 'STABLE',
          shakeTimer: 0,
          fallSpeed: 0,
        },
        {
          x: 58 * TILE_SIZE,
          y: 7 * TILE_SIZE,
          width: 64,
          height: 16,
          startX: 58 * TILE_SIZE,
          startY: 5 * TILE_SIZE,
          endX: 58 * TILE_SIZE,
          endY: 9 * TILE_SIZE,
          speed: 0.015,
          progress: 0,
          direction: -1,
          type: 'VERTICAL',
        },
        {
          x: 88 * TILE_SIZE,
          y: 7 * TILE_SIZE,
          width: 48,
          height: 16,
          startX: 88 * TILE_SIZE,
          startY: 7 * TILE_SIZE,
          endX: 88 * TILE_SIZE,
          endY: 7 * TILE_SIZE,
          speed: 0,
          progress: 0,
          direction: 1,
          type: 'FALLING',
          state: 'STABLE',
          shakeTimer: 0,
          fallSpeed: 0,
        }
      );
    } else if (levelConfig.id === '4') {
      // Classic castle platform rides over lava!
      platforms.push(
        {
          x: 8 * TILE_SIZE,
          y: 10 * TILE_SIZE,
          width: 80,
          height: 16,
          startX: 8 * TILE_SIZE,
          startY: 10 * TILE_SIZE,
          endX: 13 * TILE_SIZE,
          endY: 10 * TILE_SIZE,
          speed: 0.01,
          progress: 0,
          direction: 1,
          type: 'HORIZONTAL',
        },
        {
          x: 34 * TILE_SIZE,
          y: 10 * TILE_SIZE,
          width: 80,
          height: 16,
          startX: 34 * TILE_SIZE,
          startY: 10 * TILE_SIZE,
          endX: 39 * TILE_SIZE,
          endY: 10 * TILE_SIZE,
          speed: 0.01,
          progress: 0.5,
          direction: -1,
          type: 'HORIZONTAL',
        },
        {
          x: 60 * TILE_SIZE,
          y: 10 * TILE_SIZE,
          width: 80,
          height: 16,
          startX: 60 * TILE_SIZE,
          startY: 10 * TILE_SIZE,
          endX: 65 * TILE_SIZE,
          endY: 10 * TILE_SIZE,
          speed: 0.01,
          progress: 0,
          direction: 1,
          type: 'HORIZONTAL',
        }
      );
    }

    state.movingPlatforms = platforms;
    setIsMenuOpen(false);
    setIsPaused(false);
    audio.startBgm();
  };

  // Level config change initializer
  useEffect(() => {
    resetStage();
  }, [levelConfig]);

  // Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Handle custom key presses directly to avoid skipping frames
      if (key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
      }
      if (key === 'p') {
        setIsPaused((p) => !p);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen((m) => {
          const next = !m;
          setIsPaused(next);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set up timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPaused || isGameOverState || isGameClearedState) return;
      const state = gameStateRef.current;
      if (state.player.isDead || state.isCleared) return;

      if (state.timeLeft > 0) {
        state.timeLeft -= 1;
        setTimeLeft(state.timeLeft);
        if (state.timeLeft === 50) {
          // Warning chime
          audio.playHurt();
        }
      } else {
        // Time out kills player
        triggerPlayerDeath();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isGameOverState, isGameClearedState]);

  // Game Engine Update Code & Physics
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (!isPaused) {
        updateGame();
      }
      renderGame(ctx);
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions, isPaused]);

  // HELPER Functions to change state and trigger visual/sound effects
  const spawnBreakParticles = (tx: number, ty: number, color: string) => {
    const state = gameStateRef.current;
    const px = tx * TILE_SIZE + TILE_SIZE / 2;
    const py = ty * TILE_SIZE + TILE_SIZE / 2;

    for (let i = 0; i < 6; i++) {
      state.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 2,
        color,
        size: Math.random() * 3 + 2,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03,
        gravity: true,
      });
    }
  };

  const spawnStompParticles = (x: number, y: number) => {
    const state = gameStateRef.current;
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 2 - 1,
        color: '#ffffff',
        size: Math.random() * 2 + 1.5,
        life: 1.0,
        decay: 0.06,
        gravity: false,
      });
    }
  };

  const spawnCoinParticles = (tx: number, ty: number) => {
    const state = gameStateRef.current;
    const px = tx * TILE_SIZE + TILE_SIZE / 2;
    const py = ty * TILE_SIZE;

    // Upward flying coin particle animation typical of Mario games
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 4 - 3,
        color: '#ffdf00',
        size: 3,
        life: 1.0,
        decay: 0.07,
        gravity: true,
      });
    }
  };

  const triggerPlayerDeath = () => {
    const state = gameStateRef.current;
    if (state.player.isDead) return;

    state.player.isDead = true;
    state.player.vx = 0;
    state.player.vy = -7.5; // Jump up on death
    state.player.deathAnimationTimer = 120; // 2 seconds frame count
    audio.playGameOver();

    setTimeout(() => {
      handlePlayerRespawn();
    }, 2000);
  };

  const handlePlayerRespawn = () => {
    const state = gameStateRef.current;
    if (state.lives > 1) {
      state.lives -= 1;
      setCurrentLives(state.lives);

      // Re-initialize player states
      state.player.x = levelConfig.startX * TILE_SIZE;
      state.player.y = (levelConfig.startY - 1) * TILE_SIZE;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.state = 'SMALL';
      state.player.health = 1;
      setPowerUpState('SMALL');
      state.player.isDead = false;
      state.player.isInvincible = true;
      state.player.invincibleTimer = 90; // Invincible brief period
      state.player.isClimbingFlag = false;
      state.player.isAutoWalking = false;
      state.timeLeft = levelConfig.timeLimit;
      setTimeLeft(levelConfig.timeLimit);
      audio.startBgm();
    } else {
      setIsGameOverState(true);
      onGameOver();
    }
  };

  const damagePlayer = () => {
    const state = gameStateRef.current;
    if (state.player.isInvincible || state.player.isDead || state.player.isClimbingFlag) return;

    if (state.player.state === 'FIRE') {
      state.player.state = 'SUPER';
      setPowerUpState('SUPER');
      state.player.health = 2;
      state.player.height = 42; // Taller
      state.player.isInvincible = true;
      state.player.invincibleTimer = 90;
      audio.playPowerdown();
    } else if (state.player.state === 'SUPER') {
      state.player.state = 'SMALL';
      setPowerUpState('SMALL');
      state.player.health = 1;
      state.player.height = 28; // Back to small
      // Shift Y down slightly to avoid snapping out of bounds on ceiling
      state.player.y += 14;
      state.player.isInvincible = true;
      state.player.invincibleTimer = 120;
      audio.playPowerdown();
    } else {
      triggerPlayerDeath();
    }
  };

  const processMysteryHit = (tx: number, ty: number, itemType: 'COIN' | 'MUSHROOM' | 'STAR') => {
    const state = gameStateRef.current;
    audio.playCoin();

    // Trigger grid change
    state.grid[ty][tx] = BlockType.BRICK_EMPTY;

    // Head butt bounce particle
    state.particles.push({
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE,
      vx: 0,
      vy: -1.5,
      color: '#ffbe0b',
      size: 4,
      life: 0.8,
      decay: 0.1,
    });

    if (itemType === 'COIN') {
      state.coins += 1;
      state.score += 200;
      setCurrentCoins(state.coins);
      setCurrentScore(state.score);
      spawnCoinParticles(tx, ty);
    } else {
      // Spawn sliding mushroom or star out of the box!
      state.items.push({
        id: `item_${Date.now()}_${Math.random()}`,
        type: itemType,
        x: tx * TILE_SIZE,
        y: ty * TILE_SIZE,
        vx: 1.2,
        vy: -2.0, // POP UP slightly
        width: 24,
        height: 24,
        isSpawned: true,
        spawnTimer: 18,
      });
    }
  };

  // PHYSICS TICK UPDATE ENGINE
  const updateGame = () => {
    const state = gameStateRef.current;
    state.gameTick++;

    // 0. INVINCIBILITY & SPECIAL STATE HANDLING
    if (state.player.invincibleTimer > 0) {
      state.player.invincibleTimer--;
      if (state.player.invincibleTimer === 0) {
        state.player.isInvincible = false;
      }
    }

    // A. UPDATE PARTICLES
    state.particles = state.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) {
        p.vy += 0.25; // Apply gravity to debris
      }
      p.life -= p.decay;
      return p.life > 0;
    });

    // B. PLAYER IS DEAD ANIMATION RUNS INDEPENDENTLY
    if (state.player.isDead) {
      state.player.vy += 0.25; // Dead fall gravity
      state.player.y += state.player.vy;
      state.player.deathAnimationTimer--;
      return;
    }

    // C. FLAG CLEAN CUTSCENE WALK
    if (state.player.isClimbingFlag) {
      // Slide down poles
      if (state.player.y < state.player.flagClimbY + 8 * TILE_SIZE) {
        state.player.y += 2.0;
      } else {
        // Finished sliding, start automatic walking sequence
        state.player.isClimbingFlag = false;
        state.player.isAutoWalking = true;
        state.player.autoWalkTimer = 180; // Walk for 3 seconds
        state.player.vx = 2.0;
        audio.playWin();
      }
      return;
    }

    if (state.player.isAutoWalking) {
      state.player.x += state.player.vx;
      state.player.autoWalkTimer--;

      // Check stage clear finalize
      if (state.player.autoWalkTimer <= 0 && !state.isCleared) {
        state.isCleared = true;
        setIsGameClearedState(true);
        // Clear logic passes score parameters up
        const totalScore = state.score + state.coins * 100 + state.timeLeft * 10;
        onGameComplete(totalScore, state.coins, levelConfig.timeLimit - state.timeLeft);
      }
      return;
    }

    // D. GATHER PLAYER MOVEMENT INPUTS
    const keys = keysPressed.current;
    const isMovingLeft = keys['a'] || keys['arrleft'] || keys['arrowleft'];
    const isMovingRight = keys['d'] || keys['arwright'] || keys['arrowright'];
    const isSprint = keys['shift'] || keys['sprint'];
    const isJumpPressed = keys[' '] || keys['spacebar'];

    // Configure acceleration speeds
    const accelSpeed = isSprint ? 0.35 : 0.22;
    const maxSpeed = isSprint ? 4.5 : 2.8;
    const friction = 0.85;

    // Apply movement velocities
    if (isMovingLeft) {
      state.player.vx -= accelSpeed;
      state.player.direction = -1;
    } else if (isMovingRight) {
      state.player.vx += accelSpeed;
      state.player.direction = 1;
    } else {
      // Apply slides / ground friction
      state.player.vx *= friction;
    }

    // Limit maximum velocities
    if (state.player.vx > maxSpeed) state.player.vx = maxSpeed;
    if (state.player.vx < -maxSpeed) state.player.vx = -maxSpeed;

    // E. APPLY GRAVITY
    state.player.vy += 0.38; // Constant falling pull
    if (state.player.vy > 10) state.player.vy = 10; // Terminal velocity limit

    // F. JUMP ENGINE
    if (isJumpPressed) {
      if (state.player.isGrounded) {
        // Start jumps
        state.player.vy = isSprint ? -8.2 : -7.5;
        state.player.isGrounded = false;
        audio.playJump();

        // Spawn takeoff particle clouds
        for (let i = 0; i < 4; i++) {
          state.particles.push({
            x: state.player.x + state.player.width / 2,
            y: state.player.y + state.player.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 1.5,
            color: 'rgba(255,255,255,0.4)',
            size: 3 + Math.random() * 2,
            life: 1.0,
            decay: 0.08,
          });
        }
      } else {
        // Variable jump height: hold button down to slightly counter gravity drag
        if (state.player.vy < 0) {
          state.player.vy -= 0.12;
        }
      }
    }

    // G. UPDATE DYNAMIC MOVING PLATFORMS
    state.movingPlatforms.forEach((p) => {
      if (p.type === 'HORIZONTAL') {
        p.progress += p.speed * p.direction;
        if (p.progress >= 1.0 || p.progress <= 0) {
          p.direction = -p.direction as 1 | -1;
        }
        // Calculate new coordinate
        const newX = p.startX + (p.endX - p.startX) * p.progress;
        const diffX = newX - p.x;
        p.x = newX;

        // If player is standing on horizontal platform, carry them along!
        if (
          state.player.isGrounded &&
          state.player.x + state.player.width > p.x &&
          state.player.x < p.x + p.width &&
          Math.abs(state.player.y + state.player.height - p.y) < 6
        ) {
          state.player.x += diffX;
        }
      } else if (p.type === 'VERTICAL') {
        p.progress += p.speed * p.direction;
        if (p.progress >= 1.0 || p.progress <= 0) {
          p.direction = -p.direction as 1 | -1;
        }
        const newY = p.startY + (p.endY - p.startY) * p.progress;
        const diffY = newY - p.y;
        p.y = newY;

        // Carry player up/down
        if (
          state.player.isGrounded &&
          state.player.x + state.player.width > p.x &&
          state.player.x < p.x + p.width &&
          Math.abs(state.player.y + state.player.height - p.y) < 6
        ) {
          state.player.y += diffY;
        }
      } else if (p.type === 'FALLING') {
        if (p.state === 'SHAKING') {
          p.shakeTimer = (p.shakeTimer || 0) + 1;
          p.x = p.startX + (Math.random() - 0.5) * 3;
          if (p.shakeTimer > 30) {
            p.state = 'FALLING';
            p.fallSpeed = 0;
          }
        } else if (p.state === 'FALLING') {
          p.fallSpeed = (p.fallSpeed || 0) + 0.24;
          p.y += p.fallSpeed;

          // Respawn after going off limits
          if (p.y > state.levelHeight * TILE_SIZE) {
            p.state = 'RESPAWNING';
            p.shakeTimer = 0;
            p.x = p.startX;
            p.y = p.startY;
          }
        } else if (p.style === 'RESPAWNING') {
          // Wait briefly, reset
          p.shakeTimer = (p.shakeTimer || 0) + 1;
          if (p.shakeTimer > 120) {
            p.state = 'STABLE';
            p.shakeTimer = 0;
          }
        }
      }
    });

    // H. SOLVE PLAYER HORIZONTAL COLLISION
    state.player.x += state.player.vx;
    handlePlayerCollisions('horizontal');

    // I. SOLVE PLAYER VERTICAL COLLISION
    state.player.y += state.player.vy;
    state.player.isGrounded = false; // Reset to solve
    handlePlayerCollisions('vertical');

    // PLATFORM STANDING CHECKS (Make sure grounded works for moving platforms)
    state.movingPlatforms.forEach((p) => {
      if (p.state === 'RESPAWNING') return;
      if (
        state.player.vx >= 0 &&
        state.player.x + state.player.width > p.x &&
        state.player.x < p.x + p.width &&
        state.player.y + state.player.height >= p.y &&
        state.player.y + state.player.height <= p.y + p.height + 6 &&
        state.player.vy >= 0
      ) {
        state.player.y = p.y - state.player.height;
        state.player.vy = 0;
        state.player.isGrounded = true;

        if (p.type === 'FALLING' && p.state === 'STABLE') {
          p.state = 'SHAKING';
          p.shakeTimer = 0;
        }
      }
    });

    // J. LAVA HURTS INSTANTLY
    if (state.player.y > state.levelHeight * TILE_SIZE) {
      triggerPlayerDeath();
    }

    // K. SHOOT FIREBALL COOLDOWN
    const isJPressed = keys['j'] || keys['z'];
    if (isJPressed && state.player.state === 'FIRE' && state.gameTick % 12 === 0) {
      state.projectiles.push({
        id: `fb_${Date.now()}_${Math.random()}`,
        x: state.player.x + (state.player.direction === 1 ? state.player.width : 0),
        y: state.player.y + state.player.height / 2,
        vx: state.player.direction * 5.5,
        vy: 1.5,
        radius: 6,
        type: 'FIREBALL',
      });
      audio.playFireball();
    }

    // L. UPDATE PROJECTILES (Fireballs, Boss Fires)
    state.projectiles = state.projectiles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'FIREBALL') {
        p.vy += 0.3; // Gravity for fireballs

        // Bounce on horizontal walls
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor((p.y + p.radius) / TILE_SIZE);

        if (isSolid(tx, ty)) {
          p.vy = -3.5; // Bounce upwards
          p.y = ty * TILE_SIZE - p.radius - 1;
        }

        // Detect if out of bounds or collides into brickwalls
        const sideTx = Math.floor((p.x + p.vx) / TILE_SIZE);
        const sideTy = Math.floor(p.y / TILE_SIZE);
        if (isSolid(sideTx, sideTy)) {
          // Explode fireball particle
          for (let i = 0; i < 4; i++) {
            state.particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              color: '#e76f51',
              size: 2,
              life: 1.0,
              decay: 0.1,
            });
          }
          return false; // Kill fireball
        }
      } else if (p.type === 'BOSS_FIRE') {
        // Left-ward slow dangerous project scale
        p.vy += Math.sin(state.gameTick * 0.1) * 0.05; // Sinewave oscillation for boss fire!

        // Hits wall = dismiss
        const tx = Math.floor(p.x / TILE_SIZE);
        const ty = Math.floor(p.y / TILE_SIZE);
        if (isSolid(tx, ty)) {
          return false;
        }
      }

      // Check collision with player for boss fires
      if (p.type === 'BOSS_FIRE') {
        const dist = Math.hypot(
          p.x - (state.player.x + state.player.width / 2),
          p.y - (state.player.y + state.player.height / 2)
        );
        if (dist < 18) {
          damagePlayer();
          return false;
        }
      }

      // Limit projectile offscreen cleanup range
      return p.x >= 0 && p.x < state.levelWidth * TILE_SIZE;
    });

    // M. UPDATE SPAWNED ITEMS (Mushrooms & Stars)
    state.items.forEach((item) => {
      if (item.spawnTimer > 0) {
        item.spawnTimer--;
        item.y -= 1.0; // Slowly emerge out of the block upwards
        return;
      }

      // Normal physics
      item.vy += 0.3; // Gravity
      item.y += item.vy;

      // Handle item horizontal y resolution
      const tyBot = Math.floor((item.y + item.height) / TILE_SIZE);
      const txLeft = Math.floor(item.x / TILE_SIZE);
      const txRight = Math.floor((item.x + item.width) / TILE_SIZE);

      if (isSolid(txLeft, tyBot) || isSolid(txRight, tyBot)) {
        item.y = (tyBot - 1) * TILE_SIZE + (TILE_SIZE - item.height);
        item.vy = 0;
      }

      item.x += item.vx;
      const txSide = Math.floor((item.vx > 0 ? item.x + item.width : item.x) / TILE_SIZE);
      const tyMid = Math.floor((item.y + item.height / 2) / TILE_SIZE);
      if (isSolid(txSide, tyMid)) {
        item.vx = -item.vx; // Reverse directions upon hitting obstacles
      }

      // Check Item player collide
      const overlap =
        state.player.x < item.x + item.width &&
        state.player.x + state.player.width > item.x &&
        state.player.y < item.y + item.height &&
        state.player.y + state.player.height > item.y;

      if (overlap) {
        audio.playPowerup();
        state.score += 1000;
        setCurrentScore(state.score);

        // Remove item
        item.isSpawned = false;

        // Upgrade power state
        if (item.type === 'MUSHROOM') {
          if (state.player.state === 'SMALL') {
            state.player.state = 'SUPER';
            setPowerUpState('SUPER');
            state.player.health = 2;
            state.player.height = 42;
            state.player.y -= 14; // Push up to make space
          }
        } else if (item.type === 'STAR') {
          state.player.state = 'FIRE';
          setPowerUpState('FIRE');
          state.player.health = 3;
          state.player.height = 42;
          if (state.player.state === 'SMALL') {
            state.player.y -= 14;
          }
        }
      }
    });
    // Filter collected items
    state.items = state.items.filter((item) => item.isSpawned);

    // N. UPDATE ENEMIES LOGIC
    state.enemies.forEach((enemy) => {
      if (enemy.isDead) {
        enemy.deathTimer--;
        return;
      }

      // 1. Move logic
      if (enemy.type === EnemyType.WALKER || enemy.type === EnemyType.SHELL) {
        if (enemy.isShellSpinning) {
          enemy.vx = enemy.direction * 7.5; // Fast bullet speed shell action!
        }

        enemy.vy += 0.35; // Gravity
        enemy.y += enemy.vy;

        // Verify floor
        const tyBot = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
        const txLeft = Math.floor(enemy.x / TILE_SIZE);
        const txRight = Math.floor((enemy.x + enemy.width) / TILE_SIZE);
        if (isSolid(txLeft, tyBot) || isSolid(txRight, tyBot)) {
          enemy.y = (tyBot - 1) * TILE_SIZE;
          enemy.vy = 0;
        }

        enemy.x += enemy.vx;
        const txSide = Math.floor((enemy.vx > 0 ? enemy.x + enemy.width : enemy.x) / TILE_SIZE);
        const tyMid = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
        if (isSolid(txSide, tyMid)) {
          enemy.vx = -enemy.vx;
          enemy.direction = -enemy.direction as 1 | -1;
        }
      } else if (enemy.type === EnemyType.FLYER) {
        // Floating Sine-wave oscillation
        enemy.x += enemy.vx || 0;
        const startY = enemy.patrolYStart || 200;
        enemy.y = startY + Math.sin(state.gameTick * 0.05) * 48; // Patrol range 48px
      } else if (enemy.type === EnemyType.BOSS) {
        // Boss AI: jump periodically, fire projectiles
        if (state.switchPressed) {
          // Boss falling to death
          enemy.vy += 0.3;
          enemy.y += enemy.vy;
          return;
        }

        // Slowly walk back & forth near end of castle
        if (state.gameTick % 180 === 0) {
          enemy.vx = (Math.random() - 0.5) * 1.5;
        }
        enemy.x += enemy.vx;

        // Keep boss on bridge bounds
        if (enemy.x < 70 * TILE_SIZE) enemy.x = 70 * TILE_SIZE;
        if (enemy.x > 84 * TILE_SIZE) enemy.x = 84 * TILE_SIZE;

        // Hop jumps
        if (state.gameTick % 120 === 0 && Math.random() < 0.6) {
          enemy.vy = -5.5;
        }
        enemy.vy += 0.25;
        enemy.y += enemy.vy;

        const bFloor = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
        const bCol = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
        if (isSolid(bCol, bFloor)) {
          enemy.y = (bFloor - 1) * TILE_SIZE;
          enemy.vy = 0;
        }

        // Decrease fire cooldown
        if (enemy.shootCooldown && enemy.shootCooldown > 0) {
          enemy.shootCooldown--;
        } else {
          // Shoot fire project!
          state.projectiles.push({
            id: `boss_fire_${Date.now()}_${Math.random()}`,
            x: enemy.x,
            y: enemy.y + 16 + Math.random() * 24,
            vx: -3.8,
            vy: -0.5,
            radius: 12,
            type: 'BOSS_FIRE',
          });
          enemy.shootCooldown = 150 + Math.random() * 60; // reset
        }
      }

      // 2. Check collision with projectiles
      state.projectiles.forEach((proj) => {
        if (proj.type === 'FIREBALL') {
          // AABB vs Circle
          const overlap =
            proj.x + proj.radius > enemy.x &&
            proj.x - proj.radius < enemy.x + enemy.width &&
            proj.y + proj.radius > enemy.y &&
            proj.y - proj.radius < enemy.y + enemy.height;

          if (overlap) {
            // Hurt enemy
            if (enemy.type === EnemyType.BOSS) {
              enemy.health = (enemy.health || 5) - 1;
              if (enemy.health <= 0) {
                defeatBoss();
              } else {
                audio.playHurt();
                // Knock-back flash
                enemy.vx = 2.0;
              }
            } else {
              defeatNormalEnemy(enemy);
            }
            // Kill fireball too
            proj.x = -9999;
          }
        }
      });

      // 3. Collision with player
      const pOverlap =
        state.player.x < enemy.x + enemy.width &&
        state.player.x + state.player.width > enemy.x &&
        state.player.y < enemy.y + enemy.height &&
        state.player.y + state.player.height > enemy.y;

      if (pOverlap) {
        // Check if player lands on head
        const isLandingOnHead =
          state.player.vy > 0 &&
          state.player.y + state.player.height - state.player.vy <= enemy.y + 12;

        if (isLandingOnHead) {
          // Bounce up high!
          state.player.vy = keysPressed.current['w'] || keysPressed.current[' '] ? -7.0 : -4.5;
          state.player.isGrounded = false;

          audio.playStomp();
          spawnStompParticles(enemy.x + enemy.width / 2, enemy.y);

          if (enemy.type === EnemyType.BOSS) {
            enemy.health = (enemy.health || 5) - 1;
            if (enemy.health <= 0) {
              defeatBoss();
            } else {
              enemy.vx = 2.0; // hit slide
            }
          } else if (enemy.type === EnemyType.SHELL) {
            if (!enemy.isShellSpinning) {
              // Trigger spin!
              enemy.isShellSpinning = true;
              // Kick it in players faced direction
              enemy.direction = state.player.direction;
              enemy.vx = enemy.direction * 7.5;
            } else {
              // Stop spinning
              enemy.isShellSpinning = false;
              enemy.vx = 0;
            }
          } else {
            // Normal stomped walker dies
            defeatNormalEnemy(enemy);
            state.score += 300;
            setCurrentScore(state.score);
          }
        } else {
          // Player hit from sides
          if (enemy.type === EnemyType.SHELL && !enemy.isShellSpinning) {
            // Player kicked static shell! Safe
            enemy.isShellSpinning = true;
            enemy.direction = state.player.x + state.player.width / 2 < enemy.x + enemy.width / 2 ? 1 : -1;
            enemy.vx = enemy.direction * 7.5;
            audio.playStomp();
          } else {
            // Damages player
            damagePlayer();
          }
        }
      }
    });

    state.enemies = state.enemies.filter((e) => !e.isDead || e.deathTimer > 0);

    // O. CAMERA INTERPOLATION TRACKING
    const targetCamX = state.player.x - dimensions.width / 2 + state.player.width / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.1;

    // Constrain camera bounds
    const maxCamX = state.levelWidth * TILE_SIZE - dimensions.width;
    if (state.camera.x < 0) state.camera.x = 0;
    if (state.camera.x > maxCamX) state.camera.x = maxCamX;

    // Follow Y if vertical climbs or high drop sections
    const targetCamY = state.player.y - dimensions.height / 2 + state.player.height / 2;
    state.camera.y += (targetCamY - state.camera.y) * 0.05;
    const maxCamY = state.levelHeight * TILE_SIZE - dimensions.height;
    if (state.camera.y < 0) state.camera.y = 0;
    if (state.camera.y > maxCamY) state.camera.y = maxCamY;
  };

  const defeatNormalEnemy = (enemy: Enemy) => {
    enemy.isDead = true;
    enemy.deathTimer = 22; // display squash frames count
    enemy.vx = 0;
    enemy.vy = 0;
  };

  const defeatBoss = () => {
    const state = gameStateRef.current;
    state.bossDefeated = true;
    state.particles.push({
      x: 74 * TILE_SIZE,
      y: 7 * TILE_SIZE,
      vx: 0,
      vy: 0,
      color: '#ffbe0b',
      size: 40,
      life: 1,
      decay: 0.02,
    });
    audio.playWin();

    // Spawn massive coins explosion
    for (let i = 0; i < 20; i++) {
      state.particles.push({
        x: 78 * TILE_SIZE + (Math.random() - 0.5) * 64,
        y: 8 * TILE_SIZE + (Math.random() - 0.5) * 32,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 6 - 2,
        color: '#ffdf00',
        size: 4,
        life: 1,
        decay: 0.03,
        gravity: true,
      });
    }

    state.enemies = state.enemies.filter((e) => e.type !== EnemyType.BOSS);
  };

  // HELPER TO MATCH BLOCK CHARACTER SOLIDITY
  const isSolid = (tx: number, ty: number): boolean => {
    const state = gameStateRef.current;
    if (tx < 0 || tx >= state.levelWidth || ty < 0 || ty >= state.levelHeight) return true;

    const block = state.grid[ty][tx];
    return (
      block === BlockType.GROUND ||
      block === BlockType.DIRT ||
      block === BlockType.BRICK ||
      block === BlockType.BRICK_EMPTY ||
      block === BlockType.MYSTERY_COIN ||
      block === BlockType.MYSTERY_MUSHROOM ||
      block === BlockType.MYSTERY_STAR ||
      block === BlockType.PIPE_LEFT ||
      block === BlockType.PIPE_RIGHT ||
      block === BlockType.PIPE_TOP_LEFT ||
      block === BlockType.PIPE_TOP_RIGHT ||
      block === BlockType.STAGE_SWITCH
    );
  };

  // SEPARATE DUAL AXIS COLLISION INTEGRATION
  const handlePlayerCollisions = (axis: 'horizontal' | 'vertical') => {
    const state = gameStateRef.current;
    const p = state.player;

    const startX = Math.floor(p.x / TILE_SIZE);
    const endX = Math.floor((p.x + p.width) / TILE_SIZE);
    const startY = Math.floor(p.y / TILE_SIZE);
    const endY = Math.floor((p.y + p.height) / TILE_SIZE);

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        if (tx < 0 || tx >= state.levelWidth || ty < 0 || ty >= state.levelHeight) continue;

        const tile = state.grid[ty][tx];

        // 1. TRAMPOLINE (Check bounce instantly)
        if (tile === BlockType.TRAMPOLINE) {
          const overlap =
            p.x < tx * TILE_SIZE + TILE_SIZE &&
            p.x + p.width > tx * TILE_SIZE &&
            p.y + p.height >= ty * TILE_SIZE &&
            p.y + p.height <= ty * TILE_SIZE + 12;

          if (overlap && p.vy > 0) {
            p.vy = -10.5; // Massive vertical trampoline boost!
            p.y = ty * TILE_SIZE - p.height;
            audio.playTrampoline();

            // Spawn bouncy speed trails
            for (let i = 0; i < 5; i++) {
              state.particles.push({
                x: tx * TILE_SIZE + TILE_SIZE / 2,
                y: ty * TILE_SIZE,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 4 - 3,
                color: '#8338ec',
                size: 2,
                life: 1.0,
                decay: 0.08,
              });
            }
          }
        }

        // 2. SPIKES / LAVA (Check hazards)
        if (tile === BlockType.SPIKE || tile === BlockType.LAVA) {
          const overlap =
            p.x < tx * TILE_SIZE + TILE_SIZE &&
            p.x + p.width > tx * TILE_SIZE &&
            p.y < ty * TILE_SIZE + TILE_SIZE &&
            p.y + p.height > ty * TILE_SIZE;

          if (overlap) {
            damagePlayer();
            // push back
            p.vy = -3.0;
            p.vx = p.direction * -2.0;
            return;
          }
        }

        // 3. COINS (Simple touch pickup)
        if (tile === BlockType.COIN) {
          state.grid[ty][tx] = BlockType.AIR;
          state.coins += 1;
          state.score += 200;
          setCurrentCoins(state.coins);
          setCurrentScore(state.score);
          audio.playCoin();

          // Coin particles
          for (let i = 0; i < 4; i++) {
            state.particles.push({
              x: tx * TILE_SIZE + TILE_SIZE / 2,
              y: ty * TILE_SIZE + TILE_SIZE / 2,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              color: '#ffbe0b',
              size: 2,
              life: 0.8,
              decay: 0.1,
            });
          }
        }

        // 4. FLAG LEVEL COMPLETE TOUCH
        if (tile === BlockType.FLAG_POLE || tile === BlockType.FLAG_TOP) {
          p.isClimbingFlag = true;
          p.vx = 0;
          p.vy = 0;
          p.flagClimbY = ty * TILE_SIZE;
          p.flagX = tx * TILE_SIZE;
          p.x = tx * TILE_SIZE - 4; // Center on pole

          // HEIGHT-SENSITIVE FLAG GRAB SCORING
          // Scan down column to locate bottom-most flag block
          let lowestTy = ty;
          while (lowestTy + 1 < state.levelHeight &&
                 (state.grid[lowestTy + 1][tx] === BlockType.FLAG_POLE ||
                  state.grid[lowestTy + 1][tx] === BlockType.FLAG_TOP)) {
            lowestTy++;
          }
          const heightFromBottom = lowestTy - ty; // 0 at bottom, ranges up depending on flag height

          let flagScore = 100;
          let scoreColor = '#ffffff';
          let particleCount = 5;

          if (heightFromBottom === 1) {
            flagScore = 200;
            scoreColor = '#b5e2fa';
          } else if (heightFromBottom === 2) {
            flagScore = 400;
            scoreColor = '#edafb8';
          } else if (heightFromBottom === 3) {
            flagScore = 800;
            scoreColor = '#f5b5fc';
          } else if (heightFromBottom === 4) {
            flagScore = 1500;
            scoreColor = '#ffbe0b';
          } else if (heightFromBottom === 5) {
            flagScore = 2500;
            scoreColor = '#fb5607';
            particleCount = 15;
          } else if (heightFromBottom === 6) {
            flagScore = 4000;
            scoreColor = '#ff006e';
            particleCount = 25;
          } else if (heightFromBottom >= 7) {
            flagScore = 6000;
            scoreColor = '#8338ec'; // Epic ultraviolet
            particleCount = 50;
          }

          state.score += flagScore;
          setCurrentScore(state.score);

          // Emit rewarding floating text representation
          state.particles.push({
            x: tx * TILE_SIZE + TILE_SIZE / 2,
            y: ty * TILE_SIZE - 12,
            vx: 0,
            vy: -1.0,
            color: scoreColor,
            size: 16,
            life: 1.5,
            decay: 0.015,
            text: `+${flagScore} PTS!`,
          });

          // Celebration particles based on score magnitude
          for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            state.particles.push({
              x: tx * TILE_SIZE + TILE_SIZE / 2,
              y: ty * TILE_SIZE + (Math.random() - 0.5) * 16,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2.0,
              color: `hsl(${Math.random() * 360}, 100%, 60%)`,
              size: Math.random() * 4 + 2,
              life: 1.0 + Math.random() * 0.4,
              decay: 0.02,
              gravity: true,
            });
          }

          audio.stopBgm();
          audio.playWin();
          return;
        }

        // 5. BOWSER STAGE BRIDGE SWITCH PRESS
        if (tile === BlockType.STAGE_SWITCH) {
          const overlap =
            p.x < tx * TILE_SIZE + TILE_SIZE &&
            p.x + p.width > tx * TILE_SIZE &&
            p.y + p.height >= ty * TILE_SIZE &&
            p.y + p.height <= ty * TILE_SIZE + 10;

          if (overlap && !state.switchPressed) {
            state.switchPressed = true;
            audio.playTrampoline();

            // Destroy the switch block visually
            state.grid[ty][tx] = BlockType.BRICK_EMPTY;

            // REMOVE BRIDGE BLOCKS: Classic Mario 1 Bridge drop!
            // All Ground/Dirt blocks from bridge index 70 to 86 inside row 10 are dissolved!
            for (let bx = 68; bx <= 84; bx++) {
              if (state.grid[10][bx] === BlockType.GROUND || state.grid[10][bx] === BlockType.BRICK) {
                state.grid[10][bx] = BlockType.AIR;
                // debris particles
                spawnBreakParticles(bx, 10, '#331111');
              }
            }

            // Signal boss defeat falls through bridge
            const b = state.enemies.find((e) => e.type === EnemyType.BOSS);
            if (b) {
              b.vx = 0;
              b.vy = 1; // start fall speed
            }

            // Complete stage in 1.5 seconds timer
            setTimeout(() => {
              p.isAutoWalking = true;
              p.autoWalkTimer = 120;
              p.vx = 2.0;
            }, 1500);
          }
        }

        // SOLID BLOCK REPERCUSSIONS COLLISION RESOLUTION
        if (isSolid(tx, ty)) {
          if (axis === 'horizontal') {
            if (p.vx > 0) {
              // Sliding right, push out left
              p.x = tx * TILE_SIZE - p.width - 0.1;
              p.vx = 0;
            } else if (p.vx < 0) {
              // Sliding left, push out right
              p.x = (tx + 1) * TILE_SIZE + 0.1;
              p.vx = 0;
            }
          } else {
            if (p.vy > 0) {
              // Landing on solid floor
              p.y = ty * TILE_SIZE - p.height - 0.1;
              p.vy = 0;
              p.isGrounded = true;
            } else if (p.vy < 0) {
              // Bumped head against solid ceiling block!
              p.y = (ty + 1) * TILE_SIZE + 0.1;
              p.vy = 0;

              // Action bump blocks!
              if (tile === BlockType.BRICK) {
                if (p.state !== 'SMALL') {
                  // Smash brick!
                  state.grid[ty][tx] = BlockType.AIR;
                  audio.playStomp();
                  spawnBreakParticles(tx, ty, '#a5a58d');
                  state.score += 100;
                  setCurrentScore(state.score);
                } else {
                  // Tiny bounce sound
                  audio.playStomp();
                }
              } else if (
                tile === BlockType.MYSTERY_COIN ||
                tile === BlockType.MYSTERY_MUSHROOM ||
                tile === BlockType.MYSTERY_STAR
              ) {
                // Determine item based on random probability:
                // - Mushroom (きのこ): 20%
                // - Fire Flower/Star (ファイア): 10%
                // - Coin (コイン): 70%
                const rand = Math.random();
                let chosenItem: 'COIN' | 'MUSHROOM' | 'STAR';
                if (rand < 0.20) {
                  chosenItem = 'MUSHROOM';
                } else if (rand < 0.30) {
                  chosenItem = 'STAR';
                } else {
                  chosenItem = 'COIN';
                }
                processMysteryHit(tx, ty, chosenItem);
              }
            }
          }
        }
      }
    }
  };

  // CANVAS GRAPHICS PAINT ENGINE
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    const cx = state.camera.x;
    const cy = state.camera.y;

    // Clear Screen with background color
    ctx.fillStyle = levelConfig.bgColor;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 1. DRAW PARALLAX CANVAS BACKGROUND CARTOONS
    // Sky clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const offsetCloudX = (cx * 0.3) % dimensions.width;
    for (let i = -1; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 300 - offsetCloudX + 70, 100, 30, 0, Math.PI * 2);
      ctx.arc(i * 300 - offsetCloudX + 110, 80, 40, 0, Math.PI * 2);
      ctx.arc(i * 300 - offsetCloudX + 150, 100, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lush mountains backdrops
    ctx.fillStyle = 'rgba(100, 180, 130, 0.2)';
    const offsetHillX = (cx * 0.15) % dimensions.width;
    for (let i = -1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 400 - offsetHillX, dimensions.height);
      ctx.lineTo(i * 400 - offsetHillX + 150, dimensions.height - 180);
      ctx.lineTo(i * 400 - offsetHillX + 300, dimensions.height);
      ctx.fill();
    }

    // 2. DRAW MAIN BLOCK LEVELS GRID
    const startTileX = Math.max(0, Math.floor(cx / TILE_SIZE));
    const endTileX = Math.min(state.levelWidth - 1, Math.floor((cx + dimensions.width) / TILE_SIZE) + 1);
    const startTileY = Math.max(0, Math.floor(cy / TILE_SIZE));
    const endTileY = Math.min(state.levelHeight - 1, Math.floor((cy + dimensions.height) / TILE_SIZE) + 1);

    for (let r = startTileY; r <= endTileY; r++) {
      for (let c = startTileX; c <= endTileX; c++) {
        const tile = state.grid[r][c];
        const screenX = c * TILE_SIZE - cx;
        const screenY = r * TILE_SIZE - cy;

        if (tile === BlockType.AIR) continue;

        switch (tile) {
          case BlockType.GROUND:
            // Top Green grass highlight
            ctx.fillStyle = '#2d6a4f';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#40916c';
            ctx.fillRect(screenX, screenY, TILE_SIZE, 6);
            ctx.fillStyle = '#1b4332';
            ctx.fillRect(screenX, screenY + TILE_SIZE - 4, TILE_SIZE, 4);
            break;

          case BlockType.DIRT:
            // Classic brown dirt brick patterns
            ctx.fillStyle = '#8c5a3c';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#5c3a21'; // cracks
            for (let i = 4; i < TILE_SIZE; i += 8) {
              ctx.fillRect(screenX + i, screenY + 4, 2, 4);
              ctx.fillRect(screenX + i - 2, screenY + TILE_SIZE - 8, 2, 4);
            }
            break;

          case BlockType.BRICK:
            // Segmented red clay building bricks
            ctx.fillStyle = '#bb3e03';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#ae2012'; // grout borders
            ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.fillStyle = '#0a0a0d';
            // lines
            ctx.fillRect(screenX, screenY + TILE_SIZE / 2, TILE_SIZE, 2);
            ctx.fillRect(screenX + TILE_SIZE / 2, screenY, 2, TILE_SIZE / 2);
            ctx.fillRect(screenX + TILE_SIZE / 4, screenY + TILE_SIZE / 2, 2, TILE_SIZE / 2);
            ctx.fillRect(screenX + (3 * TILE_SIZE) / 4, screenY + TILE_SIZE / 2, 2, TILE_SIZE / 2);
            break;

          case BlockType.BRICK_EMPTY:
            // Smooth solid brown steel look typical of solved boxes
            ctx.fillStyle = '#836a5b';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#4a3d34';
            ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            // Little corner metal rivets typical of retro games
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(screenX + 3, screenY + 3, 2, 2);
            ctx.fillRect(screenX + TILE_SIZE - 5, screenY + 3, 2, 2);
            ctx.fillRect(screenX + 3, screenY + TILE_SIZE - 5, 2, 2);
            ctx.fillRect(screenX + TILE_SIZE - 5, screenY + TILE_SIZE - 5, 2, 2);
            break;

          case BlockType.MYSTERY_COIN:
          case BlockType.MYSTERY_MUSHROOM:
          case BlockType.MYSTERY_STAR:
            // Animated Glowing Mystery Box Block with custom symbol emblem
            const cycle = Math.floor(state.gameTick / 15) % 4;
            const colors = ['#fca311', '#ffb703', '#e85d04', '#e85d04'];
            ctx.fillStyle = colors[cycle];
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

            // Question Mark
            ctx.font = 'bold 20px monospace';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('?', screenX + TILE_SIZE / 2 + 1, screenY + TILE_SIZE / 2 + 6);
            break;

          case BlockType.COIN:
            // Smooth circulating gold coins
            const isWide = Math.floor(state.gameTick / 8) % 4;
            let cWidth = TILE_SIZE;
            if (isWide === 1) cWidth = TILE_SIZE * 0.65;
            if (isWide === 2) cWidth = TILE_SIZE * 0.25;
            if (isWide === 3) cWidth = TILE_SIZE * 0.65;

            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.ellipse(
              screenX + TILE_SIZE / 2,
              screenY + TILE_SIZE / 2,
              cWidth / 2.5,
              TILE_SIZE / 2.5,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
            // shiny inner sparkle gold highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(
              screenX + TILE_SIZE / 2 - cWidth * 0.1,
              screenY + TILE_SIZE / 2 - TILE_SIZE * 0.1,
              cWidth / 8,
              TILE_SIZE / 8,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();
            break;

          case BlockType.SPIKE:
            // Silver-deadly hazards spikes triangle pattern
            ctx.fillStyle = '#a8dadc';
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + TILE_SIZE);
            ctx.lineTo(screenX + TILE_SIZE / 4, screenY + 8);
            ctx.lineTo(screenX + TILE_SIZE / 2, screenY + TILE_SIZE);
            ctx.lineTo(screenX + (3 * TILE_SIZE) / 4, screenY + 8);
            ctx.lineTo(screenX + TILE_SIZE, screenY + TILE_SIZE);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#457b9d';
            ctx.stroke();
            break;

          case BlockType.LAVA:
            // Animated bubble glowing lava waves
            const wave = Math.sin(state.gameTick * 0.1 + c * 0.5) * 4;
            ctx.fillStyle = '#d90429';
            ctx.fillRect(screenX, screenY + wave, TILE_SIZE, TILE_SIZE - wave);
            // Shiny highlight
            ctx.fillStyle = '#ef233c';
            ctx.fillRect(screenX, screenY + wave, TILE_SIZE, 6);
            ctx.fillStyle = '#ffbe0b'; // yellow fire flecks
            if (state.gameTick % 20 > 10) {
              ctx.fillRect(screenX + 8, screenY + wave + 12, 3, 3);
              ctx.fillRect(screenX + TILE_SIZE - 10, screenY + wave + 18, 2, 2);
            }
            break;

          case BlockType.TRAMPOLINE:
            // Metal bouncy coils trampoline
            ctx.fillStyle = '#adb5bd';
            ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 12, TILE_SIZE - 8, 12);
            ctx.fillStyle = '#e63946'; // red bouncy fabric pad
            ctx.fillRect(screenX, screenY + TILE_SIZE - 22, TILE_SIZE, 10);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(screenX, screenY + TILE_SIZE - 22, TILE_SIZE, 10);
            break;

          case BlockType.PIPE_TOP_LEFT:
            ctx.fillStyle = '#44c512';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            // Highlight shine line (aligned at x=8, width=4)
            ctx.fillStyle = '#9bf429';
            ctx.fillRect(screenX + 8, screenY, 4, TILE_SIZE);
            
            // Outlines (Top, Left, Bottom) using precise 2px fills
            ctx.fillStyle = '#000000';
            ctx.fillRect(screenX, screenY, TILE_SIZE, 2); // Top border
            ctx.fillRect(screenX, screenY, 2, TILE_SIZE); // Left border
            ctx.fillRect(screenX, screenY + TILE_SIZE - 2, TILE_SIZE, 2); // Bottom border
            break;

          case BlockType.PIPE_TOP_RIGHT:
            ctx.fillStyle = '#1d8b0c';
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            // Dark shadow right side (aligned beautifully)
            ctx.fillStyle = '#074503';
            ctx.fillRect(screenX + TILE_SIZE - 12, screenY, 10, TILE_SIZE);
            
            // Outlines (Top, Right, Bottom) using precise 2px fills
            ctx.fillStyle = '#000000';
            ctx.fillRect(screenX, screenY, TILE_SIZE, 2); // Top border
            ctx.fillRect(screenX + TILE_SIZE - 2, screenY, 2, TILE_SIZE); // Right border
            ctx.fillRect(screenX, screenY + TILE_SIZE - 2, TILE_SIZE, 2); // Bottom border
            break;

          case BlockType.PIPE_LEFT:
            ctx.fillStyle = '#44c512';
            ctx.fillRect(screenX + 4, screenY, TILE_SIZE - 4, TILE_SIZE);
            // Highlight shine line (perfect vertical alignment with top rim shine!)
            ctx.fillStyle = '#9bf429';
            ctx.fillRect(screenX + 8, screenY, 4, TILE_SIZE);
            
            // Outlines (Left body border only, indented at x=4)
            ctx.fillStyle = '#000000';
            ctx.fillRect(screenX + 4, screenY, 2, TILE_SIZE);
            break;

          case BlockType.PIPE_RIGHT:
            ctx.fillStyle = '#1d8b0c';
            ctx.fillRect(screenX, screenY, TILE_SIZE - 4, TILE_SIZE);
            // Dark shadow right side (aligned under the rim shadow)
            ctx.fillStyle = '#074503';
            ctx.fillRect(screenX + TILE_SIZE - 14, screenY, 8, TILE_SIZE);
            
            // Outlines (Right body border only, indented at x=TILE_SIZE - 6)
            ctx.fillStyle = '#000000';
            ctx.fillRect(screenX + TILE_SIZE - 6, screenY, 2, TILE_SIZE);
            break;

          case BlockType.FLAG_POLE:
            // Metal wire pole with subtle outlines and shiny chrome effect
            ctx.fillStyle = '#000000'; // outer shadow/line background
            ctx.fillRect(screenX + TILE_SIZE / 2 - 4, screenY, 8, TILE_SIZE);
            
            ctx.fillStyle = '#dee2e6'; // main light gray body
            ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY, 6, TILE_SIZE);
            
            ctx.fillStyle = '#ffffff'; // shine line
            ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY, 1, TILE_SIZE);
            
            ctx.fillStyle = '#adb5bd'; // shadow side
            ctx.fillRect(screenX + TILE_SIZE / 2, screenY, 3, TILE_SIZE);
            break;

          case BlockType.FLAG_TOP:
            // Draw matching pole segment first so it connects seamlessly-straight down
            ctx.fillStyle = '#000000';
            ctx.fillRect(screenX + TILE_SIZE / 2 - 4, screenY + 10, 8, TILE_SIZE - 10);
            
            ctx.fillStyle = '#dee2e6';
            ctx.fillRect(screenX + TILE_SIZE / 2 - 3, screenY + 10, 6, TILE_SIZE - 10);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY + 10, 1, TILE_SIZE - 10);
            
            ctx.fillStyle = '#adb5bd';
            ctx.fillRect(screenX + TILE_SIZE / 2, screenY + 10, 3, TILE_SIZE - 10);

            // Gold solid target visual ball top sitting cleanly on the pole
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(screenX + TILE_SIZE / 2, screenY + 10, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Render green Flag itself fluttering to left (triangular wave shape)
            ctx.fillStyle = '#38b000';
            ctx.beginPath();
            ctx.moveTo(screenX + TILE_SIZE / 2 - 3, screenY + 14);
            ctx.lineTo(screenX + TILE_SIZE / 2 - 32, screenY + 22);
            ctx.lineTo(screenX + TILE_SIZE / 2 - 3, screenY + 30);
            ctx.closePath();
            ctx.fill();
            
            // Outer flag border for high-quality definition
            ctx.strokeStyle = '#1b4332';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Little star symbol emblem on flag
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('★', screenX + TILE_SIZE / 2 - 14, screenY + 25);
            break;

          case BlockType.STAGE_SWITCH:
            // Castle final stage trigger button switch
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(screenX + 4, screenY + TILE_SIZE - 10, TILE_SIZE - 8, 10);
            ctx.fillStyle = '#ffffff';
            ctx.strokeRect(screenX + 4, screenY + TILE_SIZE - 10, TILE_SIZE - 8, 10);
            // Switch skull warnings pattern
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY + TILE_SIZE - 7, 4, 4);
            break;

          default:
            break;
        }
      }
    }

    // 3. DRAW DYNAMIC PLATFORMS
    state.movingPlatforms.forEach((p) => {
      if (p.state === 'RESPAWNING') return;

      const screenX = p.x - cx;
      const screenY = p.y - cy;

      ctx.fillStyle = p.type === 'FALLING' ? '#8d99ae' : '#7209b7'; // Falling or violet metal platform
      ctx.fillRect(screenX, screenY, p.width, p.height);

      ctx.strokeStyle = '#fff';
      ctx.strokeRect(screenX + 1, screenY + 1, p.width - 2, p.height - 2);

      // Design lines and textures
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(screenX, screenY, p.width, 3);
    });

    // 4. DRAW COIN/ITEM DROPS COLLECTIBLES
    state.items.forEach((item) => {
      const screenX = item.x - cx;
      const screenY = item.y - cy;

      if (item.type === 'MUSHROOM') {
        // Red Mushroom with white dots
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(screenX + item.width / 2, screenY + 12, 12, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // stem base
        ctx.fillStyle = '#f1faee';
        ctx.fillRect(screenX + 6, screenY + 12, item.width - 12, 12);

        // white spots on mushroom
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(screenX + item.width / 2, screenY + 6, 3, 0, Math.PI * 2);
        ctx.arc(screenX + 6, screenY + 10, 2, 0, Math.PI * 2);
        ctx.arc(screenX + item.width - 6, screenY + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'STAR') {
        // Draw a beautiful classic Fire Flower (ファイアフラワー)
        // Green stem & leaves
        ctx.fillStyle = '#1d8b0c';
        ctx.fillRect(screenX + item.width / 2 - 2, screenY + 12, 4, 12);
        
        ctx.beginPath();
        ctx.ellipse(screenX + item.width / 2 - 5, screenY + 17, 5, 2.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(screenX + item.width / 2 + 5, screenY + 17, 5, 2.5, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Layered Flower Head (Red / White / Yellow concentric ovals)
        ctx.fillStyle = '#e63946'; // Red outer oval
        ctx.beginPath();
        ctx.ellipse(screenX + item.width / 2, screenY + 8, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff'; // White middle oval
        ctx.beginPath();
        ctx.ellipse(screenX + item.width / 2, screenY + 8, 8, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffbe0b'; // Gold/Yellow inner oval
        ctx.beginPath();
        ctx.ellipse(screenX + item.width / 2, screenY + 8, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Small black eyes in the center yellow oval
        ctx.fillStyle = '#000000';
        ctx.fillRect(screenX + item.width / 2 - 1.5, screenY + 6.5, 1, 3);
        ctx.fillRect(screenX + item.width / 2 + 0.5, screenY + 6.5, 1, 3);
      }
    });

    // 5. DRAW EMITTED EXPLOSION/BREAKER PARTICLES
    state.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      if (p.text) {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px 'JetBrains Mono', 'Space Grotesk', Arial, sans-serif`;
        ctx.textAlign = 'center';
        // Dark/Black border outline for readability
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x - cx, p.y - cy);
        // Fill text
        ctx.fillText(p.text, p.x - cx, p.y - cy);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
      }
      ctx.globalAlpha = 1.0; // Reset
    });

    // 6. DRAW FIREBALLS & RETRO BOSS PROJECTILES
    state.projectiles.forEach((p) => {
      const screenX = p.x - cx;
      const screenY = p.y - cy;

      if (p.type === 'FIREBALL') {
        ctx.fillStyle = '#e76f51'; // Red-orange fireball core
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // core yellow
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'BOSS_FIRE') {
        // Wild firebar projectile (looks dangerous)
        const radPulse = p.radius + Math.sin(state.gameTick * 0.2) * 2;
        ctx.fillStyle = '#d90429';
        ctx.beginPath();
        ctx.arc(screenX, screenY, radPulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing thermal core
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(screenX, screenY, radPulse * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Tiny flames around tail
        ctx.fillStyle = '#f77f00';
        for (let i = 0; i < 4; i++) {
          const fx = screenX + p.radius + i * 4;
          const fy = screenY + Math.sin(state.gameTick * 0.4 + i) * 6;
          ctx.beginPath();
          ctx.arc(fx, fy, 4 - i * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // 7. DRAW MONSTERS ENEMIES
    state.enemies.forEach((enemy) => {
      const screenX = enemy.x - cx;
      const screenY = enemy.y - cy;

      if (enemy.isDead) {
        // Draw squashed flat frame animation typical of Mario
        ctx.fillStyle = enemy.type === EnemyType.SHELL ? '#38b000' : '#8c2f00';
        ctx.fillRect(screenX, screenY + enemy.height - 6, enemy.width, 6);
        ctx.strokeRect(screenX + 1, screenY + enemy.height - 6, enemy.width - 2, 4);
        return;
      }

      switch (enemy.type) {
        case EnemyType.WALKER:
          // Goomba-like brown walker mushroom
          const stompAnim = Math.floor(state.gameTick / 10) % 2;
          ctx.fillStyle = '#9c6644';
          ctx.beginPath();
          ctx.arc(screenX + enemy.width / 2, screenY + enemy.height / 2, 14, Math.PI, 0);
          ctx.closePath();
          ctx.fill();

          // Walker stem body
          ctx.fillStyle = '#f5ebe0';
          ctx.fillRect(screenX + 6, screenY + 14, enemy.width - 12, 14);

          // Mean angry eyes
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.moveTo(screenX + 10, screenY + 11);
          ctx.lineTo(screenX + 13, screenY + 13);
          ctx.lineTo(screenX + 10, screenY + 15);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(screenX + 18, screenY + 11);
          ctx.lineTo(screenX + 15, screenY + 13);
          ctx.lineTo(screenX + 18, screenY + 15);
          ctx.closePath();
          ctx.fill();

          // Action feet walking swing
          ctx.fillStyle = '#000000';
          if (stompAnim === 0) {
            ctx.fillRect(screenX + 2, screenY + enemy.height - 4, 8, 4);
            ctx.fillRect(screenX + enemy.width - 10, screenY + enemy.height - 4, 8, 4);
          } else {
            ctx.fillRect(screenX + 5, screenY + enemy.height - 4, 8, 4);
            ctx.fillRect(screenX + enemy.width - 7, screenY + enemy.height - 4, 8, 4);
          }
          break;

        case EnemyType.SHELL:
          // Koopa-like green turtle shell
          const spinning = enemy.isShellSpinning;
          ctx.fillStyle = spinning ? '#70e000' : '#38b000';
          ctx.beginPath();
          ctx.ellipse(
            screenX + enemy.width / 2,
            screenY + enemy.height / 2,
            13,
            11,
            spinning ? (state.gameTick * 0.1) % Math.PI : 0,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // shell spirals lines
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // head if walking
          if (!spinning && enemy.isShellSpinning !== true) {
            ctx.fillStyle = '#ffdd99';
            // draw head protruding left/right based on scale direction
            const isRight = enemy.vx > 0;
            const hx = isRight ? screenX + enemy.width - 4 : screenX - 4;
            ctx.beginPath();
            ctx.arc(hx + 4, screenY + 12, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(isRight ? hx + 5 : hx + 1, screenY + 10, 1.5, 3);
          }
          ctx.lineWidth = 1; // scale back
          break;

        case EnemyType.FLYER:
          // Flying red turtle shell or bat wing animations
          const wingFlap = Math.floor(state.gameTick / 6) % 2;
          ctx.fillStyle = '#d90429';
          ctx.beginPath();
          ctx.arc(screenX + enemy.width / 2, screenY + enemy.height / 2, 12, 0, Math.PI * 2);
          ctx.fill();

          // Wing flaps white
          ctx.fillStyle = '#ffffff';
          if (wingFlap === 0) {
            // Draw wings up
            ctx.beginPath();
            ctx.ellipse(screenX + 2, screenY + 4, 8, 4, -0.4, 0, Math.PI * 2);
            ctx.ellipse(screenX + enemy.width - 2, screenY + 4, 8, 4, 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Draw wings down
            ctx.beginPath();
            ctx.ellipse(screenX + 1, screenY + 14, 8, 4, 0.4, 0, Math.PI * 2);
            ctx.ellipse(screenX + enemy.width - 1, screenY + 14, 8, 4, -0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // draw shell ring
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(screenX + 4, screenY + 8, enemy.width - 8, enemy.height - 16);
          break;

        case EnemyType.BOSS:
          // Bowser Boss - scary horns, giant green shell, spikes and fire highlights!
          ctx.fillStyle = '#ffb703'; // body flesh golden yellow
          ctx.fillRect(screenX, screenY + 16, enemy.width, enemy.height - 16);

          // Giant Green shelled spiky back!
          ctx.fillStyle = '#38b000';
          ctx.fillRect(screenX + 24, screenY + 10, enemy.width - 24, 40);
          ctx.fillStyle = '#ffffff'; // Shell spikes on back
          ctx.fillRect(screenX + 32, screenY + 18, 5, 5);
          ctx.fillRect(screenX + 48, screenY + 28, 5, 5);
          ctx.fillRect(screenX + 40, screenY + 38, 5, 5);

          // Boss head
          ctx.fillStyle = '#e85d04'; // scary scales hair red
          ctx.fillRect(screenX, screenY, 32, 16);
          ctx.fillStyle = '#ffb703';
          ctx.fillRect(screenX + 4, screenY + 8, 28, 16);

          // Glowing Red evil eyes!
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(screenX + 8, screenY + 10, 4, 4);

          // White sharp teeth mouth
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX + 4, screenY + 20, 2, 4);
          ctx.fillRect(screenX + 10, screenY + 20, 2, 4);

          // Bowser Horns
          ctx.fillStyle = '#f5f5f5';
          ctx.beginPath();
          ctx.moveTo(screenX + 20, screenY + 4);
          ctx.lineTo(screenX + 16, screenY - 4);
          ctx.lineTo(screenX + 26, screenY + 4);
          ctx.fill();

          // Health counter above boss
          const maxHp = 5;
          const curHp = enemy.health || 5;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(screenX, screenY - 14, enemy.width, 6);
          ctx.fillStyle = '#e63946';
          ctx.fillRect(screenX, screenY - 14, enemy.width * (curHp / maxHp), 6);
          break;

        default:
          break;
      }
    });

    // 8. DRAW ACTIVE HERO PLAYER
    const p = state.player;
    if (p.isInvincible && Math.floor(state.gameTick / 4) % 2 === 0) {
      // Flashes/Flickers when receiving hit damage
    } else {
      const screenX = p.x - cx;
      const screenY = p.y - cy;

      // Color scheme based on power status
      let overallTunicColor = '#d90429'; // Red (Small / Big tunic)
      let overallShirtColor = '#ffbe0b'; // Gold / Blue
      if (p.state === 'FIRE') {
        overallTunicColor = '#ffffff'; // Fire white
        overallShirtColor = '#d90429'; // Fire fiery red
      } else if (p.state === 'SUPER') {
        overallTunicColor = '#e63946'; // Red
        overallShirtColor = '#1d3557'; // Denim blue overalls!
      } else {
        overallTunicColor = '#d90429'; // Standard small mario red
        overallShirtColor = '#2a9d8f'; // Standard cyan overalls
      }

      // Draw Retro pixel hero sprite rectangles
      // Cap highlight
      ctx.fillStyle = overallTunicColor;
      ctx.fillRect(screenX + 4, screenY, p.width - 8, 4);

      // Face/skin block
      ctx.fillStyle = '#ffddbb';
      ctx.fillRect(screenX + 4, screenY + 4, p.width - 8, p.height - 18);

      // Mustache black
      ctx.fillStyle = '#3a0ca3';
      ctx.fillRect(p.direction === 1 ? screenX + p.width - 8 : screenX + 4, screenY + 8, 4, 3);

      // Eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(p.direction === 1 ? screenX + p.width - 8 : screenX + 8, screenY + 4, 2, 3);

      // Clothes overalls
      ctx.fillStyle = overallShirtColor;
      ctx.fillRect(screenX + 2, screenY + p.height - 14, p.width - 4, 10);
      ctx.fillStyle = overallTunicColor;
      ctx.fillRect(screenX + 5, screenY + p.height - 14, p.width - 10, 8); // overlap suspenders

      // Shoes feet base
      ctx.fillStyle = '#5c3d2e';
      ctx.fillRect(screenX + 1, screenY + p.height - 4, p.width - 2, 4);

      // Removed crouch visual
    }
  };

  return (
    <div className="flex flex-col items-center bg-zinc-950 p-2 rounded-xl border border-zinc-800 shadow-2xl relative w-full overflow-hidden select-none">
      {/* Game Vintage Arcade Console Bezel HUD Header */}
      <div className="grid grid-cols-5 text-center text-xs md:text-sm font-mono tracking-wider w-full py-2 bg-zinc-900 border-b border-zinc-800 text-zinc-300 rounded-t-lg">
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 font-sans text-[10px] uppercase">Score</span>
          <span className="text-amber-400 font-bold">{String(currentScore).padStart(6, '0')}</span>
        </div>
        <div className="flex flex-col items-center text-amber-300 font-semibold text-sm">
          <span className="text-zinc-500 font-sans text-[10px] uppercase">Coins</span>
          <span className="flex items-center gap-1">
            🪙 × {currentCoins}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 font-sans text-[10px] uppercase">Stage</span>
          <span className="text-emerald-400 uppercase font-bold">{levelConfig.name.split(':')[0]}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 font-sans text-[10px] uppercase">Time</span>
          <span className={timeLeft < 60 ? 'text-rose-500 animate-pulse font-bold' : 'text-zinc-300'}>
            ⏰ {timeLeft}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 font-sans text-[10px] uppercase">Lives</span>
          <span className="text-rose-400 font-bold">❤️ × {currentLives}</span>
        </div>
      </div>

      {/* Screen Canvas Section */}
      <div
        ref={containerRef}
        className="w-full flex justify-center bg-sky-400 border border-zinc-900 relative"
        style={{ height: dimensions.height }}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="block outline-none shadow-inner"
        />

        {/* Floating Menu Button in Top Left */}
        <button
          onClick={() => {
            setIsMenuOpen((m) => {
              const next = !m;
              setIsPaused(next);
              return next;
            });
          }}
          className="absolute top-3 left-3 z-30 px-2.5 py-1.5 bg-black/75 hover:bg-black/90 active:scale-95 border border-zinc-700 hover:border-amber-500 text-zinc-300 hover:text-amber-400 rounded-lg text-xs font-bold font-mono tracking-tight flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>メニュー <span className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400 font-normal">ESC</span></span>
        </button>

        {/* Escape / Pause Menu Modal Overlay */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-center relative pointer-events-auto">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full font-mono shadow">
                PAUSED MENU
              </span>
              
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-extrabold text-zinc-100 font-mono tracking-wider flex items-center justify-center gap-1.5">
                  🕹️ ゲームメニュー
                </h3>
                <p className="text-[10px] text-zinc-500 font-sans">
                  ステージ: {levelConfig.name}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* 1. 「ゲームに戻る」 */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsPaused(false);
                    audio.playCoin();
                  }}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500 hover:text-amber-400 text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-97"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>ゲームに戻る</span>
                </button>

                {/* 2. 「リトライ」 */}
                <button
                  onClick={() => {
                    resetStage();
                    setIsMenuOpen(false);
                    setIsPaused(false);
                    audio.playJump();
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg hover:shadow-amber-500/20 active:scale-97"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ステージをリトライ</span>
                </button>

                {/* 3. 「ステージ選択に戻る」 */}
                <button
                  onClick={() => {
                    audio.playHurt();
                    onBackToMenu();
                  }}
                  className="w-full py-2 bg-zinc-900 hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-97"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ステージ選択に戻る</span>
                </button>
              </div>

              <p className="text-[9px] text-zinc-600 font-mono">
                [ESC]キーを押すことでもゲームに戻れます
              </p>
            </div>
          </div>
        )}

        {/* Dynamic game over visual modals overlay inside the pixel screen */}
        {isPaused && !isMenuOpen && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <span className="text-amber-400 font-serif font-extrabold text-2xl tracking-wider animate-bounce">
              PAUSED
            </span>
            <span className="text-zinc-400 font-mono text-xs text-center px-4">
              [P]をもう一度押すか、画面タップで再開
            </span>
            <button
              onClick={() => setIsPaused(false)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs"
            >
              再開する
            </button>
          </div>
        )}

        {isGameOverState && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4">
            <span className="text-red-600 font-serif font-black text-4xl tracking-widest uppercase animate-pulse">
              GAME OVER
            </span>
            <span className="text-zinc-400 font-mono text-sm">コンティニューはありません</span>
            <button
              onClick={onBackToMenu}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs rounded-lg uppercase tracking-widest transition-all"
            >
              メニューに戻る
            </button>
          </div>
        )}

        {isGameClearedState && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-emerald-400 font-serif font-extrabold text-4xl tracking-wider animate-bounce uppercase">
              STAGE CLEAR!
            </span>
            <div className="text-zinc-300 font-mono text-xs space-y-1">
              <p>獲得スコア: +{currentScore}</p>
              <p>残りタイムボーナス: +{timeLeft * 10}pts</p>
              <p>獲得コイン数: 🪙 {currentCoins}</p>
            </div>
            <span className="text-amber-400 text-xs font-semibold animate-pulse">
              集計して結果をロード中...
            </span>
          </div>
        )}
      </div>

      {/* Retro Arcade Cabin Keyboard Helper & Tactile WASD Buttons Panel */}
      <div className="w-full bg-zinc-900 border-t border-zinc-800 p-3 rounded-b-xl flex flex-col gap-3">
        {/* On-screen touch layout helpers for tablets and easy web preview testing */}
        <div className="flex items-center justify-between gap-4 md:gap-8 max-w-lg mx-auto w-full py-1">
          {/* Movement Cross Pad */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 font-mono mb-1">方向キー (WASD)</span>
            <div className="grid grid-cols-3 gap-1 w-28 h-24 relative select-none">
              <div />
              <div className="bg-zinc-950 border border-zinc-900 rounded flex items-center justify-center text-zinc-700 text-xs">—</div>
              <div />

              <button
                onTouchStart={() => (keysPressed.current['a'] = true)}
                onTouchEnd={() => (keysPressed.current['a'] = false)}
                onMouseDown={() => (keysPressed.current['a'] = true)}
                onMouseUp={() => (keysPressed.current['a'] = false)}
                onMouseLeave={() => (keysPressed.current['a'] = false)}
                className="bg-zinc-800 hover:bg-zinc-700 active:bg-amber-500 border border-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center rounded py-1 cursor-pointer transition-colors"
                title="A / Left"
              >
                ◀ A
              </button>
              <div className="bg-zinc-950 border border-zinc-900 rounded flex items-center justify-center text-zinc-700 text-xs">—</div>
              <button
                onTouchStart={() => (keysPressed.current['d'] = true)}
                onTouchEnd={() => (keysPressed.current['d'] = false)}
                onMouseDown={() => (keysPressed.current['d'] = true)}
                onMouseUp={() => (keysPressed.current['d'] = false)}
                onMouseLeave={() => (keysPressed.current['d'] = false)}
                className="bg-zinc-800 hover:bg-zinc-700 active:bg-amber-500 border border-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center rounded py-1 cursor-pointer transition-colors"
                title="D / Right"
              >
                ▶ D
              </button>
            </div>
          </div>

          {/* Action Buttons J and SPACE */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 font-mono mb-1">アクション</span>
            <div className="flex gap-2 h-20 items-end">
              {/* Fire Flame button */}
              <div className="flex flex-col items-center">
                <button
                  onTouchStart={() => (keysPressed.current['j'] = true)}
                  onTouchEnd={() => (keysPressed.current['j'] = false)}
                  onMouseDown={() => (keysPressed.current['j'] = true)}
                  onMouseUp={() => (keysPressed.current['j'] = false)}
                  onMouseLeave={() => (keysPressed.current['j'] = false)}
                  disabled={powerUpState !== 'FIRE'}
                  className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all ${
                    powerUpState === 'FIRE'
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 active:scale-95 shadow-lg shadow-rose-900/40 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-600 opacity-40 cursor-not-allowed'
                  }`}
                  title="J / Fireball"
                >
                  <span className="text-[10px] leading-tight select-none">FIRE</span>
                  <span className="text-sm font-black select-none">[ J ]</span>
                </button>
              </div>

              {/* Jump button */}
              <div className="flex flex-col items-center">
                <button
                  onTouchStart={() => (keysPressed.current[' '] = true)}
                  onTouchEnd={() => (keysPressed.current[' '] = false)}
                  onMouseDown={() => (keysPressed.current[' '] = true)}
                  onMouseUp={() => (keysPressed.current[' '] = false)}
                  onMouseLeave={() => (keysPressed.current[' '] = false)}
                  className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 border border-amber-300 text-zinc-950 font-black flex flex-col items-center justify-center cursor-pointer transition-all shadow-lg shadow-amber-900/30"
                  title="Space / Jump"
                >
                  <span className="text-[10px] leading-tight select-none">JUMP</span>
                  <span className="text-xs select-none">Space</span>
                </button>
              </div>

              {/* Sprint Dash button */}
              <div className="flex flex-col items-center">
                <button
                  onTouchStart={() => (keysPressed.current['shift'] = true)}
                  onTouchEnd={() => (keysPressed.current['shift'] = false)}
                  onMouseDown={() => (keysPressed.current['shift'] = true)}
                  onMouseUp={() => (keysPressed.current['shift'] = false)}
                  onMouseLeave={() => (keysPressed.current['shift'] = false)}
                  className="w-14 h-14 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 text-zinc-300 font-bold flex flex-col items-center justify-center cursor-pointer transition-all"
                  title="Shift / Dash Run"
                >
                  <span className="text-[9px] leading-tight select-none">DASH</span>
                  <span className="text-[10px] select-none">[Shift]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom manual cheat helpers for testing stages */}
        <div className="flex flex-wrap items-center justify-between border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-500 font-mono gap-2">
          <div className="flex items-center gap-1 md:gap-3">
            <span>[ESC] メニュー</span>
            <span>[P] 一時停止</span>
            <span>[SPACE] ジャンプ</span>
            <span>[J/Z] ファイア弾</span>
          </div>

          <div className="flex items-center gap-2">
            <span>テスト用パワーアップ:</span>
            <button
              onClick={() => {
                const state = gameStateRef.current;
                state.player.state = 'SUPER';
                state.player.health = 2;
                state.player.height = 42;
                setPowerUpState('SUPER');
                audio.playPowerup();
              }}
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 pointer-events-auto"
            >
              キノコ
            </button>
            <button
              onClick={() => {
                const state = gameStateRef.current;
                state.player.state = 'FIRE';
                state.player.health = 3;
                state.player.height = 42;
                setPowerUpState('FIRE');
                audio.playPowerup();
              }}
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 pointer-events-auto"
            >
              ファイア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
