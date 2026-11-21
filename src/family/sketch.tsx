import { useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react';

export const PALETTE = [
  ['Rose', '#ef497e'], ['Mandarin', '#fb913c'], ['Gold', '#ffd858'], ['Mint', '#24ba87'],
  ['Sky', '#3ebeff'], ['Grape', '#9359d5'], ['Ink', '#29344e'], ['Snow', '#ffffff'],
] as const;
export type Brush = { color: number; width: number; stamp?: string; erase?: boolean };
export type Scene = 'blank' | 'snow' | 'space' | 'garden';
type Point = { x: number; y: number };
type Stroke = { brush: Brush; brushIndex: number; points: Point[] };
export type SketchHandle = { undo: () => void; clear: () => void; image: () => string | undefined };
const W = 800, H = 450;
const DEFAULT: Brush = { color: 0, width: 12 };

function background(ctx: CanvasRenderingContext2D, scene: Scene) {
  ctx.fillStyle = '#fffaf2'; ctx.fillRect(0, 0, W, H);
  if (scene === 'blank') return;
  ctx.strokeStyle = '#556581'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const path = (draw: () => void) => { ctx.beginPath(); draw(); ctx.stroke(); };
  const circle = (x: number, y: number, radius: number) => path(() => ctx.arc(x, y, radius, 0, Math.PI * 2));
  if (scene === 'snow') {
    path(() => { ctx.moveTo(0, 325); ctx.quadraticCurveTo(250, 245, 520, 350); ctx.quadraticCurveTo(670, 400, 800, 320); });
    path(() => { ctx.moveTo(10, 320); ctx.lineTo(180, 106); ctx.lineTo(332, 304); ctx.moveTo(137, 160); ctx.lineTo(180, 188); ctx.lineTo(218, 156); });
    path(() => {
      ctx.moveTo(595, 344); ctx.lineTo(595, 250); ctx.lineTo(730, 250); ctx.lineTo(730, 347); ctx.closePath();
      ctx.moveTo(578, 250); ctx.lineTo(661, 183); ctx.lineTo(745, 250); ctx.closePath();
      ctx.moveTo(645, 344); ctx.lineTo(645, 291); ctx.lineTo(678, 291); ctx.lineTo(678, 344);
    });
    circle(470, 94, 38);
  } else if (scene === 'space') {
    circle(196, 140, 66); circle(615, 107, 44); circle(561, 325, 62);
    path(() => ctx.ellipse(196, 140, 104, 23, -0.38, 0, Math.PI * 2));
    path(() => {
      ctx.moveTo(356, 298); ctx.quadraticCurveTo(336, 200, 402, 123); ctx.quadraticCurveTo(465, 201, 447, 298); ctx.closePath();
      ctx.moveTo(350, 244); ctx.lineTo(316, 318); ctx.lineTo(361, 302);
      ctx.moveTo(452, 244); ctx.lineTo(486, 318); ctx.lineTo(444, 302);
    });
    circle(401, 208, 20);
  } else {
    path(() => { ctx.moveTo(0, 370); ctx.quadraticCurveTo(400, 306, 800, 375); });
    for (const [x, y] of [[153, 231], [345, 161], [608, 243]]) {
      path(() => { ctx.moveTo(x, y + 27); ctx.lineTo(x, 349); ctx.lineTo(x + 36, 310); });
      for (let k = 0; k < 5; k++) {
        const angle = k / 5 * 2 * Math.PI;
        circle(x + Math.cos(angle) * 34, y + Math.sin(angle) * 34, 21);
      }
      ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.arc(x, y, 21, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, stroke: Stroke, from: Point, to: Point, start = false) {
  const { brush } = stroke;
  ctx.globalCompositeOperation = brush.erase ? 'destination-out' : 'source-over';
  ctx.fillStyle = ctx.strokeStyle = PALETTE[brush.color][1];
  if (brush.stamp) {
    if (start) {
      ctx.font = '46px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(brush.stamp, to.x, to.y);
    }
    return;
  }
  ctx.beginPath();
  if (start) { ctx.arc(to.x, to.y, brush.width / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.lineWidth = brush.width;
  ctx.lineCap = 'round'; ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
}

export function Sketch({ ref, scene = 'blank', brushes = [DEFAULT], active = 0, onInk }: {
  ref?: Ref<SketchHandle>; scene?: Scene; brushes?: Brush[]; active?: number; onInk: (ink: boolean) => void;
}) {
  const paper = useRef<HTMLCanvasElement>(null), ink = useRef<HTMLCanvasElement>(null);
  const history = useRef<Stroke[]>([]), pointers = useRef(new Map<number, Stroke>());
  useEffect(() => { const ctx = paper.current?.getContext('2d'); if (ctx) background(ctx, scene); }, [scene]);
  const redraw = () => {
    const ctx = ink.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const stroke of history.current) {
      draw(ctx, stroke, stroke.points[0], stroke.points[0], true);
      for (let i = 1; i < stroke.points.length; i++) draw(ctx, stroke, stroke.points[i - 1], stroke.points[i]);
    }
    onInk(history.current.some(({ brush }) => !brush.erase));
  };
  useImperativeHandle(ref, () => ({
    undo: () => { pointers.current.clear(); history.current.pop(); redraw(); },
    clear: () => { pointers.current.clear(); history.current = []; redraw(); },
    image: () => {
      if (!ink.current || !paper.current) return;
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(paper.current, 0, 0); ctx.drawImage(ink.current, 0, 0);
      return canvas.toDataURL('image/png');
    },
  }));
  const point = (e: Pick<PointerEvent, 'clientX' | 'clientY'>, rect: DOMRect): Point => ({ x: (e.clientX - rect.left) * W / rect.width, y: (e.clientY - rect.top) * H / rect.height });
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || history.current.length >= 250 || pointers.current.size >= brushes.length) return;
    const canvas = e.currentTarget, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const at = point(e, canvas.getBoundingClientRect());
    const used = [...pointers.current.values()].map(({ brushIndex }) => brushIndex);
    const brushIndex = used.includes(active) ? 1 - active : active;
    const stroke = { brush: brushes[brushIndex], brushIndex, points: [at] };
    history.current.push(stroke); pointers.current.set(e.pointerId, stroke); canvas.setPointerCapture(e.pointerId);
    draw(ctx, stroke, at, at, true);
    if (!stroke.brush.erase) onInk(true);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const stroke = pointers.current.get(e.pointerId);
    if (!stroke || stroke.brush.stamp || stroke.points.length >= 6000) return;
    const canvas = e.currentTarget, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of events.length ? events : [e]) {
      const at = point(sample, rect), previous = stroke.points[stroke.points.length - 1];
      if (Math.abs(at.x - previous.x) + Math.abs(at.y - previous.y) < 0.75) continue;
      draw(ctx, stroke, previous, at); stroke.points.push(at);
    }
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => { pointers.current.delete(e.pointerId); };
  return <div className="sketch-board">
    <canvas ref={paper} width={W} height={H} aria-hidden="true" />
    <canvas ref={ink} width={W} height={H} aria-label="Drawing canvas" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
  </div>;
}
