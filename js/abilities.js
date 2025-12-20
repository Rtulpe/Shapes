import { abilities, abilitiesLoaded, entities, landmines, rays, stats, hexagonInquisitionAuras, heresyImplosions, frameCount, turrets, turretShots, splashes } from './state.js';
import { setAbilities, setEntities } from './state.js';
import { Shape } from './shape.js';
import { SHAPE_DATA } from './config.js';
import { addLog, updateLegends } from './ui.js';

// Effect handler registry - add new effects here
const effectHandlers = {};

// Register all effect handlers
function registerEffectHandlers() {
  effectHandlers['property'] = handlePropertyEffect;
  effectHandlers['patriotism'] = handlePatriotism;
  effectHandlers['spawnCopies'] = handleSpawnCopies;
  effectHandlers['spawnMine'] = handleSpawnMine;
  effectHandlers['spawnRay'] = handleSpawnRay;
  effectHandlers['spawnTurret'] = handleSpawnTurret;
  effectHandlers['insideJob'] = handleInsideJob;
  effectHandlers['doubleMana'] = handleDoubleMana;
  effectHandlers['manaBoostDamage'] = handleManaBoostDamage;
  effectHandlers['createDomain'] = handleCreateDomain;
  effectHandlers['hijackEnemySkill'] = handleHijackEnemySkill;
  effectHandlers['probability'] = handleProbability;
  effectHandlers['ddos'] = handleDDOS;
  effectHandlers['wonderOfYou'] = handleWonderOfYou;
  effectHandlers['calculation'] = handleCalculation;
  effectHandlers['addToAuraList'] = handleAddToAuraList;
}

// Effect handler functions
function handlePropertyEffect(context) {
  const { caster, effect, duration, mySide, mySideIncludingPhantoms } = context;
  
  // Handle modifier-based effects (like Dogma: +2 defense)
  if (effect.modifier !== undefined && effect.property) {
    const prop = effect.property;
    console.log('Applying permanent modifier:', prop, '+', effect.modifier);
    caster[prop] += effect.modifier;
    
    // Set visual effect for dogma
    if (prop === 'defense') {
      caster.dogmaActive = true;
      setTimeout(() => {
        caster.dogmaActive = false;
      }, 3000);
    }
    return;
  }
  
  if (effect.value === undefined) return;
  const prop = effect.property;
  if (duration) {
    if (prop === 'blitzActive') {
      console.log('Applying blitz to', mySideIncludingPhantoms.length, 'units');
      mySideIncludingPhantoms.forEach(t => {
        t[prop] = effect.value;
        setTimeout(() => { t[prop] = false; }, duration);
      });
    } else if (effect.count === 'allSameSide') {
      console.log('Applying effect to', mySide.length, 'units');
      const targets = mySide;
      targets.forEach(t => {
        t[prop] = effect.value;
        setTimeout(() => { t[prop] = false; }, duration);
      });
    } else if (prop === 'patriotism') {
      // Special handling for patriotism - it has its own handler logic
      console.log('Applying patriotism buff');
      handlePatriotism(context);
    } else {
      console.log('Applying', prop, '=', effect.value, 'to caster');
      caster[prop] = effect.value;
      setTimeout(() => { caster[prop] = false; }, duration);
    }
  } else {
    if (prop === 'poisonAttackActive') {
      console.log('Propagating poison to', mySideIncludingPhantoms.length, 'phantoms');
      mySideIncludingPhantoms.forEach(t => { 
        t[prop] = effect.value;
        // Clear visual flag after 5 seconds for poison attack
        if (effect.value && prop === 'poisonAttackActive') {
          setTimeout(() => { t[prop] = false; }, 5000);
        }
      });
    } else {
      console.log('Setting', prop, '=', effect.value);
      caster[prop] = effect.value;
    }
  }
}

