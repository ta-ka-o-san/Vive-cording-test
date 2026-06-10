import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameCanvas } from './components/GameCanvas';
import { LevelEditor } from './components/LevelEditor';
import { LevelConfig, GameScoreRecord } from './types';
import { audio } from './audio';
import { Trophy, Coins, Award, Clock, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';

type AppView = 'MENU' | 'GAME' | 'EDITOR' | 'VICTORY';

export default function App() {
  const [view, setView] = useState<AppView>('MENU');
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  
  // Victory display parameters
  const [victoryStats, setVictoryStats] = useState<{
    score: number;
    coins: number;
    timeSpent: number;
    isNewRecord: boolean;
  }>({ score: 0, coins: 0, timeSpent: 0, isNewRecord: false });

  // Initialize/ensure Audio starts on click
  useEffect(() => {
    const triggerAudioEnable = () => {
      audio.setVolume(0.20);
      window.removeEventListener('click', triggerAudioEnable);
    };
    window.addEventListener('click', triggerAudioEnable);
    return () => window.removeEventListener('click', triggerAudioEnable);
  }, []);

  const handleSelectLevel = (level: LevelConfig) => {
    setActiveLevel(level);
    setView('GAME');
  };

  const handleGameComplete = (finalScore: number, coinsCollected: number, timeSpent: number) => {
    if (!activeLevel) return;

    let isNewRecord = false;
    const levelId = activeLevel.id;

    // Check high score & write to LocalStorage
    try {
      const savedRecordStr = localStorage.getItem(`stage_score_${levelId}`);
      const oldHp = savedRecordStr ? JSON.parse(savedRecordStr) as GameScoreRecord : null;

      if (!oldHp || finalScore > oldHp.highScore || timeSpent < oldHp.bestTime) {
        isNewRecord = true;
        const newRecord: GameScoreRecord = {
          stageId: levelId,
          highScore: Math.max(finalScore, oldHp ? oldHp.highScore : 0),
          bestTime: Math.min(timeSpent, oldHp ? oldHp.bestTime : 9999),
          coinsCollected: Math.max(coinsCollected, oldHp ? oldHp.coinsCollected : 0),
          starsCollected: 1,
        };
        localStorage.setItem(`stage_score_${levelId}`, JSON.stringify(newRecord));
      }
    } catch (e) {
      console.error(e);
    }

    setVictoryStats({
      score: finalScore,
      coins: coinsCollected,
      timeSpent: timeSpent,
      isNewRecord: isNewRecord,
    });
    
    setView('VICTORY');
  };

  const handleBackToMenu = () => {
    setView('MENU');
    audio.stopBgm();
  };

  const handleRestartLevel = () => {
    if (!activeLevel) return;
    setView('GAME');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans relative">
      {/* Decorative ambient background grid glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Retro scanline flicker overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15))] bg-[length:100%_4px] opacity-35" />

      {/* Main Console Container */}
      <main className="flex-grow flex items-center justify-center p-3 md:p-6 z-10 w-full">
        <div className="w-full max-w-5xl">
          {view === 'MENU' && (
            <Dashboard
              onSelectLevel={handleSelectLevel}
              onOpenEditor={() => {
                audio.playJump();
                setView('EDITOR');
              }}
            />
          )}

          {view === 'GAME' && activeLevel && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <button
                  onClick={handleBackToMenu}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 font-bold flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> メニューに戻る
                </button>
                <div className="text-zinc-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                  PLAYING: <span className="text-amber-400 font-bold">{activeLevel.name}</span>
                </div>
              </div>
              
              <GameCanvas
                levelConfig={activeLevel}
                onGameComplete={handleGameComplete}
                onGameOver={() => {
                  // Wait, Canvas handles Game Over state locally, but we can play sound additionally
                }}
                onBackToMenu={handleBackToMenu}
              />
            </div>
          )}

          {view === 'EDITOR' && (
            <LevelEditor
              onPlayCustomLevel={(customLevel) => {
                setActiveLevel(customLevel);
                setView('GAME');
              }}
              onBackToMenu={() => setView('MENU')}
            />
          )}

          {view === 'VICTORY' && (
            <div className="max-w-md mx-auto bg-zinc-900 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-center">
              {/* Dynamic decorative sparkles top banner */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400" />
              
              <div className="flex justify-center p-2">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full border-2 border-amber-500 flex items-center justify-center shadow-lg text-amber-400 animate-bounce">
                  <Award className="w-8 h-8" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-emerald-400 uppercase tracking-widest font-serif">
                  STAGE CLEAR!
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  おめでとうございます！任務を無事クリアしました
                </p>
              </div>

              {/* Stats card */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-3 font-mono text-xs">
                {victoryStats.isNewRecord && (
                  <div className="bg-amber-500/10 border border-amber-500/40 py-1.5 px-3 rounded-lg text-amber-400 font-black animate-pulse flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> NEW BEST RECORD! (ハイスコア更新)
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5 text-left py-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">SCORE</p>
                      <p className="text-sm font-bold text-zinc-200">{victoryStats.score} pts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">COINS</p>
                      <p className="text-sm font-bold text-zinc-200">{victoryStats.coins} 枚</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 col-span-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">SPEED TIME (クリア時間)</p>
                      <p className="text-sm font-bold text-zinc-200">{victoryStats.timeSpent} 秒 / 制限時間</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Playback Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestartLevel}
                  className="flex-grow px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow shadow-amber-500/20 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> もう一度挑戦する
                </button>
                <button
                  onClick={handleBackToMenu}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> メニューへ
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bezel footer status info lines */}
      <footer className="w-full text-center py-4 bg-zinc-950/80 border-t border-zinc-900/60 text-[9px] text-zinc-600 font-mono">
        <p>© 2026 Retro Pixel Adventure. Powered by Web Audio API and HTML5 Canvas Engine.</p>
      </footer>
    </div>
  );
}
