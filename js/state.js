// Central game state shared across modules
export let canvas = null;
export let ctx = null;
export let logDisplay = null;

export let entities = [];
export let manaGems = [];
export let antimanaGems = [];
export let landmines = [];
export let rays = [];
export let turrets = [];
export let turretShots = [];

export let gameActive = false;
export let diceInterval = null;
export let manaInterval = null;
export let coinInterval = null;

export let domainClashExplosions = [];
export let heresyImplosions = [];
export let logMessages = [];

export let abilities = {};
export let abilitiesLoaded = false;
export let debugMode = false;

export let stats = { p1: { mana: 0 }, p2: { mana: 0 } };
export let hexagonInquisitionAuras = [];

// Damage/healing/mana splashes - newest pushes older ones down
export let splashes = [];

export let frameCount = 0;

export function setFrameCount(val) {
  frameCount = val;
}

export function setEntities(next) {
  entities = next;
}

export function setDebugMode(val) {
  debugMode = val;
}

export function initDom() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) return false;
  ctx = canvas.getContext('2d');
  logDisplay = document.getElementById('log');
  return true;
}

export function setAbilities(data) {
  abilities = data;
  abilitiesLoaded = true;
}
