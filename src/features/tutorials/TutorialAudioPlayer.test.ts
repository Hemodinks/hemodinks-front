import { describe, expect, it, vi } from 'vitest';
import { TutorialAudioPlayer, type TutorialAudioState } from './TutorialAudioPlayer';

function harness(play = vi.fn().mockResolvedValue(undefined)) {
  const audio = { paused: false, currentTime: 12, src: '', preload: '', onended: null, onerror: null,
    play, pause: vi.fn(function (this: { paused: boolean }) { this.paused = true; }), load: vi.fn(), removeAttribute: vi.fn() } as unknown as HTMLAudioElement;
  const states: TutorialAudioState[] = [];
  return { audio, states, player: new TutorialAudioPlayer((state) => states.push(state), () => audio) };
}

describe('TutorialAudioPlayer', () => {
  it('reproduz, pausa, continua, repete e para sem sobreposição', async () => {
    const { audio, player, states } = harness();
    await player.play('/tutorials/audio/reports/overview.mp3');
    player.pause();
    (audio as unknown as { paused: boolean }).paused = true;
    await player.resume();
    await player.replay();
    expect(audio.currentTime).toBe(0);
    player.stop();
    expect(audio.pause).toHaveBeenCalled();
    expect(states).toEqual(expect.arrayContaining(['loading', 'playing', 'paused', 'idle']));
  });

  it('publica finished e error', async () => {
    const success = harness(); await success.player.play('ok.mp3');
    (success.audio.onended as () => void)(); expect(success.states.at(-1)).toBe('finished');
    const failure = harness(vi.fn().mockRejectedValue(new Error('arquivo inválido')));
    await expect(failure.player.play('404.mp3')).rejects.toThrow('arquivo inválido');
    expect(failure.states.at(-1)).toBe('error');
  });

  it('faz preload sem reproduzir', () => {
    const { audio, player } = harness(); player.preload('next.mp3');
    expect(audio.load).toHaveBeenCalled(); expect(audio.play).not.toHaveBeenCalled();
  });
});
