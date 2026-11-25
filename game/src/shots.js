// The screenshot scenes behind ?shot=start|play|serve|end. Each one sets the world to a fixed,
// hand-built state — real orders, real plate contents, real station progress — so the frame is
// what a short game really looks like, and the same seed always gives the same frame.
//   start — title screen over a quiet kitchen with one ticket waiting
//   play  — mid-shift: two tickets, a patty on the grill, a dish mid-assembly on the plate
//   serve — a finished dish on the plate, SERVE lit, timer still running
//   end   — the shift-results panel over the kitchen

import { ORDER, SHIFT_SECONDS } from './config.js';
import { STATION_COOKING, STATION_DONE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function setOrder(state, id, dish, patienceFrac) {
  state.orders.push({ id, dish, patience: ORDER.patience * patienceFrac, max: ORDER.patience });
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  state.orders = [];
  if (name === 'play') {
    setOrder(state, 1, 'burger', 0.72);
    setOrder(state, 2, 'pasta', 0.45);
    state.grill = { item: 'pattyRaw', state: STATION_COOKING, t: 3.6, seconds: 6 };
    state.pot = { item: 'pasta', state: STATION_COOKING, t: 2.1, seconds: 5 };
    state.plate = ['bun', 'lettuce'];
    state.hand = 'tomato';
    state.score = 240;
    state.served = 2;
    state.timeLeft = 87;
    state.elapsed = SHIFT_SECONDS - 87;
    state.message = 'Patty on the grill — 2 more for the burger!';
    state.messageT = 2.5;
    return { screen: SCREEN_PLAY, best: 310 };
  }
  if (name === 'serve') {
    setOrder(state, 1, 'burger', 0.58);
    state.grill = { item: 'pattyRaw', state: STATION_DONE, t: 0, seconds: 6 };
    state.plate = ['bun', 'patty', 'lettuce', 'tomato'];
    state.hand = null;
    state.score = 480;
    state.served = 4;
    state.combo = 2;
    state.timeLeft = 64;
    state.elapsed = SHIFT_SECONDS - 64;
    state.message = 'That burger matches ticket #1 — serve it!';
    state.messageT = 2.5;
    return { screen: SCREEN_PLAY, best: 520 };
  }
  if (name === 'end') {
    state.score = 760;
    state.served = 6;
    state.lost = 1;
    state.bestCombo = 3;
    state.timeLeft = 0;
    state.elapsed = SHIFT_SECONDS;
    state.over = true;
    return { screen: SCREEN_OVER, best: 760 };
  }
  // start (and any other name): a fresh kitchen, one ticket, title panel on top.
  setOrder(state, 1, 'pasta', 0.9);
  state.timeLeft = SHIFT_SECONDS;
  state.elapsed = 0;
  return { screen: SCREEN_TITLE, best: 0 };
}