function handlePatriotism(context) {
  const { caster, duration } = context;
  if (duration) {
    caster.baseAtk += 1; caster.atk += 1;
    caster.defense += 1;
    caster.baseSpeed += 1;
    
    // Visual effect
    caster.patriotismActive = true;
    // Track persistence: if a foreign base is destroyed while active,
    // the temporary boosts become permanent and we skip revert.
    if (caster._patriotismPersisted === undefined) caster._patriotismPersisted = false;
    
    setTimeout(() => {
      if (caster._patriotismPersisted) {
        // Persistence achieved: leave boosted stats as-is; only clear visual flag
        caster.patriotismActive = false;
      } else {
        // Revert temporary boosts
        caster.baseAtk -= 1; caster.atk = Math.max(caster.baseAtk, caster.atk - 1);
        caster.defense -= 1;
        caster.baseSpeed -= 1;
        caster.patriotismActive = false;
      }
    }, duration);
  }
}

function handleSpawnCopies(context) {
  const { caster, effect, mySideIncludingPhantoms } = context;
  console.log('Spawning phantoms, count effect =', effect.count);
  const targets = effect.count === 'allSameSide' ? mySideIncludingPhantoms : [caster];
  targets.forEach(t => {
    const copy = new Shape(caster.type, t.x + 20, t.y + 20, t.isP1, effect.phantom);
    copy.isHeretic = caster.isHeretic === true;
    entities.push(copy);
  });
  console.log('Spawned', targets.length, 'phantom(s), total entities =', entities.length);
}

function handleSpawnMine(context) {
  const { caster, effect, isHijacked } = context;
  console.log('Spawning mine');
  landmines.push({ x: caster.x, y: caster.y, isP1: caster.isP1, dmg: caster.atk * effect.damageMultiplier, isHijacked });
}

function handleSpawnRay(context) {
  const { caster, effect, targetSide, isHijacked, abilityId } = context;
  if (!targetSide[0]) return;
  console.log('Spawning ray');
  const t = targetSide[0];
  const angle = Math.atan2(t.y - caster.y, t.x - caster.x);
  rays.push({ 
    x: caster.x, 
    y: caster.y, 
    vx: Math.cos(angle) * 6, 
    vy: Math.sin(angle) * 6, 
    isP1: caster.isP1, 
    dmg: caster.atk * effect.damageMultiplier, 
    isHijacked: isHijacked,
    fromStarRay: abilityId === 'starRay'
  });
}

function handleSpawnTurret(context) {
  const { caster } = context;
  console.log('Spawning turret');
  turrets.push({
    x: caster.x,
    y: caster.y,
    isP1: caster.isP1,
    hp: 2,
    lastShot: frameCount,
    baseDmg: caster.atk,
    purpleOutline: caster.type === 'hexagon',
    isHeretic: caster.isHeretic === true
  });
  addLog('FOREIGN BASE DEPLOYED');
}

function handleInsideJob(context) {
  const { caster, targetSide } = context;
  console.log('INSIDE JOB triggered');
  const enemy = targetSide.find(e => !e.isPhantom);
  if (enemy) {
    let swapped = false;
    
    // Visual effect
    caster.insideJobActive = true;
    caster.insideJobStart = frameCount;
    enemy.insideJobActive = true;
    enemy.insideJobStart = frameCount;
    
    if (enemy.hp > caster.hp) {
      [enemy.hp, caster.hp] = [caster.hp, enemy.hp];
      swapped = true;
      console.log('Inside Job: Swapped HP');
    } else if (stats[enemy.isP1 ? 'p1' : 'p2'].mana > stats[caster.isP1 ? 'p1' : 'p2'].mana) {
      const eKey = enemy.isP1 ? 'p1' : 'p2';
      const cKey = caster.isP1 ? 'p1' : 'p2';
      [stats[eKey].mana, stats[cKey].mana] = [stats[cKey].mana, stats[eKey].mana];
      swapped = true;
      console.log('Inside Job: Swapped mana');
    }
    if (swapped) addLog('INSIDE JOB SUCCESS'); else addLog('INSIDE JOB NO EFFECT');
  }
}

