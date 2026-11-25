// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Every
// picture is drawn with canvas shapes — no image files, no network — so the screenshots are
// renders of this code and nothing else. Text that holds a number is rebuilt only when the
// number changes, so a frame allocates nothing.

import { BINS, DISHES, FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, SHIFT_SECONDS } from './config.js';
import { STATION_BURNT, STATION_COOKING, STATION_DONE, STATION_EMPTY } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const servedLabel = cachedLabel('Served ');
  const bestLabel = cachedLabel('Best ');
  const timeLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function plain(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(-size)) fonts.set(-size, `${size}px ${FONT}`);
    context.font = fonts.get(-size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  /** One ingredient, drawn as a little vector picture centred on (x, y), size s. */
  function drawIngredient(id, x, y, s) {
    const ing = INGREDIENTS[id];
    context.save();
    context.translate(x, y);
    if (id === 'bun') {
      context.fillStyle = ing.color;
      context.beginPath();
      context.arc(0, s * 0.2, s * 0.9, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = ing.dark;
      context.fillRect(-s * 0.9, s * 0.15, s * 1.8, s * 0.35);
      context.fillStyle = '#fff2cf';
      for (const [dx, dy] of [[-0.4, -0.35], [0, -0.55], [0.4, -0.35], [-0.2, -0.1], [0.25, -0.12]]) {
        context.beginPath();
        context.arc(dx * s, dy * s, s * 0.09, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'pattyRaw' || id === 'patty') {
      context.fillStyle = ing.color;
      roundRect(context, -s, -s * 0.45, s * 2, s * 0.9, s * 0.4);
      context.fill();
      context.strokeStyle = ing.dark;
      context.lineWidth = Math.max(2, s * 0.08);
      context.beginPath();
      for (const dx of [-0.5, 0, 0.5]) {
        context.moveTo(dx * s, -s * 0.4);
        context.lineTo(dx * s, s * 0.4);
      }
      context.stroke();
    } else if (id === 'lettuce') {
      context.fillStyle = ing.color;
      for (const [dx, dy, r] of [[-0.5, 0.1, 0.55], [0, -0.25, 0.6], [0.5, 0.1, 0.55], [0, 0.25, 0.55]]) {
        context.beginPath();
        context.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
        context.fill();
      }
      context.strokeStyle = ing.dark;
      context.lineWidth = Math.max(2, s * 0.07);
      context.beginPath();
      context.moveTo(0, -s * 0.6);
      context.lineTo(0, s * 0.55);
      context.stroke();
    } else if (id === 'tomato') {
      context.fillStyle = ing.color;
      context.beginPath();
      context.arc(0, s * 0.1, s * 0.85, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = ing.dark;
      context.beginPath();
      context.moveTo(0, -s * 0.55);
      context.lineTo(-s * 0.3, -s * 0.95);
      context.lineTo(0, -s * 0.75);
      context.lineTo(s * 0.3, -s * 0.95);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.beginPath();
      context.arc(-s * 0.3, -s * 0.25, s * 0.18, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'cheese') {
      context.fillStyle = ing.color;
      context.beginPath();
      context.moveTo(-s * 0.9, s * 0.6);
      context.lineTo(s * 0.9, s * 0.6);
      context.lineTo(0, -s * 0.8);
      context.closePath();
      context.fill();
      context.fillStyle = ing.dark;
      for (const [dx, dy] of [[-0.3, 0.25], [0.25, 0.3], [0, -0.15]]) {
        context.beginPath();
        context.arc(dx * s, dy * s, s * 0.13, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'pasta' || id === 'pastaCooked') {
      context.strokeStyle = ing.color;
      context.lineWidth = Math.max(3, s * 0.16);
      context.lineCap = 'round';
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.moveTo(-s * 0.8, i * s * 0.32);
        context.quadraticCurveTo(0, i * s * 0.32 + s * 0.35, s * 0.8, i * s * 0.32);
        context.stroke();
      }
      if (id === 'pastaCooked') {
        context.strokeStyle = 'rgba(255,255,255,0.7)';
        context.lineWidth = Math.max(2, s * 0.06);
        for (const dx of [-0.4, 0.1, 0.5]) {
          context.beginPath();
          context.moveTo(dx * s, -s * 0.9);
          context.quadraticCurveTo(dx * s + s * 0.15, -s * 1.3, dx * s, -s * 1.6);
          context.stroke();
        }
      }
    } else if (id === 'sauce') {
      context.fillStyle = ing.color;
      context.beginPath();
      context.arc(0, s * 0.1, s * 0.8, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = ing.dark;
      context.beginPath();
      context.arc(s * 0.25, s * 0.55, s * 0.22, 0, Math.PI * 2);
      context.arc(-s * 0.35, s * 0.5, s * 0.16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.beginPath();
      context.arc(-s * 0.3, -s * 0.3, s * 0.16, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawTicket(order, x, y) {
    const dish = DISHES[order.dish];
    const w = LAYOUT.ticket.w;
    const h = LAYOUT.ticket.h;
    context.fillStyle = PALETTE.ticket;
    roundRect(context, x, y, w, h, 8);
    context.fill();
    context.strokeStyle = PALETTE.ticketEdge;
    context.lineWidth = 2;
    context.stroke();
    const frac = Math.max(0, order.patience / order.max);
    context.fillStyle = frac > 0.5 ? PALETTE.good : frac > 0.25 ? PALETTE.gold : PALETTE.bad;
    roundRect(context, x + 10, y + h - 16, (w - 20) * frac, 8, 4);
    context.fill();
    text(dish.name, x + 10, y + 24, 19, PALETTE.text, 'left');
    plain(`#${order.id}`, x + w - 10, y + 22, 15, PALETTE.muted, 'right');
    dish.recipe.forEach((ing, i) => {
      drawIngredient(ing, x + 26 + i * 40, y + 58, 15);
    });
  }

  function drawBoard(state) {
    const b = LAYOUT.board;
    context.fillStyle = PALETTE.board;
    roundRect(context, b.x, b.y, b.w, b.h, 10);
    context.fill();
    text('ORDER BOARD', b.x + 16, b.y + 22, 15, PALETTE.textLight, 'left');
    if (state.orders.length === 0) {
      plain('No orders yet — the lunch rush is coming…', b.x + 16, b.y + 66, 17, PALETTE.textLight, 'left');
    }
    state.orders.forEach((order, i) => {
      drawTicket(order, b.x + 8 + i * (LAYOUT.ticket.w + LAYOUT.ticket.gap), b.y + 8);
    });
  }

  function drawHud(state) {
    const h = LAYOUT.hud;
    context.fillStyle = PALETTE.board;
    roundRect(context, h.x, h.y, h.w, h.h, 10);
    context.fill();
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const urgent = state.timeLeft <= 20;
    text(clock, h.x + h.w / 2, h.y + 44, 40, urgent ? '#ff8a6b' : PALETTE.textLight, 'center');
    plain('SHIFT TIMER', h.x + h.w / 2, h.y + 66, 13, PALETTE.muted, 'center');
    text(scoreLabel(state.score), h.x + 16, h.y + 100, 22, PALETTE.textLight, 'left');
    text(servedLabel(state.served), h.x + h.w - 16, h.y + 100, 22, PALETTE.gold, 'right');
  }

  function drawCounter(state) {
    const c = LAYOUT.counter;
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, c.x, c.y - 14, c.w, c.h + 14, 8);
    context.fill();
    context.fillStyle = PALETTE.counter;
    context.fillRect(c.x, c.y + c.h - 18, c.w, 18);
    text('INGREDIENTS — click a bin, or press its number key', c.x + 4, c.y - 22, 14, PALETTE.textLight, 'left');
    BINS.forEach((id, i) => {
      const x = c.x + i * (LAYOUT.bin.w + LAYOUT.bin.gap);
      const y = c.y;
      context.fillStyle = '#fff8ea';
      roundRect(context, x, y, LAYOUT.bin.w, LAYOUT.bin.h, 8);
      context.fill();
      context.strokeStyle = '#d8c9a8';
      context.lineWidth = 2;
      context.stroke();
      drawIngredient(id, x + LAYOUT.bin.w / 2, y + 36, 24);
      plain(INGREDIENTS[id].name, x + LAYOUT.bin.w / 2, y + 76, 14, PALETTE.text, 'center');
      plain(INGREDIENTS[id].key, x + 8, y + 16, 12, PALETTE.muted, 'left');
      if (state.hand === id) {
        context.strokeStyle = PALETTE.gold;
        context.lineWidth = 4;
        roundRect(context, x - 2, y - 2, LAYOUT.bin.w + 4, LAYOUT.bin.h + 4, 10);
        context.stroke();
      }
    });
  }

  function drawStation(which, station, elapsed) {
    const rect = which === 'grill' ? LAYOUT.grill : LAYOUT.pot;
    const isGrill = which === 'grill';
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 10);
    context.fill();
    context.fillStyle = isGrill ? PALETTE.grill : PALETTE.pot;
    roundRect(context, rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 28, 8);
    context.fill();
    if (isGrill) {
      // Flames lick under the grill while it cooks.
      const flicker = Math.sin(elapsed * 9) * 3;
      context.fillStyle = PALETTE.flame;
      for (const fx of [0.3, 0.5, 0.7]) {
        const fw = 16 + flicker * (fx === 0.5 ? 1 : -0.5);
        context.beginPath();
        context.moveTo(rect.x + rect.w * fx - fw / 2, rect.y + rect.h - 22);
        context.quadraticCurveTo(rect.x + rect.w * fx, rect.y + rect.h - 46 - flicker, rect.x + rect.w * fx + fw / 2, rect.y + rect.h - 22);
        context.closePath();
        context.fill();
      }
      context.fillStyle = PALETTE.flameCore;
      context.beginPath();
      context.arc(rect.x + rect.w * 0.5, rect.y + rect.h - 26, 7, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = PALETTE.water;
      roundRect(context, rect.x + 14, rect.y + 14, rect.w - 28, 26, 12);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.5)';
      for (const bx of [0.3, 0.55, 0.75]) {
        context.beginPath();
        context.arc(rect.x + rect.w * bx, rect.y + 26 + Math.sin(elapsed * 5 + bx * 9) * 3, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
    text(isGrill ? 'GRILL' : 'POT', rect.x + rect.w / 2, rect.y + rect.h - 6, 14, PALETTE.textLight, 'center');
    if (station.state === STATION_EMPTY) {
      plain(isGrill ? 'patty here' : 'pasta here', rect.x + rect.w / 2, rect.y + 52, 14, '#aab2bd', 'center');
      return;
    }
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + 52;
    if (station.state === STATION_BURNT) {
      context.fillStyle = '#1d1d1d';
      context.beginPath();
      context.arc(cx, cy, 24, 0, Math.PI * 2);
      context.fill();
      plain('BURNT — click to clear', cx, rect.y + 88, 13, '#ff8a6b', 'center');
      return;
    }
    drawIngredient(station.item, cx, cy, 26);
    if (station.state === STATION_COOKING) {
      const frac = Math.min(1, station.t / station.seconds);
      context.strokeStyle = 'rgba(255,255,255,0.25)';
      context.lineWidth = 6;
      context.beginPath();
      context.arc(cx, cy, 34, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = PALETTE.gold;
      context.beginPath();
      context.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      context.stroke();
    } else if (station.state === STATION_DONE) {
      text('READY!', cx, cy - 40, 16, PALETTE.gold, 'center');
      context.strokeStyle = PALETTE.good;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(cx, cy, 34, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawPlate(state) {
    const p = LAYOUT.plate;
    context.fillStyle = '#6f4529';
    roundRect(context, p.x - 12, p.y - 12, p.w + 24, p.h + 24, 14);
    context.fill();
    text('ASSEMBLY PLATE', p.x + 4, p.y - 20, 14, PALETTE.textLight, 'left');
    const total = 4 * LAYOUT.plateSlot.size + 3 * LAYOUT.plateSlot.gap;
    const startX = p.x + (p.w - total) / 2;
    const slotY = p.y + (p.h - LAYOUT.plateSlot.size) / 2 - 6;
    for (let i = 0; i < 4; i += 1) {
      const x = startX + i * (LAYOUT.plateSlot.size + LAYOUT.plateSlot.gap);
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.arc(x + LAYOUT.plateSlot.size / 2, slotY + LAYOUT.plateSlot.size / 2, LAYOUT.plateSlot.size / 2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.plateRim;
      context.lineWidth = 3;
      context.stroke();
      if (i < state.plate.length) {
        drawIngredient(state.plate[i], x + LAYOUT.plateSlot.size / 2, slotY + LAYOUT.plateSlot.size / 2, 30);
      }
    }
    plain('Click a slot to add what you hold — click a filled slot to take it back', p.x + p.w / 2, p.y + p.h - 8, 13, '#d8c9a8', 'center');
  }

  function drawServe(state, matches) {
    const s = LAYOUT.serve;
    context.fillStyle = matches ? PALETTE.good : '#5a5148';
    roundRect(context, s.x, s.y, s.w, s.h, 12);
    context.fill();
    context.strokeStyle = matches ? '#2f6b35' : '#3a342e';
    context.lineWidth = 3;
    context.stroke();
    text('SERVE', s.x + s.w / 2, s.y + 44, 30, '#ffffff', 'center');
    plain('or press Space', s.x + s.w / 2, s.y + 70, 14, 'rgba(255,255,255,0.75)', 'center');
    const t = LAYOUT.trash;
    context.fillStyle = '#7a3b2e';
    roundRect(context, t.x, t.y, t.w, t.h, 12);
    context.fill();
    text('TRASH', t.x + t.w / 2, t.y + 44, 26, '#ffffff', 'center');
    plain('clear hand / plate', t.x + t.w / 2, t.y + 70, 14, 'rgba(255,255,255,0.75)', 'center');
  }

  function drawHand(state) {
    const h = LAYOUT.hand;
    context.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(context, h.x, h.y, h.w, h.h, 10);
    context.fill();
    plain('HOLDING', h.x + 14, h.y + 22, 13, PALETTE.muted, 'left');
    if (state.hand === null) {
      plain('empty hands', h.x + 14, h.y + 60, 17, PALETTE.textLight, 'left');
    } else {
      drawIngredient(state.hand, h.x + 36, h.y + 58, 24);
      plain(INGREDIENTS[state.hand].name, h.x + 68, h.y + 64, 17, PALETTE.textLight, 'left');
    }
  }

  function drawMessage(state) {
    if (state.messageT <= 0 || state.message === '') return;
    const alpha = Math.min(1, state.messageT);
    context.save();
    context.globalAlpha = alpha;
    text(state.message, FIELD.width / 2, 640, 22, PALETTE.gold, 'center');
    context.restore();
  }

  function drawKitchen(state, elapsed) {
    // Wall, wainscot and floor.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 280);
    context.fillStyle = PALETTE.wallStripe;
    for (let x = 0; x < FIELD.width; x += 96) context.fillRect(x, 0, 48, 280);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 280, FIELD.width, FIELD.height - 280);
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 2;
    for (let y = 320; y < FIELD.height; y += 56) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    // A sunny window and a hanging lamp, for warmth.
    context.fillStyle = '#bfe3f2';
    roundRect(context, 640, 30, 150, 100, 8);
    context.fill();
    context.strokeStyle = '#8a5a3b';
    context.lineWidth = 4;
    context.stroke();
    context.strokeStyle = '#8a5a3b';
    context.beginPath();
    context.moveTo(715, 30);
    context.lineTo(715, 130);
    context.moveTo(640, 80);
    context.lineTo(790, 80);
    context.stroke();
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.arc(680, 60, 18, 0, Math.PI * 2);
    context.fill();
    drawBoard(state);
    drawHud(state);
    drawCounter(state);
    drawStation('grill', state.grill, elapsed);
    drawStation('pot', state.pot, elapsed);
    drawPlate(state);
    drawServe(state, plateMatches(state));
    drawHand(state);
    drawMessage(state);
  }

  function plateMatches(state) {
    if (state.plate.length === 0) return false;
    return state.orders.some((order) => {
      const recipe = DISHES[order.dish].recipe;
      if (recipe.length !== state.plate.length) return false;
      const a = [...recipe].sort();
      const b = [...state.plate].sort();
      return a.every((v, i) => v === b[i]);
    });
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(0,0,0,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.boardPaper;
    roundRect(context, x, y, PANEL.width, height, 12);
    context.fill();
    context.strokeStyle = PALETTE.ticketEdge;
    context.lineWidth = 3;
    context.stroke();
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      plain(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, '#b03028', 'center');
  }

  const TITLE_LINES = [
    'Run the lunch rush at Sizzle House: read the tickets,',
    'cook patties on the grill, boil pasta in the pot,',
    'stack each dish on the plate and serve before the',
    'customer\'s patience runs out. Tips for fast serves!',
    'Click bins, grill, pot and plate — or keys 1-7, Space to serve.',
    '',
  ];
  const PAUSED_LINES = ['The stove is off and the tickets are waiting.'];

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, elapsed = 0) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state, elapsed);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('SIZZLE HOUSE', TITLE_LINES, 'Click or press Enter to start');
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
      return;
    }
    if (screen === SCREEN_OVER) {
      const overLines = [
        `${scoreLabel(state.score)}  •  ${state.served} dishes served`,
        `${state.lost} customer${state.lost === 1 ? '' : 's'} walked out  •  best combo ${state.bestCombo}`,
        '',
        bestLabel(best),
      ];
      drawPanel('Shift over!', overLines, 'Press R to run another shift');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, drawIngredient };
}
