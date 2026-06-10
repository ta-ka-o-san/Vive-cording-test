import React, { useState } from 'react';
import { BlockType, EnemyType, LevelConfig } from '../types';
import { Play, Trash2, Save, ArrowLeft, Info, Eye } from 'lucide-react';
import { audio } from '../audio';

interface LevelEditorProps {
  onPlayCustomLevel: (customLevel: LevelConfig) => void;
  onBackToMenu: () => void;
}

const ROWS = 14;
const COLS = 60; // Perfect standard screen horizontal width for custom design

export const LevelEditor: React.FC<LevelEditorProps> = ({ onPlayCustomLevel, onBackToMenu }) => {
  const [levelName, setLevelName] = useState('マイ・カスタムステージ');
  const [bgColor, setBgColor] = useState('#5c94fc'); // Classic sky blue
  
  // Brush Tool Selection State
  // Can be a BlockType or an EnemyType or 'START_PLAYER'
  const [activeBrush, setActiveBrush] = useState<BlockType | EnemyType | 'START_PLAYER'>(BlockType.GROUND);

  // Initialize block grid
  const [grid, setGrid] = useState<BlockType[][]>(() => {
    // Try to load cached custom level from localStorage
    try {
      const saved = localStorage.getItem('custom_level_grid');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    const initial = [];
    for (let r = 0; r < ROWS; r++) {
      const row: BlockType[] = [];
      for (let c = 0; c < COLS; c++) {
        // Build base ground default
        if (r === ROWS - 1) {
          row.push(BlockType.GROUND);
        } else if (r === ROWS - 2 && c < 5) {
          row.push(BlockType.GROUND); // simple starting ledge
        } else {
          row.push(BlockType.AIR);
        }
      }
      initial.push(row);
    }
    return initial;
  });

  // Track player starting position
  const [playerStart, setPlayerStart] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('custom_level_start');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { x: 2, y: ROWS - 3 };
  });

  // Track enemy positions
  const [enemies, setEnemies] = useState<{ type: EnemyType; x: number; y: number }[]>(() => {
    try {
      const saved = localStorage.getItem('custom_level_enemies');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [
      { type: EnemyType.WALKER, x: 15, y: ROWS - 2 },
      { type: EnemyType.SHELL, x: 28, y: ROWS - 2 },
    ];
  });

  // Keep mouse drag states
  const [isDrawing, setIsDrawing] = useState(false);

  // Palette brushes config
  const PALETTE_BLOCKS = [
    { type: BlockType.AIR, label: '消しゴム', color: 'bg-zinc-800 border-zinc-600' },
    { type: BlockType.GROUND, label: '草地ブロック', color: 'bg-emerald-600 border-emerald-400' },
    { type: BlockType.DIRT, label: '土ブロック', color: 'bg-amber-800 border-amber-600' },
    { type: BlockType.BRICK, label: 'レンガ', color: 'bg-orange-700 border-orange-500' },
    { type: BlockType.MYSTERY_COIN, label: '❓ハテナ (コイン)', color: 'bg-yellow-500 border-yellow-300 animate-pulse' },
    { type: BlockType.MYSTERY_MUSHROOM, label: '❓ハテナ (アイテム)', color: 'bg-purple-600 border-purple-400' },
    { type: BlockType.COIN, label: '金コイン', color: 'bg-yellow-400 rounded-full w-5 h-5 mx-auto border border-yellow-200' },
    { type: BlockType.SPIKE, label: 'トゲトラップ', color: 'bg-cyan-500 border-cyan-300' },
    { type: BlockType.LAVA, label: '溶岩マグマ', color: 'bg-red-600 border-red-400 animate-pulse' },
    { type: BlockType.TRAMPOLINE, label: 'ジャンプ台', color: 'bg-zinc-400 border-zinc-300' },
    { type: BlockType.FLAG_POLE, label: 'ゴールポール', color: 'bg-zinc-300 border-zinc-100' },
    { type: BlockType.FLAG_TOP, label: 'ゴール旗', color: 'bg-green-600 border-green-400' },
  ];

  const PALETTE_SPECIALS = [
    { type: 'START_PLAYER', label: 'プレイヤー初期位置', color: 'bg-red-500 border-red-300 ring-2 ring-white font-bold text-[8px] flex items-center justify-center text-white', icon: 'P' },
    { type: EnemyType.WALKER, label: '歩行クリボー型', color: 'bg-amber-950 border-amber-700 rounded-lg flex items-center justify-center text-xs text-white', icon: '🐾' },
    { type: EnemyType.SHELL, label: '甲羅ノコノコ型', color: 'bg-green-700 border-green-500 rounded-lg flex items-center justify-center text-xs text-white', icon: '🐢' },
    { type: EnemyType.FLYER, label: '飛行パタパタ型', color: 'bg-rose-500 border-rose-400 rounded-lg flex items-center justify-center text-xs text-white', icon: '🦇' },
    { type: EnemyType.BOSS, label: '巨大ボス (クッパ)', color: 'bg-red-600 border-zinc-200 font-bold flex items-center justify-center text-xs text-yellow-300 border-2', icon: '👹' },
  ];

  const BACKGROUNDS = [
    { value: '#5c94fc', label: '青空 (昼)' },
    { value: '#1c1c24', label: 'ダーク洞窟' },
    { value: '#a0c4ff', label: 'パステルな雲' },
    { value: '#240046', label: '紫コズミック' },
    { value: '#331111', label: 'お城の溶岩' },
  ];

  // Grid interaction handlers
  const handleCellInteraction = (r: number, c: number) => {
    if (activeBrush === 'START_PLAYER') {
      setPlayerStart({ x: c, y: r });
      return;
    }

    // Is it an Enemy type brush?
    if (
      activeBrush === EnemyType.WALKER ||
      activeBrush === EnemyType.SHELL ||
      activeBrush === EnemyType.FLYER ||
      activeBrush === EnemyType.BOSS
    ) {
      // Remove any existing enemy at this coordinate
      const filtered = enemies.filter((e) => !(e.x === c && e.y === r));
      // Add new enemy
      setEnemies([...filtered, { type: activeBrush as EnemyType, x: c, y: r }]);

      // Mark grid coordinate as AIR so enemy sits on top of air
      const nextGrid = [...grid];
      nextGrid[r][c] = BlockType.AIR;
      setGrid(nextGrid);
      audio.playStomp();
      return;
    }

    // Otherwise, normal block placement
    const nextGrid = [...grid];
    nextGrid[r][c] = activeBrush as BlockType;

    // Clear any enemy occupying this exact block
    setEnemies(enemies.filter((e) => !(e.x === c && e.y === r)));
    setGrid(nextGrid);
  };

  const clearEntireStage = () => {
    if (confirm('すべて消去して初期化してもよろしいですか？')) {
      const nextGrid = [];
      for (let r = 0; r < ROWS; r++) {
        const row: BlockType[] = [];
        for (let c = 0; c < COLS; c++) {
          if (r === ROWS - 1) {
            row.push(BlockType.GROUND);
          } else {
            row.push(BlockType.AIR);
          }
        }
        nextGrid.push(row);
      }
      setGrid(nextGrid);
      setEnemies([]);
      setPlayerStart({ x: 2, y: ROWS - 2 });
    }
  };

  const saveToLocal = () => {
    try {
      localStorage.setItem('custom_level_grid', JSON.stringify(grid));
      localStorage.setItem('custom_level_start', JSON.stringify(playerStart));
      localStorage.setItem('custom_level_enemies', JSON.stringify(enemies));
      audio.playCoin();
      alert('ブラウザにステージを一時保存しました！次回リロードでも保持されます。');
    } catch (e) {
      alert('保存に失敗しました');
    }
  };

  // Play test builder level config generator
  const triggerPlayTest = () => {
    audio.playPowerup();

    // Spawn a Flag Pole on the right border automatically if the player forgot to make one!
    // This is a life saver so they can actually win!
    let hasGoal = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === BlockType.FLAG_POLE || grid[r][c] === BlockType.FLAG_TOP) {
          hasGoal = true;
          break;
        }
      }
    }

    const gridCopy = JSON.parse(JSON.stringify(grid)) as BlockType[][];
    if (!hasGoal) {
      // Place classic flag on columns 56
      gridCopy[ROWS - 2][56] = BlockType.FLAG_TOP;
      for (let r = ROWS - 3; r >= 3; r--) {
        gridCopy[r][56] = BlockType.FLAG_POLE;
      }
    }

    const config: LevelConfig = {
      id: 'custom',
      name: levelName || 'カスタム・クリエイト',
      description: 'プレイヤー自身が自由にギミック・敵キャラクターを配置して作った完全自作ステージ。プレイテストに挑戦しよう！',
      width: COLS,
      height: ROWS,
      bgColor: bgColor,
      grid: gridCopy,
      enemies: enemies,
      startX: playerStart.x,
      startY: playerStart.y + 1, // offset
      timeLimit: 300,
    };

    onPlayCustomLevel(config);
  };

  const getCellVisuals = (r: number, c: number) => {
    // 1. Is player start position?
    if (playerStart.x === c && playerStart.y === r) {
      return (
        <div className="absolute inset-0 bg-rose-600/90 z-20 flex items-center justify-center font-bold text-[8px] text-white select-none animate-pulse">
          HERO
        </div>
      );
    }

    // 2. Is enemy sitting here?
    const enemyFound = enemies.find((e) => e.x === c && e.y === r);
    if (enemyFound) {
      let icon = '👾';
      if (enemyFound.type === EnemyType.WALKER) icon = '🐾';
      if (enemyFound.type === EnemyType.SHELL) icon = '🐢';
      if (enemyFound.type === EnemyType.FLYER) icon = '🦇';
      if (enemyFound.type === EnemyType.BOSS) icon = '👹';

      return (
        <div className="absolute inset-0 bg-yellow-900/60 z-10 flex flex-col items-center justify-center text-[11px] select-none text-white font-sans">
          {icon}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEnemies(enemies.filter((em) => !(em.x === c && em.y === r)));
            }}
            className="absolute -top-1 -right-1 text-[8px] bg-red-600 rounded-full w-3.5 h-3.5 flex items-center justify-center text-white font-mono hover:bg-red-500 cursor-pointer"
            title="削除"
          >
            ×
          </button>
        </div>
      );
    }

    // 3. Tile Block visuals
    const block = grid[r][c];
    if (block === BlockType.AIR) return null;

    switch (block) {
      case BlockType.GROUND:
        return <div className="absolute inset-0 bg-emerald-600 border-t-4 border-emerald-400" />;
      case BlockType.DIRT:
        return <div className="absolute inset-0 bg-amber-800 border-t-2 border-amber-600" />;
      case BlockType.BRICK:
        return <div className="absolute inset-0 bg-orange-700 border border-orange-500 flex items-center justify-center font-mono text-[6px] text-orange-400">#</div>;
      case BlockType.MYSTERY_COIN:
        return <div className="absolute inset-0 bg-yellow-500 border border-yellow-300 flex items-center justify-center font-bold text-xs text-white">?</div>;
      case BlockType.MYSTERY_MUSHROOM:
        return <div className="absolute inset-0 bg-purple-600 border border-purple-300 flex items-center justify-center font-bold text-xs text-white">?M</div>;
      case BlockType.COIN:
        return <div className="absolute inset-0 m-1 bg-yellow-400 rounded-full border border-yellow-200 animate-ping" />;
      case BlockType.SPIKE:
        return (
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="w-full h-1/2 bg-cyan-400 clip-triangle" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          </div>
        );
      case BlockType.LAVA:
        return <div className="absolute inset-x-0 bottom-0 top-1/3 bg-red-600 border-t border-yellow-400 animate-pulse" />;
      case BlockType.TRAMPOLINE:
        return <div className="absolute inset-x-0 bottom-0 top-1/2 bg-zinc-400 border-t-4 border-red-500" />;
      case BlockType.FLAG_POLE:
        return <div className="absolute inset-y-0 left-1/3 right-1/3 bg-zinc-300" />;
      case BlockType.FLAG_TOP:
        return (
          <div className="absolute inset-0 flex">
            <div className="w-1 bg-zinc-300 h-full" />
            <div className="w-4 bg-green-500 h-3 flex items-center justify-center text-[5px] text-white">★</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col gap-4 bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl relative select-none">
      {/* Editor Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-800 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            title="メニューに戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              🔨 ステージクリエイター
            </h1>
            <p className="text-xs text-zinc-500">マリオのような自作ステージをドラッグ＆ドロップで簡単デザイン！</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-sm">
          <input
            type="text"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            placeholder="ステージ名を入力..."
            className="bg-zinc-900 border border-zinc-800 max-w-[200px] text-xs px-2.5 py-1.5 rounded-lg text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          <button
            onClick={saveToLocal}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg flex items-center gap-1 text-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> 保存
          </button>
          <button
            onClick={clearEntireStage}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-rose-950 text-rose-400 border border-zinc-800 rounded-lg flex items-center gap-1 text-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> クリア
          </button>
          <button
            onClick={triggerPlayTest}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> テストプレイ開始
          </button>
        </div>
      </div>

      {/* Editor Main drawing desk workspace */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1 text-amber-500">
            <Info className="w-3.5 h-3.5" /> グリッドセルをクリックまたはドラッグするとパーツを配置します
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> 右側に自動的にゴール旗(★)が追加されます
          </span>
        </div>

        {/* Outer scrolling designer container */}
        <div className="w-full overflow-x-auto bg-zinc-900 border border-zinc-800 p-2 rounded-xl custom-scrollbar relative">
          <div
            className="grid gap-[1px] select-none"
            style={{
              gridTemplateRows: `repeat(${ROWS}, minmax(32px, 32px))`,
              gridTemplateColumns: `repeat(${COLS}, minmax(32px, 32px))`,
              backgroundColor: bgColor,
            }}
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`cell_${r}_${c}`}
                  className="w-8 h-8 border border-white/10 hover:border-amber-400/80 transition-colors cursor-crosshair relative"
                  onClick={() => handleCellInteraction(r, c)}
                  onMouseEnter={() => {
                    if (isDrawing) {
                      handleCellInteraction(r, c);
                    }
                  }}
                >
                  {getCellVisuals(r, c)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tools Panel with brush categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        {/* Background picker */}
        <div className="flex flex-col gap-2 border-r border-zinc-800 pr-4">
          <span className="text-xs font-bold font-sans text-zinc-400">1. 空の背景設定</span>
          <div className="grid grid-cols-2 gap-1.5">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.value}
                onClick={() => setBgColor(bg.value)}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs text-left cursor-pointer transition-all rounded border ${
                  bgColor === bg.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: bg.value }} />
                <span>{bg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tile Blocks Palette */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <span className="text-xs font-bold font-sans text-zinc-400">2. 配置するパーツパレットを選択</span>
          
          <div className="flex flex-col gap-4">
            {/* Terrain blocks */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">地形・トラップブロック</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-1.5">
                {PALETTE_BLOCKS.map((p) => {
                  const isSelected = activeBrush === p.type;
                  return (
                    <button
                      key={p.type}
                      onClick={() => {
                        setActiveBrush(p.type);
                        audio.playJump();
                      }}
                      className={`flex flex-col items-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold transform scale-102 ring-1 ring-amber-500/50'
                          : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-400'
                      }`}
                    >
                      <div className={`w-6 h-6 border ${p.color} rounded mb-1`} />
                      <span className="text-[9px] truncate w-full">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monsters & triggers */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">キャラクター・モンスター</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1.5">
                {PALETTE_SPECIALS.map((s) => {
                  const isSelected = activeBrush === s.type;
                  return (
                    <button
                      key={s.type}
                      onClick={() => {
                        setActiveBrush(s.type as any);
                        audio.playJump();
                      }}
                      className={`flex flex-col items-center p-1.5 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold scale-102 ring-1 ring-amber-500/50'
                          : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-850 text-zinc-400'
                      }`}
                    >
                      <div className={`w-6 h-6 border ${s.color} mb-1 flex items-center justify-center text-xs font-bold`}>
                        {s.icon}
                      </div>
                      <span className="text-[9px] truncate w-full text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
