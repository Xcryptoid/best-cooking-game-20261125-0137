// Sizzle House: every tuning number, colour, recipe and screen rectangle in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window, so no
// rule below depends on the screen size. Layout rectangles are shared by the renderer (drawing)
// and the input layer (hit-testing), so a click always lands where the picture shows it.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; the results screen shows when it runs out. */
export const SHIFT_SECONDS = 120;

/** How long a customer waits before storming out, and how often a new ticket can arrive. */
export const ORDER = {
  patience: 45,
  spawnEvery: 12,
  maxActive: 3,
  basePoints: 100,
  tipMax: 50,
  leavePenalty: 25,
};

/** Grill and pot: seconds to cook, then seconds of grace before the food burns. */
export const COOK = {
  grillSeconds: 6,
  potSeconds: 5,
  burnGrace: 8,
};

/** Ingredients. `station` names where a raw one must go before it can be plated. */
export const INGREDIENTS = {
  bun: { name: 'Bun', key: '1', station: null, color: '#e8b06a', dark: '#b97f3a' },
  pattyRaw: { name: 'Raw Patty', key: '2', station: 'grill', color: '#c65b4e', dark: '#8f3a30' },
  patty: { name: 'Grilled Patty', key: '2', station: null, color: '#7a4a2b', dark: '#54301a' },
  lettuce: { name: 'Lettuce', key: '3', station: null, color: '#7dc383', dark: '#4d9455' },
  tomato: { name: 'Tomato', key: '4', station: null, color: '#e5534b', dark: '#b03028' },
  cheese: { name: 'Cheese', key: '5', station: null, color: '#f2c94c', dark: '#c69a1e' },
  pasta: { name: 'Dry Pasta', key: '6', station: 'pot', color: '#f0d48a', dark: '#c2a254' },
  pastaCooked: { name: 'Pasta', key: '6', station: null, color: '#f7e3a1', dark: '#d9b968' },
  sauce: { name: 'Tomato Sauce', key: '7', station: null, color: '#d94f30', dark: '#a83720' },
};

/** The bins along the counter, in the order the player sees them. */
export const BINS = ['bun', 'pattyRaw', 'lettuce', 'tomato', 'cheese', 'pasta', 'sauce'];

/** The menu: three dishes, four ingredients each. A plate serves when its set matches a ticket. */
export const DISHES = {
  burger: {
    name: 'Sunny Burger',
    price: 100,
    recipe: ['bun', 'patty', 'lettuce', 'tomato'],
    blurb: 'Bun, grilled patty, lettuce, tomato',
  },
  pasta: {
    name: 'Garden Pasta',
    price: 100,
    recipe: ['pastaCooked', 'sauce', 'cheese', 'tomato'],
    blurb: 'Boiled pasta, sauce, cheese, tomato',
  },
  salad: {
    name: 'Forest Salad',
    price: 100,
    recipe: ['lettuce', 'tomato', 'cheese', 'sauce'],
    blurb: 'Lettuce, tomato, cheese, dressing',
  },
};
export const DISH_IDS = ['burger', 'pasta', 'salad'];

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-house.best';

/** Screen rectangles, in playfield coordinates. */
export const LAYOUT = {
  // Order board: three ticket slots pinned along the top.
  board: { x: 24, y: 16, w: 560, h: 118 },
  ticket: { w: 176, h: 102, gap: 12 },
  // Timer + score live top-right.
  hud: { x: 1024, y: 16, w: 232, h: 118 },
  // The counter: ingredient bins in a row.
  counter: { x: 24, y: 300, w: 832, h: 96 },
  bin: { w: 108, h: 88, gap: 11 },
  // Cooking stations, right of the counter.
  grill: { x: 888, y: 280, w: 170, h: 116 },
  pot: { x: 1078, y: 280, w: 170, h: 116 },
  // The assembly plate, big and central at the bottom.
  plate: { x: 340, y: 440, w: 600, h: 150 },
  plateSlot: { size: 104, gap: 24 },
  // Serve button and trash, flanking the plate.
  serve: { x: 980, y: 470, w: 180, h: 90 },
  trash: { x: 120, y: 470, w: 180, h: 90 },
  // The hand: what the player is carrying, bottom-left corner.
  hand: { x: 24, y: 600, w: 180, h: 96 },
};

export const PALETTE = {
  backdrop: '#2b1d16',
  wall: '#f3e2c7',
  wallStripe: '#e8cfa5',
  floor: '#8a5a3b',
  floorLine: '#6f4529',
  board: '#5d3a24',
  boardPaper: '#fff6e0',
  counter: '#a9703f',
  counterTop: '#c98d54',
  steel: '#b9c0c9',
  steelDark: '#8d949e',
  grill: '#3a3f47',
  flame: '#ff9d2e',
  flameCore: '#ffd23e',
  pot: '#4a5568',
  water: '#7ec8e3',
  plate: '#fdfdf8',
  plateRim: '#d8d2c4',
  text: '#2b1d16',
  textLight: '#fff6e0',
  muted: '#8b7d6b',
  good: '#4d9455',
  bad: '#d94f30',
  gold: '#f2c94c',
  ticket: '#fff6e0',
  ticketEdge: '#e0c98f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
