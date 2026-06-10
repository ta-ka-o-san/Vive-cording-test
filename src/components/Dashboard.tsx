import React, { useState, useEffect } from 'react';
import { PRESET_LEVELS } from '../levels';
import { LevelConfig, GameScoreRecord } from '../types';
import { Play, Volume2, HelpCircle, FileText, Trophy, Hammer, Settings } from 'lucide-react';
import { audio } from '../audio';

interface DashboardProps {
  onSelectLevel: (level: LevelConfig) => void;
  onOpenEditor: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectLevel, onOpenEditor }) => {
  const [levelRecords, setLevelRecords] = useState<Record<string, GameScoreRecord>>({});
  const [globalVolume, setGlobalVolume] = useState(0.25);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(false);

  useEffect(() => {
    // Read High Score Stats
    try {
      const records: Record<string, GameScoreRecord> = {};
      PRESET_LEVELS.forEach((level) => {
        const saved = localStorage.getItem(`stage_score_${level.id}`);
        if (saved) {
          records[level.id] = JSON.parse(saved);
        }
      });
      setLevelRecords(records);
    } catch (e) {
      console.error('Failed to read score stats:', e);
    }

    // Audio level
    const cachedVol = audio.getVolume();
    setGlobalVolume(cachedVol);
    setIsMusicActive(audio.isBgmActive());
  }, []);

  const handleVolumeChange = (volStr: string) => {
    const vol = parseFloat(volStr);
    setGlobalVolume(vol);
    audio.setVolume(vol);
    audio.playCoin(); // soft chime feedback
  };

  const toggleMusic = () => {
    if (audio.isBgmActive()) {
      audio.stopBgm();
      setIsMusicActive(false);
    } else {
      audio.startBgm();
      setIsMusicActive(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6 text-zinc-100 select-none">
      {/* Cool Retro Title Card Header */}
      <div className="text-center py-6 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
        {/* Subtle decorative grid lines style */}
        <div className="absolute inset-0 bg-retro-patterns opacity-5 pointer-events-none" />
        
        <span className="text-amber-500 font-mono text-xs uppercase tracking-[0.3em] font-black animate-pulse mb-1">
          RETRO ARCADE ADVENTURE
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 font-serif filter drop-shadow">
          スーパー・ピクセル・アクション
        </h1>
        <p className="text-xs text-zinc-400 mt-2 font-mono max-w-md">
          WASDキーで駆け抜け、敵を踏み倒す！懐かしいクラシックスタイルの本格2Dプラットフォーマーゲーム。
        </p>

        {/* Global Controls HUD Banner */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onOpenEditor}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-800 rounded-xl font-bold flex items-center gap-2 text-xs cursor-pointer transition-all active:scale-95 shadow-lg"
          >
            <Hammer className="w-4 h-4 animate-bounce" /> ステージエディターを開く
          </button>
          
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl flex items-center gap-2 text-xs cursor-pointer transition-all active:scale-95"
          >
            <HelpCircle className="w-4 h-4" /> 操作方法・ヘルプ
          </button>
        </div>
      </div>

      {/* Tutorial How-to-play Panel */}
      {showTutorial && (
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-3 max-w-3xl mx-auto w-full transition-all duration-300">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 pb-2 border-b border-zinc-800">
            🎮 プレイヤーコントロール & 操作方法
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p className="text-zinc-300 font-semibold text-[11px] uppercase text-zinc-400">キーボード操作:</p>
              <ul className="space-y-1.5 font-mono text-[11px]">
                <li><b className="text-amber-500 bg-zinc-950 px-1 py-0.5 rounded mr-1">A / D または ◀ / ▶</b> : 左右移動 (ダッシュ慣性あり)</li>
                <li><b className="text-amber-500 bg-zinc-950 px-1 py-0.5 rounded mr-1">SPACEキー固定</b> : ジャンプ (長押しで高くジャンプ)</li>
                <li><b className="text-amber-500 bg-zinc-950 px-1 py-0.5 rounded mr-1">LSHIFT または Shift</b> : 高速ダッシュスクロール</li>
                <li><b className="text-amber-500 bg-zinc-950 px-1 py-0.5 rounded mr-1">J または Zキー</b> : ファイアマリオの時に火の玉発射</li>
                <li><b className="text-amber-500 bg-zinc-950 px-1 py-0.5 rounded mr-1">ESCキー</b> : 左上のメニュー画面を開く</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-zinc-300 font-semibold text-[11px] uppercase text-zinc-400">お役立ちギミック情報:</p>
              <ul className="space-y-1 bg-zinc-950 p-2.5 rounded-lg text-zinc-400 space-y-1.5">
                <li>🍄 <b>スーパーキノコ</b>: プレイヤーが大きく変化。1回のみ敵のダメージをブロック可能（レンガ破壊が可能に！）</li>
                <li>⭐ <b>スーパースター</b>: 無敵のファイアマリオに変身。モンスターを [J] で撃ち抜く火の玉を撃つ！</li>
                <li>🐇 <b>クリボー/ノコノコ像</b>: 踏みつけると倒せます。ノコノコは踏むと甲羅になり、蹴り飛ばすことができる！</li>
                <li>🛡️ <b>ステージ4のボス</b>: ボス背後にある赤いスイッチを踏むとボス下の床が崩壊し一撃勝利できます。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <Settings className="w-4 h-4 text-zinc-500" />
          <span><b>システムサウンド設定:</b> ゲーム進行や効果音をここから設定できます</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={globalVolume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="accent-amber-500 h-1.5 rounded-lg cursor-pointer max-w-[120px]"
            />
            <span className="text-xs font-mono w-8">{Math.round(globalVolume * 100)}%</span>
          </div>

          <button
            onClick={toggleMusic}
            className={`px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 rounded-lg cursor-pointer transition-all ${
              isMusicActive ? 'text-amber-400 bg-amber-500/10 border-amber-500/50' : ''
            }`}
          >
            {isMusicActive ? '🎵 BGMオン' : '🔇 BGMミュート中'}
          </button>
        </div>
      </div>

      {/* Stage Select Grid Title */}
      <div className="flex flex-col gap-1 mt-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 pl-1">
          🚩 ステージ選択 (PLAY PRESET STAGE)
        </h2>
        <div className="h-[1px] bg-zinc-800/80 w-full" />
      </div>

      {/* Stage Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_LEVELS.map((level) => {
          const record = levelRecords[level.id];
          let cardThemeBorder = 'hover:border-blue-500/50';
          let imageTag = '🌊';
          if (level.id === '1') {
            cardThemeBorder = 'hover:border-emerald-500/50';
            imageTag = '🌿';
          } else if (level.id === '2') {
            cardThemeBorder = 'hover:border-purple-500/50';
            imageTag = '🦇';
          } else if (level.id === '3') {
            cardThemeBorder = 'hover:border-sky-400/50';
            imageTag = '☁️';
          } else if (level.id === '4') {
            cardThemeBorder = 'hover:border-red-600/50';
            imageTag = '👹';
          }

          return (
            <div
              key={level.id}
              onClick={() => {
                audio.playJump();
                onSelectLevel(level);
              }}
              className={`bg-zinc-900 border border-zinc-800 transition-all cursor-pointer p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden group ${cardThemeBorder}`}
            >
              {/* Parallax style card layout */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 text-xl group-hover:scale-110 transition-transform shadow-inner">
                    {imageTag}
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-bold text-sm tracking-tight group-hover:text-amber-400 transition-colors">
                      {level.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono font-semibold">
                      LENGTH: {level.width}m / TIME LIMIT: {level.timeLimit}s
                    </p>
                  </div>
                </div>

                <div className="p-1 bg-zinc-950/80 rounded border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                  <Play className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans max-w-sm">
                {level.description}
              </p>

              {/* High Score Panel Stats */}
              <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                {record ? (
                  <>
                    <span className="flex items-center gap-1 text-amber-500">
                      <Trophy className="w-3 h-3" /> Highscore: <b>{record.highScore}</b>
                    </span>
                    <span className="text-zinc-400">
                      ⏱️ {record.bestTime}秒 | 🪙 {record.coinsCollected}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-600">記録なし (未クリア)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
