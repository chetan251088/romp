import { useRef, useState } from 'react';
import { complete, Feedback, playerName, type FamilyProps } from './shell.tsx';
import { PALETTE, Sketch, type Brush, type Scene, type SketchHandle } from './sketch.tsx';

const STORE = 'romp.family.gallery';
const scenes: { id: Scene; name: string }[] = [
  { id: 'blank', name: 'Blank paper' }, { id: 'snow', name: 'Snow village' },
  { id: 'garden', name: 'Flower garden' }, { id: 'space', name: 'Outer space' },
];
type Artwork = { image: string; title: string; id: number };
function gallery(): Artwork[] {
  try {
    const art: unknown = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return Array.isArray(art) ? art.filter((item): item is Artwork => typeof item?.image === 'string' && item.image.startsWith('data:image/png;base64,') && typeof item.title === 'string' && typeof item.id === 'number').slice(0, 6) : [];
  } catch { return []; }
}

export default function Mural(game: FamilyProps) {
  const [scene, setScene] = useState<Scene>(scenes[game.stage - 1]?.id ?? 'blank'), [active, setActive] = useState(0);
  const [brushes, setBrushes] = useState<Brush[]>(() => Array.from({ length: game.n }, (_, i) => ({ color: i * 4, width: 12 })));
  const [ink, setInk] = useState(false), [art, setArt] = useState(gallery), [show, setShow] = useState(false), [message, setMessage] = useState('');
  const canvas = useRef<SketchHandle>(null);
  const brush = brushes[active];
  const editBrush = (next: Partial<Brush>) => setBrushes(brushes.map((b, i) => i === active ? { ...b, ...next } : b));
  const save = () => {
    const image = canvas.current?.image();
    if (!image) return;
    const title = scenes.find((item) => item.id === scene)!.name;
    const next = [{ image, title, id: Date.now() }, ...art].slice(0, 6);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
      setArt(next); setShow(true); setMessage('Picture saved on this device.');
    } catch { setMessage('The gallery is full or unavailable. You can still download the picture.'); }
  };
  return <>
    <div className="family-strip">
      <div className="family-actions" role="group" aria-label="Active brush">
        {brushes.map((_, i) => <button key={i} aria-pressed={active === i} onClick={() => setActive(i)}>{playerName(game, i)}’s brush</button>)}
      </div>
      <label className="scene-select">Scene <select value={scene} onChange={(e) => setScene(e.currentTarget.value as Scene)}>
        {scenes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
    </div>
    <div className="mural-workspace">
      <Sketch ref={canvas} scene={scene} active={active} brushes={brushes} onInk={setInk} />
      <div className="family-controls">
        <div className="family-swatches" role="group" aria-label="Brush colors">
          {PALETTE.map(([label, color], i) => <button key={label} title={label} aria-label={label} style={{ background: color }} aria-pressed={!brush.erase && !brush.stamp && brush.color === i} onClick={() => editBrush({ color: i, erase: false, stamp: undefined })} />)}
        </div>
        <div className="family-actions" role="group" aria-label="Brush size">
          {[6, 12, 27].map((width, i) => <button key={width} aria-pressed={width === brush.width && !brush.stamp} onClick={() => editBrush({ width, stamp: undefined })}>{['Fine', 'Medium', 'Wide'][i]}</button>)}
        </div>
        <div className="family-actions" role="group" aria-label="Drawing tools">
          {['★', '♥', '❄'].map((stamp, i) => <button key={stamp} aria-label={['Star stamp', 'Heart stamp', 'Snowflake stamp'][i]} aria-pressed={brush.stamp === stamp} onClick={() => editBrush({ stamp, erase: false })}>{stamp}</button>)}
          <button aria-pressed={!!brush.erase} onClick={() => editBrush({ erase: true, stamp: undefined, width: 27 })}>Eraser</button>
        </div>
        <div className="family-actions"><button onClick={() => canvas.current?.undo()}>Undo</button><button onClick={() => canvas.current?.clear()}>Clear</button></div>
      </div>
    </div>
    <div className="family-actions">
      <button className="primary" disabled={!ink} onClick={save}>Save to gallery</button>
      <button disabled={!ink} onClick={() => {
        const image = canvas.current?.image();
        if (image) Object.assign(document.createElement('a'), { href: image, download: 'family-mural.png' }).click();
      }}>Download PNG</button>
      <button aria-expanded={show} onClick={() => setShow(!show)}>{show ? 'Hide gallery' : 'Open gallery'} ({art.length})</button>
      <button disabled={!ink} onClick={() => complete(game, 1, 'Made a family mural')}>Finish drawing</button>
    </div>
    <Feedback>{message}</Feedback>
    {show && <div className="family-gallery">{art.length ? art.map((item) => <a key={item.id} href={item.image} download="family-mural.png"><img loading="lazy" src={item.image} alt={item.title + ' drawing'} />Download</a>) : <p>Your saved pictures will appear here.</p>}</div>}
  </>;
}
