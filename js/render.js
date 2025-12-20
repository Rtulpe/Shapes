import { canvas, ctx, entities, manaGems, antimanaGems, landmines, rays, turrets, turretShots, domainClashExplosions, heresyImplosions, hexagonInquisitionAuras, stats, frameCount, setEntities, splashes } from './state.js';
import { addLog, updateAbilityUI } from './ui.js';
import { handleDamage, getPhantomEfficiency } from './mechanics.js';
import { renderSplashes } from './visuals.js';

function getCurrentSpeed(shape) {
  if (!shape) return 0;
  let currentSpeed = shape.baseSpeed;
  if (shape.blitzActive) {
    const count = entities.filter(e => e.isP1 === shape.isP1 && e.type === 'triangle').length;
    currentSpeed *= count > 0 ? (1 + (2.0 / count)) : 3.0;
  }
  return currentSpeed;
}

export function animate(setFrame) {
  if (!canvas || !ctx) return;
  setFrame(frameCount + 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render heresy implosions
  for (let i = heresyImplosions.length - 1; i >= 0; i--) {
    const impl = heresyImplosions[i];
    const elapsed = frameCount - impl.startFrame;
    if (elapsed > impl.duration) { heresyImplosions.splice(i, 1); continue; }
    const progress = Math.max(0, Math.min(1, elapsed / impl.duration));
    const fade = 1 - progress; const radius = Math.max(4, impl.baseRadius * (1 - progress));
    ctx.save();
    const glowColor = impl.isP1 ? `rgba(77, 148, 255, ${0.35 * fade})` : `rgba(255, 77, 77, ${0.35 * fade})`;
    ctx.fillStyle = glowColor; ctx.beginPath(); ctx.arc(impl.x, impl.y, radius * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * fade})`; ctx.beginPath(); ctx.arc(impl.x, impl.y, Math.max(2, radius * 0.4), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = impl.isP1 ? `rgba(77, 148, 255, ${0.9 * fade})` : `rgba(255, 77, 77, ${0.9 * fade})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(impl.x, impl.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Mana gems
  for (let i = manaGems.length - 1; i >= 0; i--) {
    const gem = manaGems[i];
    ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(gem.x, gem.y, 14, 0, Math.PI*2); ctx.fill();
    const corruptingHex = hexagonInquisitionAuras.find(h => Math.sqrt((h.x - gem.x)**2 + (h.y - gem.y)**2) < 120);
    if (corruptingHex) {
      antimanaGems.push({ x: gem.x, y: gem.y, hexOwner: corruptingHex });
      corruptingHex.inquisitionActive = false;
      hexagonInquisitionAuras.splice(hexagonInquisitionAuras.indexOf(corruptingHex), 1);
      addLog('ANTIMANA CREATED!');
      manaGems.splice(i, 1);
      continue;
    }
    let col = false;
    entities.forEach(e => {
      if (Math.sqrt((e.x - gem.x)**2 + (e.y - gem.y)**2) < e.size + 15) {
        if (e.type === 'hexagon') return;
        if (e.isP1) stats.p1.mana += 20; else stats.p2.mana += 20;
        splashes.push({
          x: gem.x,
          y: gem.y,
          text: '+20',
          color: '#00ff88',
          startFrame: frameCount,
          duration: 60,
          type: 'mana',
          isP1: e.isP1
        });
        col = true;
      }
    });
    if (col) { manaGems.splice(i, 1); continue; }

    // Star Ray can collect half mana on contact
    let collectedByRay = false;
    for (let r of rays) {
      const dist = Math.sqrt((r.x - gem.x)**2 + (r.y - gem.y)**2);
      if (dist < 24 && r.fromStarRay) { // ray radius ~10, gem radius ~14
        if (r.isP1) stats.p1.mana += 10; else stats.p2.mana += 10;
        splashes.push({
          x: gem.x,
          y: gem.y,
          text: '+10',
          color: '#00ff88',
          startFrame: frameCount,
          duration: 60,
          type: 'mana',
          isP1: r.isP1
        });
        addLog('STAR RAY COLLECTED HALF MANA!');
        collectedByRay = true;
        break;
      }
    }
    if (collectedByRay) { manaGems.splice(i, 1); }
  }

  // Antimana
  for (let i = antimanaGems.length - 1; i >= 0; i--) {
    const gem = antimanaGems[i];
    ctx.fillStyle = '#b300b3'; ctx.beginPath(); ctx.arc(gem.x, gem.y, 14, 0, Math.PI*2); ctx.fill();
    for (let entity of entities) {
      if (entity.activeDomains) {
        for (let domain of entity.activeDomains) {
          const dist = Math.sqrt((entity.x - gem.x)**2 + (entity.y - gem.y)**2);
          if (dist < domain.radius) { if (entity.isP1) stats.p1.mana -= 10; else stats.p2.mana -= 10; antimanaGems.splice(i, 1); break; }
        }
      }
    }
    let col = false;
    entities.forEach(e => {
      // Antimana is player-agnostic but cannot harm any current hexagon
      if (e.type === 'hexagon') return;
      if (e.type === 'circle' && e.reversalActive) { col = true; return; }
      if (Math.sqrt((e.x - gem.x)**2 + (e.y - gem.y)**2) < e.size + 15) {
        const dmg = gem.hexOwner.atk * 2; handleDamage(gem.hexOwner, e, dmg); addLog('ANTIMANA HIT!'); col = true;
      }
    });
    if (col) antimanaGems.splice(i, 1);
  }

  // Landmines
  for (let i = landmines.length - 1; i >= 0; i--) {
    const m = landmines[i];
    ctx.fillStyle = m.isHijacked ? '#b300b3' : '#ff0000'; ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI*2); ctx.fill();
    if (m.isHijacked) { ctx.strokeStyle = '#b300b3'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI*2); ctx.stroke(); }
    for (let entity of entities) {
      if (entity.activeDomains) {
        for (let domain of entity.activeDomains) {
          const dist = Math.sqrt((entity.x - m.x)**2 + (entity.y - m.y)**2);
          if (dist < domain.radius) { addLog('MINE DEACTIVATED BY DOMAIN!'); landmines.splice(i, 1); break; }
        }
      }
    }
    entities.forEach(e => {
      if (e.isP1 !== m.isP1 && Math.sqrt((e.x-m.x)**2 + (e.y-m.y)**2) < e.size + 10) {
        stats[e.isP1 ? 'p1' : 'p2'].mana = Math.floor(stats[e.isP1 ? 'p1' : 'p2'].mana / 2);
        const mineOwner = entities.find(sq => sq.isP1 === m.isP1);
        handleDamage(mineOwner, e, m.dmg);
        addLog('MINE DETONATED!'); 
        domainClashExplosions.push({ x: m.x, y: m.y, radius: 35, startFrame: frameCount, duration: 70 });
        landmines.splice(i, 1);
      }
    });
  }

  // Turrets
  for (let i = turrets.length - 1; i >= 0; i--) {
    const t = turrets[i];
    // draw cross turret
    ctx.save();
    const baseColor = t.isP1 ? '#ff8800' : '#ffaa00';
    if (t.isHeretic) {
      const grad = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 16);
      grad.addColorStop(0, '#ffd9a3');
      grad.addColorStop(1, baseColor);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = baseColor;
    }
    ctx.translate(t.x, t.y);
    ctx.fillRect(-3, -12, 6, 24);
    ctx.fillRect(-12, -3, 24, 6);
    if (t.purpleOutline) {
      ctx.strokeStyle = '#b300b3';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
    }
    // Crack overlay when turret is damaged (hp == 1)
    if (t.hp === 1) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.setLineDash([]);
    }
    ctx.restore();

    // shoot every 60 frames
    if (frameCount - t.lastShot >= 60) {
      const target = entities.find(e => e.isP1 !== t.isP1 && !e.isPhantom);
      if (target) {
        const ang = Math.atan2(target.y - t.y, target.x - t.x);
        turretShots.push({
          x: t.x,
          y: t.y,
          vx: Math.cos(ang) * 5,
          vy: Math.sin(ang) * 5,
          isP1: t.isP1,
          dmg: t.baseDmg * 0.2,
          purpleOutline: t.purpleOutline
        });
        t.lastShot = frameCount;
      }
    }

    // check collision with enemy bodies
    const enemy = entities.find(e => e.isP1 !== t.isP1 && Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2) < e.size + 10);
    if (enemy) {
      t.hp -= 1;
      if (t.hp <= 0) {
        domainClashExplosions.push({ x: t.x, y: t.y, radius: 25, startFrame: frameCount, duration: 50 });
        // Trigger patriotism persistence when YOUR own foreign base is destroyed
        const patriots = entities.filter(e => e.patriotismActive && !e.isPhantom && e.isP1 === t.isP1);
        if (patriots.length > 0) {
          patriots.forEach(p => {
            p._patriotismPersisted = true; // prevent revert of temporary boosts
            p.patriotismActive = false; // disable the visual effect
            p.mourningActive = true;    // mourning visual for fallen base
            setTimeout(() => { p.mourningActive = false; }, 3000);
          });
          addLog('SONS OF THE PATRIOTS MORN THE LOSS');
        }
        turrets.splice(i, 1);
      }
    }
  }

  // Turret shots
  for (let i = turretShots.length - 1; i >= 0; i--) {
    const s = turretShots[i];
    s.x += s.vx; s.y += s.vy;
    ctx.save();
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI*2); ctx.fill();
    if (s.purpleOutline) { ctx.strokeStyle = '#b300b3'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();

    if (s.x < 0 || s.x > canvas.width || s.y < 0 || s.y > canvas.height) { turretShots.splice(i, 1); continue; }
    let hit = false;
    entities.forEach(e => {
      if (hit) return;
      if (e.isP1 === s.isP1) return;
      const dist = Math.sqrt((e.x - s.x)**2 + (e.y - s.y)**2);
      if (dist < e.size + 6) {
        if (e.isShielded) { hit = true; return; }
        const owner = entities.find(en => en.isP1 === s.isP1 && !en.isPhantom);
        handleDamage(owner || null, e, s.dmg);
        hit = true;
      }
    });
    if (!hit) {
      // Can destroy mines
      for (let j = landmines.length - 1; j >= 0 && !hit; j--) {
        const m = landmines[j];
        const dist = Math.sqrt((m.x - s.x)**2 + (m.y - s.y)**2);
        if (dist < 16) { landmines.splice(j, 1); hit = true; addLog('MINE DEFUSED!'); }
      }
    }
    if (!hit) {
      // Can remove star rays
      for (let j = rays.length - 1; j >= 0 && !hit; j--) {
        const r2 = rays[j];
        const dist = Math.sqrt((r2.x - s.x)**2 + (r2.y - s.y)**2);
        if (dist < 14) { rays.splice(j, 1); hit = true; addLog('TURRET SHOT INTERCEPTED RAY'); }
      }
    }
    if (hit) turretShots.splice(i, 1);
  }

  // Rays
  for (let i = rays.length - 1; i >= 0; i--) {
    const r = rays[i]; r.x += r.vx; r.y += r.vy;
    if (r.x < 10 || r.x > canvas.width - 10) r.vx *= -1;
    if (r.y < 10 || r.y > canvas.height - 10) r.vy *= -1;
    ctx.fillStyle = r.isHijacked ? '#b300b3' : 'white'; ctx.beginPath(); ctx.arc(r.x, r.y, 10, 0, Math.PI*2); ctx.fill();
    if (r.isHijacked) { ctx.strokeStyle = '#b300b3'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, 10, 0, Math.PI*2); ctx.stroke(); }
    for (let entity of entities) {
      if (entity.activeDomains) {
        for (let domain of entity.activeDomains) {
          const dist = Math.sqrt((entity.x - r.x)**2 + (entity.y - r.y)**2);
          if (dist < domain.radius) { 
            addLog('RAY DEACTIVATED BY DOMAIN!');
            if (r.fromStarRay) {
              domainClashExplosions.push({ x: r.x, y: r.y, radius: 25, startFrame: frameCount, duration: 50 });
            }
            rays.splice(i, 1); 
            break; 
          }
        }
      }
    }
    let rem = false;
    entities.forEach(e => { if (e.isP1 !== r.isP1 && Math.sqrt((e.x-r.x)**2 + (e.y-r.y)**2) < e.size + 10) { const rayOwner = entities.find(en => en.isP1 === r.isP1); handleDamage(rayOwner, e, r.dmg); domainClashExplosions.push({ x: r.x, y: r.y, radius: 25, startFrame: frameCount, duration: 50 }); rem = true; } });
    landmines.forEach((m, j) => { if (Math.sqrt((r.x-m.x)**2 + (r.y-m.y)**2) < 20) { landmines.splice(j, 1); rem = true; addLog('MINE DEFUSED!'); if (r.fromStarRay) { domainClashExplosions.push({ x: r.x, y: r.y, radius: 25, startFrame: frameCount, duration: 50 }); } } });
    if (rem) rays.splice(i, 1);
  }

  // Entities
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]; e.update(); e.draw();
    if (e.activeDomains && e.activeDomains.length > 0) {
      // Remove expired domains
      e.activeDomains = e.activeDomains.filter(d => (frameCount - d.startFrame) < d.duration);
      e.activeDomains.forEach(domain => {
        ctx.fillStyle = e.isP1 ? 'rgba(77, 148, 255, 0.1)' : 'rgba(255, 77, 77, 0.1)';
        ctx.beginPath(); ctx.arc(e.x, e.y, domain.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = e.isP1 ? 'rgba(77, 148, 255, 0.4)' : 'rgba(255, 77, 77, 0.4)'; ctx.lineWidth = 2; ctx.stroke();

        // Tick damage every frame to enemies inside domain
        entities.forEach(other => {
          if (other.isP1 === e.isP1) return;
          const dist = Math.sqrt((other.x - e.x)**2 + (other.y - e.y)**2);
          if (dist < domain.radius + other.size) {
            handleDamage(e, other, e.atk * 0.2);
          }
        });
      });
    }
    for (let j = i - 1; j >= 0; j--) {
      const a = entities[j], b = e;
      const dist = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
      if (a.isP1 !== b.isP1 && dist < a.size + b.size) {
        // Skip collisions with immortal entities (debug figure)
        if (a.immortal || b.immortal) continue;
        const canHitA = frameCount - a.lastHitFrame >= 10;
        const canHitB = frameCount - b.lastHitFrame >= 10;
        
        // Separate overlapping entities to prevent sticking
        const overlap = (a.size + b.size) - dist;
        if (overlap > 0) {
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const separationX = Math.cos(angle) * overlap * 0.5;
          const separationY = Math.sin(angle) * overlap * 0.5;
          a.x -= separationX;
          a.y -= separationY;
          b.x += separationX;
          b.y += separationY;
        }
        
        // Swap velocities for bounce effect
        [a.vx, b.vx] = [b.vx, a.vx]; [a.vy, b.vy] = [b.vy, a.vy];
        
        if (a.type === 'triangle' && a.poisonAttackActive && !a.poisonHitUsed) {
          const eff = a.isPhantom ? getPhantomEfficiency(a.isP1, a.type) : 1;
          b.poisoned = 5; b.poisonDmg = a.atk * 0.2 * eff; a.poisonHitUsed = true; a.poisonAttackActive = false;
        }
        if (b.type === 'triangle' && b.poisonAttackActive && !b.poisonHitUsed) {
          const eff = b.isPhantom ? getPhantomEfficiency(b.isP1, b.type) : 1;
          a.poisoned = 5; a.poisonDmg = b.atk * 0.2 * eff; b.poisonHitUsed = true; b.poisonAttackActive = false;
        }
        if (canHitA && canHitB) { handleDamage(a, b, a.atk); handleDamage(b, a, b.atk); a.lastHitFrame = frameCount; b.lastHitFrame = frameCount; }
      }
    }
  }
  setEntities(entities.filter(e => e.hp > 0));

  // Domain clashes
  const entitiesWithDomains = entities.filter(e => e.activeDomains && e.activeDomains.length > 0);
  const clashesToProcess = [];
  for (let i = 0; i < entitiesWithDomains.length; i++) {
    for (let j = i + 1; j < entitiesWithDomains.length; j++) {
      const entity1 = entitiesWithDomains[i];
      const entity2 = entitiesWithDomains[j];
      if (entity1.isP1 === entity2.isP1) continue;
      for (let domain1 of entity1.activeDomains) {
        for (let domain2 of entity2.activeDomains) {
          const dist = Math.sqrt((entity1.x - entity2.x)**2 + (entity1.y - entity2.y)**2);
          if (dist < domain1.radius + domain2.radius) { clashesToProcess.push({ entity1, entity2, domain1, domain2 }); }
        }
      }
    }
  }
  clashesToProcess.forEach(({ entity1, entity2, domain1, domain2 }) => {
    entity1.hp -= entity2.atk * 2; entity2.hp -= entity1.atk * 2;
    entity1.activeDomains = entity1.activeDomains.filter(d => d !== domain1);
    entity2.activeDomains = entity2.activeDomains.filter(d => d !== domain2);
    addLog('DOMAIN CLASH! EXPLOSION!');
    const midX = (entity1.x + entity2.x) / 2; const midY = (entity1.y + entity2.y) / 2;
    const explosionRadius = (domain1.radius + domain2.radius) / 2;
    domainClashExplosions.push({ x: midX, y: midY, radius: explosionRadius, startFrame: frameCount, duration: 120 });
  });

  // Explosion visuals
  for (let i = domainClashExplosions.length - 1; i >= 0; i--) {
    const explosion = domainClashExplosions[i];
    const elapsed = frameCount - explosion.startFrame; if (elapsed > explosion.duration) { domainClashExplosions.splice(i, 1); continue; }
    const progress = elapsed / explosion.duration; const pulse = Math.sin(elapsed * 0.3) * 0.3 + 1; const fade = 1 - progress; const currentRadius = explosion.radius * pulse;
    ctx.save();
    ctx.fillStyle = `rgba(255, 200, 0, ${0.3 * fade})`; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, currentRadius * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 100, 0, ${0.5 * fade})`; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * fade})`; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, currentRadius * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.9 * fade})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, currentRadius * (1 + progress * 0.5), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Render damage/healing/mana splashes on top of everything
  renderSplashes(ctx);

  const p1 = entities.find(e => e.isP1 && !e.isPhantom);
  const p2 = entities.find(e => !e.isP1 && !e.isPhantom);
  if (p1 && p2) {
    document.getElementById('hp1').innerText = Math.ceil(p1.hp);
    document.getElementById('hp2').innerText = Math.ceil(p2.hp);
    document.getElementById('mana1').innerText = stats.p1.mana;
    document.getElementById('mana2').innerText = stats.p2.mana;
    const p1Display = p1.currentManaBoost > 0 ? `${p1.atk.toFixed(1)} [+${p1.currentManaBoost.toFixed(2)}]` : p1.atk.toFixed(1);
    const p2Display = p2.currentManaBoost > 0 ? `${p2.atk.toFixed(1)} [+${p2.currentManaBoost.toFixed(2)}]` : p2.atk.toFixed(1);
    document.getElementById('dmg1').innerText = p1Display;
    document.getElementById('dmg2').innerText = p2Display;
    document.getElementById('def1').innerText = p1.defense.toFixed(1);
    document.getElementById('def2').innerText = p2.defense.toFixed(1);
    document.getElementById('spd1').innerText = getCurrentSpeed(p1).toFixed(2);
    document.getElementById('spd2').innerText = getCurrentSpeed(p2).toFixed(2);
    const eff1El = document.getElementById('eff1');
    const eff2El = document.getElementById('eff2');
    const eff1Row = document.getElementById('eff1-row');
    const eff2Row = document.getElementById('eff2-row');
    // Show Phantom Eff only for triangles
    if (p1.type === 'triangle') {
      eff1Row.style.display = 'block';
      const p1PhantomCount = entities.filter(e => e.isP1 && e.isPhantom && e.type === 'triangle').length;
      if (p1PhantomCount > 0) {
        const effP1 = Math.round(getPhantomEfficiency(true, 'triangle') * 100);
        eff1El.innerText = effP1 + '%';
        eff1El.classList.toggle('eff-low', effP1 < 100);
      } else { eff1El.innerText = '—'; eff1El.classList.remove('eff-low'); }
    } else {
      eff1Row.style.display = 'none';
    }
    if (p2.type === 'triangle') {
      eff2Row.style.display = 'block';
      const p2PhantomCount = entities.filter(e => !e.isP1 && e.isPhantom && e.type === 'triangle').length;
      if (p2PhantomCount > 0) {
        const effP2 = Math.round(getPhantomEfficiency(false, 'triangle') * 100);
        eff2El.innerText = effP2 + '%';
        eff2El.classList.toggle('eff-low', effP2 < 100);
      } else { eff2El.innerText = '—'; eff2El.classList.remove('eff-low'); }
    } else {
      eff2Row.style.display = 'none';
    }
    updateAbilityUI(p1, p2);
    requestAnimationFrame(() => animate(setFrame));
  } else {
    // Game over: clear all intervals
    clearInterval(window._diceInterval);
    clearInterval(window._manaInterval);
    clearInterval(window._coinInterval);
    clearInterval(window._debugInterval);
    const winner = !p1 ? p2 : p1;
    const winnerName = winner ? winner.type.toUpperCase() : 'UNKNOWN';
    const playerNum = !p1 ? 'P2' : 'P1';
    addLog(`${playerNum} (${winnerName}) VICTORIOUS`);
  }
}
