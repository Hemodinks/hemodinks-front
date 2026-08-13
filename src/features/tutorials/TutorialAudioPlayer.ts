export type TutorialAudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'finished' | 'error' | 'disabled';
export type TutorialAudioStateListener = (state: TutorialAudioState) => void;

export interface TutorialAudioPlayerContract {
  play(src: string): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  replay(): Promise<void>;
  stop(): void;
  preload(src: string): void;
}

type AudioFactory = () => HTMLAudioElement;

export class TutorialAudioPlayer implements TutorialAudioPlayerContract {
  private audio: HTMLAudioElement | null = null;
  private currentSrc = '';

  constructor(private readonly onState: TutorialAudioStateListener, private readonly createAudio: AudioFactory = () => new Audio()) {}

  async play(src: string) {
    this.stop();
    const audio = this.createAudio();
    this.audio = audio;
    this.currentSrc = src;
    audio.preload = 'auto';
    audio.src = src;
    audio.onended = () => this.onState('finished');
    audio.onerror = () => this.onState('error');
    this.onState('loading');
    try {
      await audio.play();
      this.onState('playing');
    } catch (error) {
      this.onState('error');
      throw error;
    }
  }

  pause() {
    if (!this.audio || this.audio.paused) return;
    this.audio.pause();
    this.onState('paused');
  }

  async resume() {
    if (!this.audio || !this.currentSrc) return;
    try { await this.audio.play(); this.onState('playing'); }
    catch (error) { this.onState('error'); throw error; }
  }

  async replay() {
    if (!this.audio || !this.currentSrc) return;
    this.audio.currentTime = 0;
    await this.resume();
  }

  stop() {
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audio = null;
    this.currentSrc = '';
    this.onState('idle');
  }

  preload(src: string) {
    const audio = this.createAudio();
    audio.preload = 'auto';
    audio.src = src;
    audio.load();
  }
}
