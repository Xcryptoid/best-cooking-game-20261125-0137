// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the ticket order. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, BINS, SHIFT_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_SERVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 0.6);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. The lunch rush is on — 2 minutes!');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. ${world.state.served} dishes served. Best ${best}.`);
  }

  function playSound(result) {
    if (result === 'pick' || result === 'take') audio.pick();
    else if (result === 'place' || result === 'start') audio.place();
    else if (result === 'served') audio.ding();
    else if (result === 'nomatch' || result === 'wrong' || result === 'full' || result === 'dup') audio.error();
    else if (result === 'burnt') audio.walkout();
  }

  function handleClick(zone) {
    if (screen !== SCREEN_PLAY) {
      if (zone.kind !== 'none') {
        audio.unlock();
        if (screen === SCREEN_TITLE) startGame();
        else if (screen === SCREEN_OVER) startGame();
      }
      return;
    }
    audio.unlock();
    let result = 'none';
    if (zone.kind === 'bin') result = world.pickIngredient(BINS[zone.index]);
    else if (zone.kind === 'grill') result = world.useStation('grill');
    else if (zone.kind === 'pot') result = world.useStation('pot');
    else if (zone.kind === 'plate') result = world.usePlateSlot(zone.index);
    else if (zone.kind === 'serve') result = world.serve();
    else if (zone.kind === 'trash') result = world.trash();
    playSound(result);
    if (result === 'served' && world.state.message !== '') announce(world.state.message);
    else if (result === 'nomatch') announce(world.state.message);
  }

  const input = createInput(canvas, handleClick);

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_SERVE && screen === SCREEN_PLAY) {
      audio.unlock();
      const result = world.serve();
      playSound(result);
      if (result === 'served' || result === 'nomatch') announce(world.state.message);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const before = world.state.served;
    const lostBefore = world.state.lost;
    world.step(STEP);
    if (world.state.lost > lostBefore) audio.walkout();
    if (world.state.served !== before) announce(world.state.message);
    if (world.state.over) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const cooking = world.state.grill.state === 'cooking' || world.state.pot.state === 'cooking';
    audio.setSizzle(cooking && screen === SCREEN_PLAY);
    renderer.draw(world.state, screen, best, world.state.elapsed);
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle House. Click or press Enter to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
