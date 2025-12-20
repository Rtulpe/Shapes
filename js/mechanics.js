import { entities, stats, abilities, frameCount, splashes } from './state.js';
import { addLog } from './ui.js';
import { activateSkill } from './abilities.js';
import { SHAPE_DATA } from './config.js';

export function handleDamage(attacker, defender, amount) {
  if (!defender || !attacker) return;
  const defenderSide = entities.filter(e => e.isP1 === defender.isP1);
  const phantom = defenderSide.find(e => e.isPhantom);

  if (phantom) {
    phantom.hitsTaken++;
    if (phantom.hitsTaken >= 2) {
      entities.splice(entities.indexOf(phantom), 1);
      addLog('PHANTOM DESTROYED!');
    } else {
      addLog('PHANTOM CRACKED!');
    }
    return;
  }

  if (defender.immortal) return;

  if (defender.isShielded) { defender.isShielded = false; addLog('SHIELD BLOCKED!'); return; }

  const damageReduction = defender.defense * 0.1;
  const finalDamage = Math.max(0, amount - damageReduction);

  defender.hp -= finalDamage;
  
  // Add damage splash
  splashes.push({
    x: defender.x,
    y: defender.y,
    text: `-${Math.ceil(finalDamage)}`,
    color: '#ff4444',
    startFrame: frameCount,
    duration: 60,
    type: 'damage',
    isP1: defender.isP1
  });
  
  if (defender.victimActive && attacker) {
    const reflectedDamage = Math.max(0, (amount * 0.5) - damageReduction);
    attacker.hp -= reflectedDamage;
    defender.victimActive = false;
    addLog('REFLECTED DMG!');
    
    // Add reflected damage splash
    splashes.push({
      x: attacker.x,
      y: attacker.y,
      text: `-${Math.ceil(reflectedDamage)}`,
      color: '#ffaa00',
      startFrame: frameCount,
      duration: 60,
      type: 'reflected',
      isP1: attacker.isP1
    });
  }
  if (attacker && attacker.currentManaBoost > 0) { attacker.currentManaBoost = 0; }
}

export function tossCoin() {
  const player = entities.find(e => e.isP1 === (Math.random() < 0.5) && !e.isPhantom);
  if (!player) return;
  const playerName = player.isP1 ? 'P1' : 'P2';
  const coinVal = player.isP1 ? 1 : 2;
  const coinValEl = document.getElementById('coin-val');
  if (coinValEl) coinValEl.innerText = coinVal;

  const outcome = Math.floor(Math.random() * 4);
  console.log('LORD\'S COIN tossed for', playerName, '- outcome:', outcome);
  switch (outcome) {
    case 0:
      player.defense += 5; addLog(`${playerName}: LORD'S COIN: +5 DEFENSE`);
      console.log('  -> +5 DEFENSE');
      break;
    case 1:
      player.baseAtk += 2; player.atk += 2; addLog(`${playerName}: LORD'S COIN: +2 DAMAGE`);
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
        addLog(`${playerName}: LORD'S COIN: ${ability.name.toUpperCase()}`);
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
      addLog(`${playerName}: LORD'S COIN: +10 HP`);
      console.log('  -> +10 HP');
      break;
  }
}

export function rollDice(abilities, activateSkill, SHAPE_DATA) {
  const val = Math.floor(Math.random() * 6) + 1;
  const diceEl = document.getElementById('dice-val');
  if (diceEl) diceEl.innerText = val;
  const isP1 = val <= 3;
  const pKey = isP1 ? 'p1' : 'p2';
  const player = entities.find(e => e.isP1 === isP1 && !e.isPhantom);
  if (!player) return;
  const type = (val === 1 || val === 4) ? 'Buff' : (val === 2 || val === 5) ? 'Attack' : 'Ultimate';
  const skillKey = type === 'Buff' ? 'buff' : type === 'Attack' ? 'atk' : 'ult';
  const abilityId = SHAPE_DATA[player.type].skills[skillKey];
  const ability = abilities[abilityId];
  if (!ability) return;
  if (player.type === 'hexagon') {
    activateSkill(player, type);
    addLog((isP1 ? 'P1' : 'P2') + ': ' + ability.name.toUpperCase());
  } else {
    const cost = ability.cost;
    if (stats[pKey].mana >= cost) {
      stats[pKey].mana -= cost;
      
      // Check if enemy has Wonder of You active and apply healing
      const enemy = entities.find(e => e.isP1 !== isP1 && !e.isPhantom);
      if (enemy && enemy.wonderOfYouActive && frameCount <= enemy.wonderOfYouUntil) {
        enemy.hp = Math.min(enemy.hp + cost, enemy.maxHp);
        splashes.push({
          x: enemy.x,
          y: enemy.y,
          text: `+${cost}`,
          color: '#44ff44',
          startFrame: frameCount,
          duration: 60,
          type: 'heal',
          isP1: enemy.isP1
        });
        addLog(`WONDER OF YOU: ENEMY HEALED ${cost} HP!`);
      }
      
      activateSkill(player, type);
      addLog((isP1 ? 'P1' : 'P2') + ': ' + ability.name.toUpperCase());
    }
  }
}

// Efficiency scaling for phantoms: more phantoms -> weaker effects
export function getPhantomEfficiency(isP1, type) {
  const phantomCount = entities.filter(e => e.isP1 === isP1 && e.isPhantom && (!type || e.type === type)).length;
  // Each phantom reduces efficiency; floor at 0.3 to keep effects meaningful
  const eff = 1 / (1 + 0.5 * phantomCount);
  return Math.max(0.3, eff);
}
