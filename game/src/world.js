// The game's rules and state, with no drawing and no browser in it: the shift clock, the order
// board, the two cooking stations, the assembly plate, the player's hand, scoring and tips.
// step() advances one fixed step; the click methods below are what the input layer calls, and
// each returns a short word naming what happened, so the caller can play a sound for it.

import { BINS, COOK, DISHES, DISH_IDS, INGREDIENTS, ORDER, SHIFT_SECONDS } from './config.js';

export const STATION_EMPTY = 'empty';
export const STATION_COOKING = 'cooking';
export const STATION_DONE = 'done';
export const STATION_BURNT = 'burnt';

/** What a raw ingredient becomes once its station finishes with it. */
const COOKED = { pattyRaw: 'patty', pasta: 'pastaCooked' };

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

export function createWorld(random) {
  let nextOrderId = 1;
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    hand: null,
    grill: { item: null, state: STATION_EMPTY, t: 0 },
    pot: { item: null, state: STATION_EMPTY, t: 0 },
    plate: [],
    orders: [],
    spawnTimer: 4,
    message: '',
    messageT: 0,
    over: false,
  };

  function say(text) {
    state.message = text;
    state.messageT = 2.5;
  }

  function spawnOrder() {
    if (state.orders.length >= ORDER.maxActive) return;
    const dish = DISH_IDS[Math.floor(random() * DISH_IDS.length)];
    state.orders.push({ id: nextOrderId, dish, patience: ORDER.patience, max: ORDER.patience });
    nextOrderId += 1;
  }

  function reset() {
    nextOrderId = 1;
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.score = 0;
    state.served = 0;
    state.lost = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.hand = null;
    state.grill = { item: null, state: STATION_EMPTY, t: 0 };
    state.pot = { item: null, state: STATION_EMPTY, t: 0 };
    state.plate = [];
    state.orders = [];
    state.spawnTimer = 4;
    state.message = '';
    state.messageT = 0;
    state.over = false;
    spawnOrder();
  }

  /** Take an ingredient from a counter bin into the hand (swaps if already holding one). */
  function pickIngredient(id) {
    if (!BINS.includes(id)) return 'none';
    const held = state.hand;
    state.hand = id;
    return held === null ? 'pick' : 'swap';
  }

  /** Put the held raw ingredient onto its station, or pick a finished one back up. */
  function useStation(which) {
    const station = which === 'grill' ? state.grill : state.pot;
    const seconds = which === 'grill' ? COOK.grillSeconds : COOK.potSeconds;
    if (station.state === STATION_EMPTY) {
      if (state.hand === null) return 'none';
      const cooked = COOKED[state.hand];
      const wants = which === 'grill' ? 'pattyRaw' : 'pasta';
      if (state.hand !== wants) return 'wrong';
      station.item = state.hand;
      station.state = STATION_COOKING;
      station.t = 0;
      station.seconds = seconds;
      state.hand = null;
      return 'start';
    }
    if (station.state === STATION_COOKING) return 'cooking';
    if (station.state === STATION_DONE) {
      state.hand = COOKED[station.item];
      station.item = null;
      station.state = STATION_EMPTY;
      station.t = 0;
      return 'take';
    }
    // Burnt: the food is ruined; pick it up and it goes straight in the bin.
    station.item = null;
    station.state = STATION_EMPTY;
    station.t = 0;
    say('Burnt! Watch the timer next time.');
    return 'burnt';
  }

  /** Put the held ingredient on the plate, or take a plated one back into the hand. */
  function usePlateSlot(index) {
    if (state.hand !== null) {
      if (state.plate.length >= 4) return 'full';
      if (state.plate.includes(state.hand)) return 'dup';
      state.plate.push(state.hand);
      state.hand = null;
      return 'place';
    }
    if (index >= 0 && index < state.plate.length) {
      state.hand = state.plate[index];
      state.plate.splice(index, 1);
      return 'take';
    }
    return 'none';
  }

  /** Throw away what is in the hand, or clear the whole plate. */
  function trash() {
    if (state.hand !== null) {
      state.hand = null;
      return 'trash';
    }
    if (state.plate.length > 0) {
      state.plate = [];
      return 'clear';
    }
    return 'none';
  }

  /** Serve the plate if it matches an open ticket; otherwise say what is missing. */
  function serve() {
    if (state.plate.length === 0) return 'empty';
    const match = state.orders.find((order) => sameSet(state.plate, DISHES[order.dish].recipe));
    if (!match) {
      const wanted = state.orders.map((order) => DISHES[order.dish].name).join(', ');
      say(state.orders.length === 0 ? 'No orders yet!' : `Nobody ordered that. Wanted: ${wanted}.`);
      return 'nomatch';
    }
    const tip = Math.round((match.patience / match.max) * ORDER.tipMax);
    const comboBonus = state.combo * 5;
    const earned = ORDER.basePoints + tip + comboBonus;
    state.score += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.orders = state.orders.filter((order) => order.id !== match.id);
    state.plate = [];
    say(`Served ${DISHES[match.dish].name}! +${earned} (tip ${tip}${comboBonus > 0 ? `, combo +${comboBonus}` : ''})`);
    return 'served';
  }

  /** One fixed step: the clock, the stations, the tickets' patience, new arrivals. */
  function step(dt) {
    if (state.over) return;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    if (state.messageT > 0) state.messageT -= dt;

    for (const station of [state.grill, state.pot]) {
      if (station.state !== STATION_COOKING && station.state !== STATION_DONE) continue;
      station.t += dt;
      if (station.state === STATION_COOKING && station.t + 1e-6 >= station.seconds) {
        station.state = STATION_DONE;
        station.t = 0;
      } else if (station.state === STATION_DONE && station.t + 1e-6 >= COOK.burnGrace) {
        station.state = STATION_BURNT;
        station.t = 0;
        say('Something burned! Clear the station.');
      }
    }

    for (const order of state.orders) order.patience -= dt;
    const walked = state.orders.filter((order) => order.patience <= 0);
    if (walked.length > 0) {
      state.orders = state.orders.filter((order) => order.patience > 0);
      state.lost += walked.length;
      state.combo = 0;
      state.score = Math.max(0, state.score - ORDER.leavePenalty * walked.length);
      say(`A customer walked out! -${ORDER.leavePenalty * walked.length}`);
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer = ORDER.spawnEvery;
    }

    if (state.timeLeft <= 0) state.over = true;
  }

  reset();
  return { state, reset, step, pickIngredient, useStation, usePlateSlot, trash, serve };
}
