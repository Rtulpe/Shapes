import { initDom, canvas, entities, manaGems, stats, abilitiesLoaded, abilities, setAbilities, setFrameCount, setDebugMode } from './state.js';
import { SHAPE_DATA } from './config.js';
import { Shape } from './shape.js';
import { addLog, updateLegends } from './ui.js';
import { loadAbilities, activateSkill, executeAbility, performHeresy } from './abilities.js';
import { handleDamage, tossCoin, rollDice } from './mechanics.js';
import { animate } from './render.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!initDom()) return;
  await loadAbilities();
  if (!abilitiesLoaded) { alert('Loading abilities... please wait a moment and try again.'); return; }

  const startBtn = document.getElementById('startBtn');
  if (!startBtn) return;
  startBtn.addEventListener('click', function(e) {
    const p1Type = document.getElementById('p1Select').value;
    const p2Type = document.getElementById('p2Select').value;
    const debug = !!e.shiftKey;
    setDebugMode(debug);
    document.getElementById('p1-header').classList.add('p1-color');
    document.getElementById('p2-header').classList.add('p2-color');
    document.getElementById('p1-type-ui').innerText = p1Type.toUpperCase();
    document.getElementById('p2-type-ui').innerText = debug ? 'DEBUG ?' : p2Type.toUpperCase();
    updateLegends(p1Type, p2Type);
    if (debug) {
      document.getElementById('p2-legend').innerHTML = '<table><tr><th>DEBUG</th><th>RANDOM SKILLS</th></tr><tr><td>Attack</td><td>Random</td></tr><tr><td>Buff</td><td>Random</td></tr><tr><td>Ult</td><td>Random</td></tr></table>';
    }
    document.getElementById('setup').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('bottom-ui').style.display = 'flex';
    document.getElementById('restartBtn').style.display = 'block';
    const p1 = new Shape(p1Type, 150, 200, true);
    entities.push(p1);
    if (debug) {
      const q = new Shape('circle', 650, 200, false);
      q.color = '#bbbbbb';
      q.noMove = true;
      q.immortal = true;
      q.appearanceQuestion = true;
      q.vx = 0; q.vy = 0; q.baseSpeed = 0;
      entities.push(q);
      addLog('DEBUG MODE: IMMORTAL ? WITH RANDOM SKILLS');
      window._debugInterval = setInterval(() => {
        const debugShape = q;
        const keys = Object.keys(abilities);
        const id = keys[Math.floor(Math.random() * keys.length)];
        executeAbility(id, debugShape);
        const ability = abilities[id];
        if (ability && ability.name) addLog('DEBUG ?: ' + ability.name.toUpperCase());
      }, 3000);
    } else {
      entities.push(new Shape(p2Type, 650, 200, false));
      addLog('BATTLE INITIALIZED');
      // intervals
      window._diceInterval = setInterval(() => rollDice(abilities, activateSkill, SHAPE_DATA), 5000);
      window._coinInterval = setInterval(() => tossCoin(), 10000);
    }
    // Mana gems spawn in both debug and normal modes
    window._manaInterval = setInterval(() => { manaGems.push({ x: Math.random()*740+30, y: Math.random()*340+30 }); }, 5000);

    document.addEventListener('keydown', (e) => {
      const p1 = entities.find(en => en.isP1 && !en.isPhantom);
      const p2 = entities.find(en => !en.isP1 && !en.isPhantom);
      switch(e.key) {
        case '1': if (p1) { activateSkill(p1, 'Buff'); addLog('DEBUG: P1 BUFF'); } break;
        case '2': if (p1) { activateSkill(p1, 'Attack'); addLog('DEBUG: P1 ATTACK'); } break;
        case '3': if (p1) { activateSkill(p1, 'Ultimate'); addLog('DEBUG: P1 ULTIMATE'); } break;
        case '4': if (p2) { activateSkill(p2, 'Buff'); addLog('DEBUG: P2 BUFF'); } break;
        case '5': if (p2) { activateSkill(p2, 'Attack'); addLog('DEBUG: P2 ATTACK'); } break;
        case '6': if (p2) { activateSkill(p2, 'Ultimate'); addLog('DEBUG: P2 ULTIMATE'); } break;
        case '7': stats.p1.mana += 100; stats.p2.mana += 100; addLog('DEBUG: +100 MANA TO BOTH'); break;
        case '8':
          if (p1) p1.hp = Math.min(p1.hp + 100, p1.maxHp);
          if (p2) p2.hp = Math.min(p2.hp + 100, p2.maxHp);
          addLog('DEBUG: +100 HP TO BOTH');
          break;
      }
    });

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());

    requestAnimationFrame(() => animate(setFrameCount));
  });
});
