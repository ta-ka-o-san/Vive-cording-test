// Dynamic Retro Synth Sound Effects using Web Audio API

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3; // 0 to 1
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: any = null;
  private bgmStep: number = 0;

  constructor() {
    // Lazy initialize to avoid blocking browsers which require user interaction
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getVolume() {
    return this.volume;
  }

  playJump() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle'; // Retro sweet jump sound
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playCoin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Classic 2-tone coin sound: B5 (987.77 Hz) to E6 (1318.51 Hz)
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.setValueAtTime(1318, now + 0.08);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0.3, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playStomp() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // Quick burst of noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(10, now + 0.1);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playPowerup() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // Quick rising arpeggio: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    const durationCount = notes.length;
    const step = 0.06;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * step);
      
      gain.gain.setValueAtTime(0.2, now + i * step);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * step);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + i * step);
      osc.stop(now + (i + 1.2) * step);
    });
  }

  playHurt() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.3);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.31);
  }

  playPowerdown() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const notes = [440, 392, 349, 293];
    const step = 0.08;
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * step);
      
      gain.gain.setValueAtTime(0.25, now + i * step);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * step);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + i * step);
      osc.stop(now + (i + 1) * step);
    });
  }

  playFireball() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playTrampoline() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playWin() {
    this.init();
    this.stopBgm();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // Triumphant melody: G4, C5, E5, G5, E5, G5
    const melody = [392.00, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.50];
    const beats = [0.12, 0.12, 0.12, 0.24, 0.12, 0.12, 0.48];
    let accumTime = 0;
    
    melody.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + accumTime);
      
      gain.gain.setValueAtTime(0.3, now + accumTime);
      gain.gain.exponentialRampToValueAtTime(0.01, now + accumTime + beats[i] - 0.01);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + accumTime);
      osc.stop(now + accumTime + beats[i]);
      
      accumTime += beats[i];
    });
  }

  playGameOver() {
    this.init();
    this.stopBgm();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // Sad melody: C5, G4, E4, A4, B4, A4, Ab4, G4
    const melody = [523.25, 392.00, 329.63, 440.00, 493.88, 440.00, 415.30, 392.00];
    const beats = [0.18, 0.18, 0.18, 0.24, 0.24, 0.24, 0.24, 0.6];
    let accumTime = 0;
    
    melody.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + accumTime);
      
      gain.gain.setValueAtTime(0.25, now + accumTime);
      gain.gain.exponentialRampToValueAtTime(0.01, now + accumTime + beats[i] - 0.01);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + accumTime);
      osc.stop(now + accumTime + beats[i]);
      
      accumTime += beats[i];
    });
  }

  startBgm() {
    this.init();
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.bgmStep = 0;
    
    // A simple rhythmic retro bassline & melody loop
    // C Major / A minor bouncy retro progression
    const steps = [
      // Bass (Frequency), Treble (Frequency or 0)
      [130.81, 523.25], [130.81, 0], [164.81, 659.25], [164.81, 0],
      [196.00, 783.99], [196.00, 0], [164.81, 659.25], [164.81, 0],
      [146.83, 587.33], [146.83, 0], [174.61, 698.46], [174.61, 0],
      [196.00, 783.99], [196.00, 0], [220.00, 880.00], [246.94, 987.77],
    ];
    
    const ticksPerStep = 0.2; // 200ms per step
    
    this.bgmIntervalId = setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isBgmPlaying) return;
      
      // Make sure the audio context is running
      if (this.ctx.state === 'suspended') return;
      
      const now = this.ctx.currentTime;
      const [bass, treble] = steps[this.bgmStep];
      
      // Play bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bass, now);
      bassGain.gain.setValueAtTime(0.08, now);
      bassGain.gain.exponentialRampToValueAtTime(0.005, now + ticksPerStep - 0.02);
      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);
      bassOsc.start(now);
      bassOsc.stop(now + ticksPerStep - 0.01);
      
      // Play treble note occasionally
      if (treble > 0 && this.bgmStep % 2 === 0) {
        const trebleOsc = this.ctx.createOscillator();
        const trebleGain = this.ctx.createGain();
        trebleOsc.type = 'triangle';
        trebleOsc.frequency.setValueAtTime(treble, now);
        
        // Randomize notes slightly or transpose for variation every few loops
        trebleGain.gain.setValueAtTime(0.04, now);
        trebleGain.gain.exponentialRampToValueAtTime(0.001, now + ticksPerStep * 1.5);
        
        trebleOsc.connect(trebleGain);
        trebleGain.connect(this.masterGain);
        trebleOsc.start(now);
        trebleOsc.stop(now + ticksPerStep * 1.4);
      }
      
      this.bgmStep = (this.bgmStep + 1) % steps.length;
    }, ticksPerStep * 1000);
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  isBgmActive() {
    return this.isBgmPlaying;
  }
}

export const audio = new AudioManager();
export default audio;
