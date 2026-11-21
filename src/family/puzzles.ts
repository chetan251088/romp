export const GRID_MOVES = [
  { x: 0, y: -1, label: 'Up', arrow: '↑' },
  { x: 1, y: 0, label: 'Right', arrow: '→' },
  { x: 0, y: 1, label: 'Down', arrow: '↓' },
  { x: -1, y: 0, label: 'Left', arrow: '←' },
];

export function gridStep(index: number, move: number, size: number) {
  const d = GRID_MOVES[move], x = index % size + d.x, y = Math.floor(index / size) + d.y;
  return x < 0 || y < 0 || x >= size || y >= size ? -1 : y * size + x;
}

export const ROBOT_ROUTES = [
  { size: 4, start: 12, goal: 7, walls: [8, 10] },
  { size: 4, start: 0, goal: 15, walls: [4, 6, 10] },
  { size: 5, start: 20, goal: 4, walls: [10, 12, 13, 18] },
  { size: 5, start: 0, goal: 24, walls: [1, 6, 11, 18, 19] },
  { size: 5, start: 22, goal: 2, walls: [17, 18, 12, 7, 6] },
];

export const MOON_SIZE = 5, MOON_BASE = 20;
export const MOON_MAPS = [
  { battery: 17, samples: [12, 23], craters: [11, 16, 19], rough: [13, 17, 22] },
  { battery: 19, samples: [10, 4], craters: [5, 12, 18], rough: [6, 8, 14] },
  { battery: 18, samples: [0, 9], craters: [6, 11, 16], rough: [12, 13, 24] },
  { battery: 18, samples: [2, 14], craters: [6, 8, 18], rough: [1, 12, 16] },
  { battery: 20, samples: [4, 19], craters: [8, 11, 16, 23], rough: [13, 17, 21] },
];

export const BRIDGE_BLUEPRINTS = [
  { span: 5, load: 2, beams: [2, 3, 4], piers: 1 },
  { span: 6, load: 3, beams: [2, 3, 4], piers: 1 },
  { span: 7, load: 4, beams: [1, 2, 3, 5], piers: 2 },
  { span: 8, load: 4, beams: [2, 3, 4, 5], piers: 2 },
  { span: 9, load: 5, beams: [2, 3, 4, 5], piers: 2 },
];
export const beamCapacity = (length: number) => 8 - length;