function handleDoubleMana(context) {
  const { caster, effect, manaKey, isHijacked } = context;
  stats[manaKey].mana *= 2;
  
  // Visual effect for Interest/Usury
  caster.interestActive = true;
  setTimeout(() => {
    caster.interestActive = false;
  }, 5000);
  
  if (effect.autocast && stats[manaKey].mana >= 15) {
    stats[manaKey].mana -= 15;
    effect.autocast.forEach(type => {
      const skillKey = type === 'buff' ? 'buff' : 'atk';
      const sourceType = isHijacked ? 'star' : caster.type;
      const abilityId = SHAPE_DATA[sourceType].skills[skillKey];
      executeAbility(abilityId, caster, isHijacked, null);
    });
  }
}

function handleManaBoostDamage(context) {
  const { caster, manaKey } = context;
  const manaUsed = Math.floor(stats[manaKey].mana * 0.5);
  stats[manaKey].mana -= manaUsed;
  caster.currentManaBoost = manaUsed * 0.01;
  
  // Visual effect
  caster.condensationActive = true;
  setTimeout(() => {
    caster.condensationActive = false;
  }, 3000);
}

function handleCreateDomain(context) {
  const { caster, effect } = context;
  const durationFrames = Math.max(1, Math.round((effect.duration || 10000) / (1000 / 60)));
  caster.activeDomains.push({ circle: caster, radius: caster.size * 3, startFrame: frameCount, duration: durationFrames, lastDamageFrame: frameCount });
  console.log('DOMAIN EXPANSION created, duration frames =', durationFrames);
  addLog('DOMAIN EXPANSION ACTIVATED!');
}

function handleHijackEnemySkill(context) {
  const { caster, targetSide } = context;
  const targetEnemy = targetSide.find(e => !e.isPhantom);
  
  // Visual effect
  caster.interventionActive = true;
  setTimeout(() => {
    caster.interventionActive = false;
  }, 3000);
  
  if (!targetEnemy) {
    addLog('HIJACK FAILED: NO VALID TARGET!');
  } else if (targetEnemy.type === 'hexagon') {
    performHeresy(targetEnemy);
  } else if (targetEnemy.wonderOfYouActive && frameCount <= targetEnemy.wonderOfYouUntil && caster.type === 'hexagon') {
    performHeresy(caster);
    addLog('WONDER OF YOU: HEXAGON TURNED HERETIC!');
  } else if (stats[targetEnemy.isP1 ? 'p1' : 'p2'].mana <= 0) {
    addLog('HIJACK FAILED: ENEMY HAS NO MANA!');
  } else {
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 3);
      const skillKeys = ['buff', 'atk', 'ult'];
      const skillKey = skillKeys[roll];
      const enemyAbilityId = SHAPE_DATA[targetEnemy.type].skills[skillKey];
      const enemyAbility = abilities[enemyAbilityId];
      const enemyKey = targetEnemy.isP1 ? 'p1' : 'p2';
      if (stats[enemyKey].mana >= enemyAbility.cost) {
        stats[enemyKey].mana -= enemyAbility.cost;
        executeAbility(enemyAbilityId, caster, true, targetEnemy.isP1);
        addLog('HIJACKED: ' + enemyAbility.name.toUpperCase());
      } else {
        addLog('HIJACK FAILED: INSUFFICIENT MANA!');
      }
    }, 500);
  }
}

function handleProbability(context) {
  const { caster } = context;
  console.log('PROBABILITY ALTERATION triggered');
  
  // Set visual effect flag
  caster.probabilityActive = true;
  caster.probabilityUntil = frameCount + 180; // 3 seconds
  setTimeout(() => {
    caster.probabilityActive = false;
  }, 3000);
  
  const player = caster;
  const playerName = player.isP1 ? 'P1' : 'P2';
  const outcome = Math.floor(Math.random() * 4);
  console.log('Probability outcome:', outcome);
  switch (outcome) {
    case 0:
      player.defense += 5;
      addLog(`${playerName}: PROBABILITY ALTERATION: +5 DEFENSE`);
      console.log('  -> +5 DEFENSE');
      break;
    case 1:
      player.baseAtk += 2; player.atk += 2;
      addLog(`${playerName}: PROBABILITY ALTERATION: +2 DAMAGE`);
      console.log('  -> +2 DAMAGE');
      break;
    case 2:
      {
        const skillTypes = ['Buff', 'Attack', 'Ultimate'];
        const randomSkill = skillTypes[Math.floor(Math.random() * 3)];
        activateSkill(player, randomSkill);
        const skillKey = randomSkill === 'Buff' ? 'buff' : randomSkill === 'Attack' ? 'atk' : 'ult';
        const abilityId = SHAPE_DATA[player.type].skills[skillKey];
        const ability = abilities[abilityId];
        addLog(`${playerName}: PROBABILITY ALTERATION: ${ability.name.toUpperCase()}`);
        console.log('  -> Random skill:', ability.name);
      }
      break;
    case 3:
      player.hp = Math.min(player.hp + 10, player.maxHp);
      splashes.push({
        x: player.x,
        y: player.y,
        text: '+10',
        color: '#44ff44',
        startFrame: frameCount,
        duration: 60,
        type: 'heal',
        isP1: player.isP1
      });
      addLog(`${playerName}: PROBABILITY ALTERATION: +10 HP`);
      console.log('  -> +10 HP');
      break;
  }
}

