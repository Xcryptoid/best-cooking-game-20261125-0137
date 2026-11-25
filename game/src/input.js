// Keyboard and pointer input. Clicks are reported in playfield coordinates (the renderer
// scales the canvas, so the caller converts client pixels first); one-shot presses (serve,
// pause, restart) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

import { BINS, INGREDIENTS, LAYOUT } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_RESTART = 8;

const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['Space']);
const RESTART = new Set(['KeyR']);
const CONFIRM = new Set(['Enter']);

function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** Which bin rect a point falls in, or -1. */
export function binAt(x, y) {
  const c = LAYOUT.counter;
  for (let i = 0; i < BINS.length; i += 1) {
    const rect = { x: c.x + i * (LAYOUT.bin.w + LAYOUT.bin.gap), y: c.y, w: LAYOUT.bin.w, h: LAYOUT.bin.h };
    if (inside(rect, x, y)) return i;
  }
  return -1;
}

/** Which plate slot a point falls in, or -1. */
export function plateSlotAt(x, y) {
  const p = LAYOUT.plate;
  const total = 4 * LAYOUT.plateSlot.size + 3 * LAYOUT.plateSlot.gap;
  const startX = p.x + (p.w - total) / 2;
  const slotY = p.y + (p.h - LAYOUT.plateSlot.size) / 2 - 6;
  for (let i = 0; i < 4; i += 1) {
    const rect = { x: startX + i * (LAYOUT.plateSlot.size + LAYOUT.plateSlot.gap), y: slotY, w: LAYOUT.plateSlot.size, h: LAYOUT.plateSlot.size };
    if (inside(rect, x, y)) return i;
  }
  return -1;
}

/** Name the clickable zone a point falls in: bin index, grill, pot, plate slot, serve, trash. */
export function zoneAt(x, y) {
  const bin = binAt(x, y);
  if (bin >= 0) return { kind: 'bin', index: bin };
  if (inside(LAYOUT.grill, x, y)) return { kind: 'grill' };
  if (inside(LAYOUT.pot, x, y)) return { kind: 'pot' };
  const slot = plateSlotAt(x, y);
  if (slot >= 0) return { kind: 'plate', index: slot };
  if (inside(LAYOUT.serve, x, y)) return { kind: 'serve' };
  if (inside(LAYOUT.trash, x, y)) return { kind: 'trash' };
  return { kind: 'none' };
}

export function createInput(target, onClick) {
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (event.code.startsWith('Digit')) {
      const digit = Number(event.code.slice(5));
      const id = Object.keys(INGREDIENTS).find((key) => INGREDIENTS[key].key === String(digit) && BINS.includes(key));
      if (id) onClick({ kind: 'bin', index: BINS.indexOf(id) });
      else return;
    } else {
      return;
    }
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: nothing held here needs clearing.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    onClick(zoneAt(x, y));
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
