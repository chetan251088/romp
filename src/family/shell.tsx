import { lazy, Suspense, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Shell, type GameProps, type Playable } from '../stage.tsx';
import { FAMILY_GAMES, type FamilyGameId } from './catalog.ts';
import { GRID_MOVES } from './puzzles.ts';
import { clipName } from './swedish.ts';

type FamilyInput = { camera?: boolean; names?: string[] };
export type FamilyProps = GameProps & FamilyInput;
type Module = { default: React.ComponentType<FamilyProps> };
const modules: Record<FamilyGameId, () => Promise<Module>> = {
  snosystrarna: () => import('./snow-sisters.tsx'),
  mural: () => import('./mural.tsx'),
  sled: () => import('./sled.tsx'),
  bridge: () => import('./bridge.tsx'),
  robotpost: () => import('./robot-post.tsx'),
  curiosity: () => import('./lab.tsx'),
  moonbase: () => import('./moon-base.tsx'),
  teacher: () => import('./teacher.tsx'),
  dadquest: () => import('./dad-quest.tsx'),
};

export type FamilyPlayable = Playable & React.FC<FamilyProps>;
export function familyPlay(id: FamilyGameId): FamilyPlayable {
  const load = modules[id], Game = lazy(load), { name, icon } = FAMILY_GAMES[id];
  return Object.assign((props: FamilyProps) => {
    const { paused, pause } = useContext(Shell);
    return <section className={`family-round family-${id}`} inert={paused}>
      <div className="family-heading">
        <h1>{icon} {name}</h1>
        <button className="ghost" onClick={pause}>Pause</button>
      </div>
      <main className="family-content">
        <Suspense fallback={<p role="status">Loading {name}…</p>}><Game {...props} /></Suspense>
      </main>
    </section>;
  }, { warm: () => { void load().catch(() => undefined); } });
}

export const playerName = ({ names }: FamilyInput, index: number) => names?.[index] ?? `Player ${index + 1}`;

export function complete(game: FamilyProps, fraction = 1, ...notes: string[]) {
  const score = Math.round(100 * fraction * (1 + (game.stage - 1) * 0.3));
  game.onEnd(Array.from({ length: game.n }, () => score), Array.from({ length: game.n }, () => notes));
}

export function Role({ name, children }: { name: string; children: ReactNode }) {
  return <p className="family-role"><strong>{name}</strong><span>{children}</span></p>;
}

export function Feedback({ children }: { children?: ReactNode }) {
  return <p className="family-feedback" aria-live="polite">{children}</p>;
}

export function Choice({ children, label, onClick, selected, disabled }: {
  children: ReactNode; label?: ReactNode; onClick: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <button className="family-choice" onClick={onClick} aria-pressed={selected} disabled={disabled}>
    <span className="choice-picture" aria-hidden={label ? true : undefined}>{children}</span>
    {label && <span>{label}</span>}
  </button>;
}

export function DirectionPad({ onMove, disabled, label = 'Directions' }: { onMove: (move: number) => void; disabled?: boolean; label?: string }) {
  return <div className="family-actions" role="group" aria-label={label}>
    {GRID_MOVES.map((d, i) => <button key={d.label} aria-label={d.label} onClick={() => onMove(i)} disabled={disabled}>{d.arrow}</button>)}
  </div>;
}

export function Speak({ text, children = 'Hear Swedish' }: { text: string; children?: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { paused } = useContext(Shell);
  useEffect(() => {
    const clip = audio.current;
    return () => { clip?.pause(); window.speechSynthesis?.cancel(); };
  }, [text, paused]);
  const speak = () => {
    const clip = audio.current;
    if (!clip) return;
    setUnavailable(false);
    clip.currentTime = 0;
    void clip.play().catch((error: DOMException) => {
      if (error.name === 'AbortError') return;
      const synth = window.speechSynthesis;
      const voice = synth?.getVoices().find((voice) => voice.localService && /^sv\b/i.test(voice.lang));
      if (!voice || typeof SpeechSynthesisUtterance === 'undefined') { setUnavailable(true); return; }
      synth.cancel();
      const phrase = new SpeechSynthesisUtterance(text);
      phrase.lang = 'sv-SE';
      phrase.rate = 0.83;
      phrase.voice = voice;
      synth.speak(phrase);
    });
  };
  return <>
    <audio key={text} ref={audio} preload="auto" src={'/family-voice/' + clipName(text)} />
    <button onClick={speak}>🔊 {children}</button>
    {unavailable && <span role="status">Audio is unavailable. The clue is written on screen.</span>}
  </>;
}