function handleDDOS(context) {
  const { targetSide, duration } = context;
  const enemy = targetSide.find(e => !e.isPhantom);
  console.log('DDOS DEBUG: enemy found =', enemy ? 'YES' : 'NO', enemy);
  if (enemy) {
    let disabledSomething = false;
    
    console.log('DDOS DEBUG: entities.length =', entities.length);
    const allPhantoms = entities.filter(e => e.isPhantom);
    console.log('DDOS DEBUG: all phantoms =', allPhantoms.length);
    
    // Check and disable all pending effects
    if (enemy.poisoned > 0) {
      enemy.poisoned = 0;
      addLog('DDOS: POISON DISABLED');
      disabledSomething = true;
    }
    if (enemy.isShielded) {
      enemy.isShielded = false;
      addLog('DDOS: SHIELD DISABLED');
      disabledSomething = true;
    }
    if (enemy.blitzActive) {
      enemy.blitzActive = false;
      addLog('DDOS: BLITZ DISABLED');
      disabledSomething = true;
    }
    if (enemy.inquisitionActive) {
      enemy.inquisitionActive = false;
      addLog('DDOS: INQUISITION DISABLED');
      disabledSomething = true;
    }
    
    // Remove all phantoms
    const enemyPhantoms = entities.filter(e => e.isP1 === enemy.isP1 && e.isPhantom);
    console.log('DDOS DEBUG: enemy.isP1 =', enemy.isP1, 'enemy phantoms =', enemyPhantoms.length);
    console.log('DDOS DEBUG: entities before remove =', entities.length);
    if (enemyPhantoms.length > 0) {
      for (let i = entities.length - 1; i >= 0; i--) {
        console.log('Checking entity', i, ': isP1=', entities[i].isP1, 'isPhantom=', entities[i].isPhantom);
        if (entities[i].isP1 === enemy.isP1 && entities[i].isPhantom) {
          console.log('REMOVING phantom at index', i);
          entities.splice(i, 1);
        }
      }
      console.log('DDOS DEBUG: entities after remove =', entities.length);
      addLog(`DDOS: ${enemyPhantoms.length} PHANTOM(S) DISABLED`);
      disabledSomething = true;
    }
    
    // Remove all rays
    const enemyRays = rays.filter(r => r.isP1 === enemy.isP1);
    if (enemyRays.length > 0) {
      rays.splice(0, rays.length, ...rays.filter(r => r.isP1 !== enemy.isP1));
      addLog('DDOS: ALL RAYS DISABLED');
      disabledSomething = true;
    }
    
    // Remove all mines
    const enemyMines = landmines.filter(m => m.isP1 === enemy.isP1);
    if (enemyMines.length > 0) {
      landmines.splice(0, landmines.length, ...landmines.filter(m => m.isP1 !== enemy.isP1));
      addLog('DDOS: ALL MINES DISABLED');
      disabledSomething = true;
    }
    
    // Remove all turrets
    const enemyTurrets = turrets.filter(t => t.isP1 === enemy.isP1);
    console.log('DDOS: About to remove', enemyTurrets.length, 'turrets owned by', enemy.isP1 ? 'P1' : 'P2');
    if (enemyTurrets.length > 0) {
      // Log turret owners before removal
      enemyTurrets.forEach((t, idx) => console.log(`  Turret ${idx}: isP1=${t.isP1}`));
      
      // Remove only the enemy's turrets
      turrets.splice(0, turrets.length, ...turrets.filter(t => t.isP1 !== enemy.isP1));
      addLog('DDOS: ALL TURRETS DISABLED');
      disabledSomething = true;
      
      // Patriotism persistence: when YOUR base is destroyed while YOU have patriotism
      // "Sons mourn the LOSS" = your own foreign base destroyed
      const patriots = entities.filter(e => e.patriotismActive && !e.isPhantom);
      console.log('DDOS: Found', patriots.length, 'patriots with active patriotism:');
      patriots.forEach(p => console.log(`  Patriot: ${p.type} isP1=${p.isP1}`));
      
      const affectedPatriots = patriots.filter(p => enemyTurrets.some(t => t.isP1 === p.isP1));
      console.log('DDOS: Filtered to', affectedPatriots.length, 'patriots on SAME side as removed turrets');
      
      if (affectedPatriots.length > 0) {
        affectedPatriots.forEach(p => {
          p._patriotismPersisted = true; // keep temporary boosts permanently
          p.patriotismActive = false;    // turn off the visual effect now
          p.mourningActive = true;       // mourning visual for fallen base
          setTimeout(() => { p.mourningActive = false; }, 3000);
        });
        addLog('SONS OF THE PATRIOTS MORN THE LOSS');
      } else {
        console.log('✗ Patriotism not persisted: destroyed turrets not owned by any patriot');
      }
    }
    
    // If nothing was disabled, silence the enemy
    if (!disabledSomething) {
      enemy.silenced = true;
      addLog('DDOS: ENEMY SILENCED');
      setTimeout(() => {
        enemy.silenced = false;
      }, duration);
    }
  }
}

function handleWonderOfYou(context) {
  const { caster, duration } = context;
  console.log('WONDER OF YOU activated, duration =', duration);
  caster.wonderOfYouActive = true;
  caster.wonderOfYouUntil = frameCount + Math.max(1, Math.round(duration / (1000 / 60)));
  addLog('WONDER OF YOU ACTIVATED');
  setTimeout(() => {
    caster.wonderOfYouActive = false;
    console.log('WONDER OF YOU deactivated');
  }, duration);
}

function handleCalculation(context) {
  const { caster, effect } = context;
  if (effect.calculation === 'missingHealthBonus') {
    const bonusAmount = Math.floor(((caster.maxHp - caster.hp) / caster.maxHp) * 10) * 0.5;
    caster.sufferingBonus += bonusAmount;
    
    // Visual effect - set flag and clear after 5 seconds
    caster.sufferingVisual = true;
    caster.sufferingVisualUntil = frameCount + 300; // 5 seconds at 60fps
    setTimeout(() => {
      caster.sufferingVisual = false;
    }, 5000);
  }
}

function handleAddToAuraList(context) {
  const { caster } = context;
  hexagonInquisitionAuras.push(caster);
}

export async function loadAbilities() {
  const res = await fetch('abilities.json');
  const data = await res.json();
  setAbilities(data);
}

export function activateSkill(shape, type, isHijacked = false) {
  // Check if shape is silenced
  if (shape.silenced) {
    const skillKey = type === 'Buff' ? 'buff' : type === 'Attack' ? 'atk' : 'ult';
    const abilityId = SHAPE_DATA[shape.type].skills[skillKey];
    const ability = abilities[abilityId];
    const abilityName = ability ? ability.name.toUpperCase() : type.toUpperCase();
    addLog(`${shape.isP1 ? 'P1' : 'P2'}: SILENCED - CANNOT CAST ${abilityName}!`);
    return;
  }
  
  // Visual feedback for ability activation
  const abilityBox = document.getElementById(shape.isP1 ? 'p1-ability' : 'p2-ability');
  if (abilityBox) {
    abilityBox.classList.add('activating');
    setTimeout(() => abilityBox.classList.remove('activating'), 500);
  }
  
  const skillKey = type === 'Buff' ? 'buff' : type === 'Attack' ? 'atk' : 'ult';
  const abilityId = SHAPE_DATA[shape.type].skills[skillKey];
  executeAbility(abilityId, shape, isHijacked);
}

export function performHeresy(target) {
  const shapes = Object.keys(SHAPE_DATA).filter(t => t !== 'hexagon');
  const newType = shapes[Math.floor(Math.random() * shapes.length)];
  const data = SHAPE_DATA[newType];
  const angle = Math.atan2(target.vy, target.vx);

  target.type = newType;
  target.color = target.isP1 ? '#4d94ff' : '#ff4d4d';
  target.isHeretic = true;
  target.maxHp = data.hp; target.hp = data.hp; target.size = data.size;
  target.baseAtk = data.atk; target.atk = data.atk;
  target.baseSpeed = data.baseSpeed;
  target.baseDefense = data.defense ?? 1;
  target.defense = target.baseDefense;
  target.activeDomains = [];
  target.inquisitionActive = false;
  target.isShielded = false;
  target.victimActive = false;
  target.sufferingBonus = 0;
  target.blitzActive = false;
  target.poisoned = 0;
  target.poisonDmg = 0;
  target.blitzDmgBonus = 0;
  target.poisonAttackActive = false;
  target.poisonHitUsed = false;
  target.reversalActive = false;
  target.currentManaBoost = 0;
  target.lastHitFrame = -100;

  target.vx = Math.cos(angle) * target.baseSpeed;
  target.vy = Math.sin(angle) * target.baseSpeed;

  const p1Main = entities.find(e => e.isP1 && !e.isPhantom);
  const p2Main = entities.find(e => !e.isP1 && !e.isPhantom);
  if (target === p1Main) document.getElementById('p1-type-ui').innerText = 'HERETIC HEXAGON';
  if (target === p2Main) document.getElementById('p2-type-ui').innerText = 'HERETIC HEXAGON';
  if (p1Main && p2Main) updateLegends(p1Main.type, p2Main.type);

  heresyImplosions.push({
    x: target.x,
    y: target.y,
    baseRadius: target.size * 4,
    startFrame: typeof frameCount === 'number' ? frameCount : 0,
    duration: 120,
    isP1: target.isP1
  });

  addLog(`HERESY: HEXAGON CORRUPTED -> ${newType.toUpperCase()}`);
}

export function executeAbility(abilityId, caster, isHijacked = false, manaOwnerIsP1 = null) {
  console.log('executeAbility called with abilityId =', abilityId);
  const ability = abilities[abilityId];
  if (!ability) return;
  console.log('ability =', ability);

  // Set temporary emoji overlay on caster
  const emoji = ability.emoji;
  if (emoji) {
    const hijackMark = isHijacked ? '🛸' : '';
    caster.abilityEmoji = `${hijackMark}${emoji}`;
    caster.abilityEmojiUntil = frameCount + 180;
  }

  const effect = ability.effect;
  const duration = ability.duration;
  console.log('effect =', effect, 'duration =', duration);
  
  const targetSide = entities.filter(e => e.isP1 !== caster.isP1);
  const mySide = entities.filter(e => e.isP1 === caster.isP1 && e.type === caster.type && !e.isPhantom);
  const mySideIncludingPhantoms = entities.filter(e => e.isP1 === caster.isP1 && e.type === caster.type);
  const manaKey = manaOwnerIsP1 !== null ? (manaOwnerIsP1 ? 'p1' : 'p2') : (caster.isP1 ? 'p1' : 'p2');

  // Create context object with all parameters
  const context = {
    caster,
    effect,
    duration,
    targetSide,
    mySide,
    mySideIncludingPhantoms,
    manaKey,
    isHijacked,
    abilityId
  };

  // Dispatch to appropriate handlers based on effect properties
  Object.keys(effect).forEach(effectType => {
    if (effectHandlers[effectType]) {
      console.log('Handling effect:', effectType);
      effectHandlers[effectType](context);
    }
  });

  // Initialize handlers on first call
  if (Object.keys(effectHandlers).length === 0) {
    registerEffectHandlers();
  }
}

// Initialize handlers when module loads
registerEffectHandlers();
