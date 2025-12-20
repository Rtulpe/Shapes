document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const logDisplay = document.getElementById('log');
    let entities = [], manaGems = [], landmines = [], rays = [];
    let gameActive = false, diceInterval, manaInterval, coinInterval;
    let domainClashExplosions = []; // Track active explosions
    let heresyImplosions = []; // Track active heresy implosions
    let logMessages = []; // Store last 3 log messages

    let abilities = {};
    let abilitiesLoaded = false;

    function updateLegends(p1Type, p2Type) {
        const p1Skills = SHAPE_DATA[p1Type].skills;
        const p2Skills = SHAPE_DATA[p2Type].skills;
        const p1BuffAbility = abilities[p1Skills.buff] || { name: '', description: '', cost: 0 };
        const p1AtkAbility = abilities[p1Skills.atk] || { name: '', description: '', cost: 0 };
        const p1UltAbility = abilities[p1Skills.ult] || { name: '', description: '', cost: 0 };
        const p2BuffAbility = abilities[p2Skills.buff] || { name: '', description: '', cost: 0 };
        const p2AtkAbility = abilities[p2Skills.atk] || { name: '', description: '', cost: 0 };
        const p2UltAbility = abilities[p2Skills.ult] || { name: '', description: '', cost: 0 };

        document.getElementById('p1-legend').innerHTML = `<table>
            <tr><th>TYPE</th><th>EFFECT</th></tr>
            <tr><td>BUFF (1)</td><td>${p1BuffAbility.name} (Cost: ${p1BuffAbility.cost}): ${p1BuffAbility.description}</td></tr>
            <tr><td>ATK (2)</td><td>${p1AtkAbility.name} (Cost: ${p1AtkAbility.cost}): ${p1AtkAbility.description}</td></tr>
            <tr><td>ULT (3)</td><td>${p1UltAbility.name} (Cost: ${p1UltAbility.cost}): ${p1UltAbility.description}</td></tr>
        </table>`;
        document.getElementById('p2-legend').innerHTML = `<table>
            <tr><th>TYPE</th><th>EFFECT</th></tr>
            <tr><td>BUFF (4)</td><td>${p2BuffAbility.name} (Cost: ${p2BuffAbility.cost}): ${p2BuffAbility.description}</td></tr>
            <tr><td>ATK (5)</td><td>${p2AtkAbility.name} (Cost: ${p2AtkAbility.cost}): ${p2AtkAbility.description}</td></tr>
            <tr><td>ULT (6)</td><td>${p2UltAbility.name} (Cost: ${p2UltAbility.cost}): ${p2UltAbility.description}</td></tr>
        </table>`;
    }
    
    // Load abilities
    fetch('abilities.json')
        .then(response => response.json())
        .then(data => { 
            abilities = data; 
            abilitiesLoaded = true;
            console.log('Abilities loaded:', abilities);
        })
        .catch(err => console.error('Failed to load abilities:', err));
        // Draw heresy implosions (contracting rings, fading out)
        heresyImplosions = heresyImplosions.filter(impl => {
            const elapsed = frameCount - impl.startFrame;
            if (elapsed > impl.duration) return false;
            const progress = Math.max(0, Math.min(1, elapsed / impl.duration));
            const fade = 1 - progress;
            const radius = Math.max(4, impl.baseRadius * (1 - progress));

            ctx.save();
            // Team-colored glow
            const glowColor = impl.isP1 ? `rgba(77, 148, 255, ${0.35 * fade})` : `rgba(255, 77, 77, ${0.35 * fade})`;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(impl.x, impl.y, radius * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * fade})`;
            ctx.beginPath();
            ctx.arc(impl.x, impl.y, Math.max(2, radius * 0.4), 0, Math.PI * 2);
            ctx.fill();

            // Contracting ring
            ctx.strokeStyle = impl.isP1 ? `rgba(77, 148, 255, ${0.9 * fade})` : `rgba(255, 77, 77, ${0.9 * fade})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(impl.x, impl.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
            return true;
        });


    const SHAPE_DATA = {
        triangle: { hp: 150, size: 24, color: '#ff4d4d', atk: 5, defense: 1, baseSpeed: 4.0, skills: { buff: 'blitz', atk: 'poison', ult: 'phantom' } },
        square: { hp: 150, size: 24, color: '#4d94ff', atk: 5, defense: 1, baseSpeed: 4.0, skills: { buff: 'shield', atk: 'mine', ult: 'suffering' } },
        star: { hp: 150, size: 24, color: '#ffff4d', atk: 5, defense: 1, baseSpeed: 4.0, skills: { buff: 'victim', atk: 'starRay', ult: 'usury' } },
        hexagon: { hp: 150, size: 24, color: '#ff4dff', atk: 5, defense: 1, baseSpeed: 4.0, skills: { buff: 'dogma', atk: 'inquisition', ult: 'divineBlessing' } },
        circle: { hp: 150, size: 24, color: '#00ff00', atk: 5, defense: 1, baseSpeed: 4.0, skills: { buff: 'reversal', atk: 'condensation', ult: 'domainExpansion' } }
    };

    let stats = { p1: { mana: 0 }, p2: { mana: 0 } };
    let antimanaGems = [];
    let hexagonInquisitionAuras = []; // Track auras by hexagon

    function performHeresy(target) {
        // Transform a hexagon into a random non-hexagon shape and reset its stats/skills
        const shapes = Object.keys(SHAPE_DATA).filter(t => t !== 'hexagon');
        const newType = shapes[Math.floor(Math.random() * shapes.length)];
        const data = SHAPE_DATA[newType];

        // Preserve position/velocity direction, reset speed to new base
        const angle = Math.atan2(target.vy, target.vx);

        target.type = newType;
        target.color = target.isP1 ? '#4d94ff' : '#ff4d4d';
        target.isHeretic = true;
        target.maxHp = data.hp;
        target.hp = data.hp;
        target.size = data.size;
        target.baseAtk = data.atk;
        target.atk = data.atk;
        target.baseDefense = data.defense ?? 1;
        target.defense = target.baseDefense; // reset defense when shape changes
        target.baseSpeed = data.baseSpeed;
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

        // Recompute velocity with new base speed
        target.vx = Math.cos(angle) * target.baseSpeed;
        target.vy = Math.sin(angle) * target.baseSpeed;

        // Update UI type labels and legends
        const p1Main = entities.find(e => e.isP1 && !e.isPhantom);
        const p2Main = entities.find(e => !e.isP1 && !e.isPhantom);
        if (target === p1Main) document.getElementById('p1-type-ui').innerText = 'HERETIC HEXAGON';
        if (target === p2Main) document.getElementById('p2-type-ui').innerText = 'HERETIC HEXAGON';
        if (p1Main && p2Main) updateLegends(p1Main.type, p2Main.type);

        // Queue implosion visual (2s at 60fps)
        heresyImplosions.push({
            x: target.x,
            y: target.y,
            baseRadius: target.size * 4,
            startFrame: typeof frameCount === 'number' ? frameCount : 0,
            duration: 120, // 2 seconds
            isP1: target.isP1
        });

        addLog(`HERESY: HEXAGON CORRUPTED -> ${newType.toUpperCase()}`);
    }

    function addLog(message) {
        logMessages.unshift(message); // Add to beginning
        if (logMessages.length > 3) logMessages = logMessages.slice(0, 3); // Keep only 3
        logDisplay.innerHTML = logMessages.join('<br>');
    }

    class Shape {
        constructor(type, x, y, isP1, isPhantom = false) {
            const data = SHAPE_DATA[type];
            this.type = type; this.x = x; this.y = y; 
            this.color = isP1 ? '#4d94ff' : '#ff4d4d'; // Blue for P1, Red for P2
            this.hp = data.hp; this.maxHp = data.hp; this.size = data.size; 
            this.baseAtk = data.atk; this.atk = data.atk;
            this.baseDefense = data.defense ?? 1; this.defense = this.baseDefense; // Default defense stat
            this.baseSpeed = data.baseSpeed; this.isP1 = isP1;
            this.isPhantom = isPhantom;
            this.isHeretic = false;
            this.hitsTaken = 0; // For Phantoms
            this.isShielded = false; this.victimActive = false;
            this.sufferingBonus = 0;
            this.blitzActive = false; this.poisoned = 0;
            this.poisonDmg = 0;
            // Hexagon special
            this.inquisitionActive = false;
            this.blitzDmgBonus = 0;
            this.poisonAttackActive = false;
            this.poisonHitUsed = false;
            this.reversalActive = false;
            this.currentManaBoost = 0;
            this.activeDomains = [];
            this.lastHitFrame = -100; // Collision cooldown tracking
            this.edgeStuckFrames = 0; // Detect and fix edge-stuck behavior
            let angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * this.baseSpeed; this.vy = Math.sin(angle) * this.baseSpeed;
        }
        draw() {
            ctx.save();
            let fillStyle = this.color;
            if (this.isHeretic) {
                const grad = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, this.size * 1.2);
                if (this.isP1) {
                    grad.addColorStop(0, '#b5d4ff'); // light blue core
                    grad.addColorStop(0.55, '#4d94ff'); // team blue
                    grad.addColorStop(1, '#0a2a5f'); // deep blue edge
                } else {
                    grad.addColorStop(0, '#ffb3b3'); // light red core
                    grad.addColorStop(0.55, '#ff4d4d'); // team red
                    grad.addColorStop(1, '#4f0000'); // deep red edge
                }
                fillStyle = grad;
            }
            ctx.fillStyle = fillStyle;
            if (this.isShielded) { ctx.shadowBlur = 15; ctx.shadowColor = "cyan"; ctx.strokeStyle = "cyan"; ctx.lineWidth = 4; }
            if (this.victimActive) { ctx.shadowBlur = 15; ctx.shadowColor = "gold"; ctx.strokeStyle = "gold"; ctx.lineWidth = 4; }
            if (this.isPhantom) ctx.globalAlpha = 0.6;
            if (this.poisoned > 0) { ctx.shadowBlur = 10; ctx.shadowColor = "#0f0"; }
            if (this.inquisitionActive) { ctx.shadowBlur = 20; ctx.shadowColor = "#b300b3"; ctx.strokeStyle = "#b300b3"; ctx.lineWidth = 3; }
            if (this.blitzActive) { ctx.shadowBlur = 15; ctx.shadowColor = "#ff9900"; ctx.strokeStyle = "#ff9900"; ctx.lineWidth = 2; }
            
            ctx.beginPath();
            if (this.type === 'triangle') {
                ctx.moveTo(this.x, this.y - this.size); ctx.lineTo(this.x - this.size, this.y + this.size); ctx.lineTo(this.x + this.size, this.y + this.size);
            } else if (this.type === 'square') {
                ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            } else if (this.type === 'star') {
                for(let i=0; i<5; i++){
                    ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*this.size+this.x, -Math.sin((18+i*72)/180*Math.PI)*this.size+this.y);
                    ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*(this.size/2)+this.x, -Math.sin((54+i*72)/180*Math.PI)*(this.size/2)+this.y);
                }
            } else if (this.type === 'hexagon') {
                for(let i=0; i<6; i++) ctx.lineTo(this.x + this.size * Math.cos(i * Math.PI / 3), this.y + this.size * Math.sin(i * Math.PI / 3));
            } else if (this.type === 'circle') {
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            }
            ctx.closePath(); ctx.fill();
            if (this.isShielded || this.victimActive || this.inquisitionActive || this.blitzActive) ctx.stroke();

            // Render Crack on Phantom
            if (this.isPhantom && this.hitsTaken === 1) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
        update() {
            this.atk = this.baseAtk + this.sufferingBonus + this.blitzDmgBonus + this.currentManaBoost;
            let currentSpeed = this.baseSpeed;
            if (this.blitzActive) {
                const count = entities.filter(e => e.isP1 === this.isP1 && e.type === 'triangle').length;
                if (count > 0) {
                    currentSpeed *= (1 + (2.0 / count));
                } else {
                    currentSpeed *= 3.0; // Default boost for non-triangles
                }
                this.blitzDmgBonus = this.baseAtk * 0.5;
            } else {
                this.blitzDmgBonus = 0;
            }
            const mag = Math.sqrt(this.vx**2 + this.vy**2);
            if (mag > 0) { this.vx = (this.vx / mag) * currentSpeed; this.vy = (this.vy / mag) * currentSpeed; }

            // occasional small drift to avoid straight-line oscillation
            if (Math.random() < 0.02) {
                const drift = (Math.random() - 0.5) * 0.4; // ~±0.2 rad
                const speed = Math.sqrt(this.vx**2 + this.vy**2) || currentSpeed;
                const ang = Math.atan2(this.vy, this.vx) + drift;
                this.vx = Math.cos(ang) * speed;
                this.vy = Math.sin(ang) * speed;
            }

            // Move
            this.x += this.vx; this.y += this.vy;

            // Clamp and bounce with slight angle tweak to prevent ping-pong
            let bounced = false;
            if (this.x < this.size) {
                this.x = this.size;
                this.vx = Math.abs(this.vx);
                bounced = true;
            } else if (this.x > canvas.width - this.size) {
                this.x = canvas.width - this.size;
                this.vx = -Math.abs(this.vx);
                bounced = true;
            }
            if (this.y < this.size) {
                this.y = this.size;
                this.vy = Math.abs(this.vy);
                bounced = true;
            } else if (this.y > canvas.height - this.size) {
                this.y = canvas.height - this.size;
                this.vy = -Math.abs(this.vy);
                bounced = true;
            }
            if (bounced) {
                const tweak = (Math.random() - 0.5) * 0.4;
                const speed = Math.sqrt(this.vx**2 + this.vy**2) || currentSpeed;
                const ang = Math.atan2(this.vy, this.vx) + tweak;
                this.vx = Math.cos(ang) * speed;
                this.vy = Math.sin(ang) * speed;
            }

            // Edge-stuck detection: if velocity points outward while at edge, re-randomize direction
            const nearLeft = this.x <= this.size + 0.5 && this.vx < 0;
            const nearRight = this.x >= canvas.width - this.size - 0.5 && this.vx > 0;
            const nearTop = this.y <= this.size + 0.5 && this.vy < 0;
            const nearBottom = this.y >= canvas.height - this.size - 0.5 && this.vy > 0;
            if (nearLeft || nearRight || nearTop || nearBottom || Math.sqrt(this.vx**2 + this.vy**2) < 0.05) {
                this.edgeStuckFrames++;
            } else {
                this.edgeStuckFrames = 0;
            }
            if (this.edgeStuckFrames > 20) {
                const nudgeAngle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(nudgeAngle) * currentSpeed;
                this.vy = Math.sin(nudgeAngle) * currentSpeed;
                // Nudge slightly inward from edges
                this.x = Math.min(Math.max(this.x, this.size + 1), canvas.width - this.size - 1);
                this.y = Math.min(Math.max(this.y, this.size + 1), canvas.height - this.size - 1);
                this.edgeStuckFrames = 0;
            }
            if (this.poisoned > 0) {
                this.poisoned -= 1/60;
                if (Math.floor(this.poisoned * 60) % 60 === 0) this.hp -= this.poisonDmg;
            }
        }
    }

    function updateAbilityUI(p1, p2) {
        const p1Box = document.getElementById('p1-ability'), p2Box = document.getElementById('p2-ability');
        function getStatus(s) {
            let res = [];
            if(s.isShielded) res.push("ACTIVE: SHIELD");
            if(s.victimActive) res.push("ACTIVE: VICTIM");
            if(s.sufferingBonus > 0) res.push("BUFF: SUFFERING");
            if(s.blitzActive) res.push("ACTIVE: BLITZ");
            if(s.poisonAttackActive) res.push("ACTIVE: POISON");
            if(s.inquisitionActive) res.push("ACTIVE: INQUISITION");
            return res.length > 0 ? res.join("\n") : "READY";
        }
        p1Box.innerText = getStatus(p1); p2Box.innerText = getStatus(p2);
        p1Box.classList.toggle('active-glow', p1Box.innerText !== "READY");
        p2Box.classList.toggle('active-glow', p2Box.innerText !== "READY");
    }

    function executeAbility(abilityId, caster, isHijacked = false, manaOwnerIsP1 = null) {
        const ability = abilities[abilityId];
        if (!ability) return;

        const effect = ability.effect;
        const duration = ability.duration; // Duration is on the ability, not effect
        const targetSide = entities.filter(e => e.isP1 !== caster.isP1);
        const mySide = entities.filter(e => e.isP1 === caster.isP1 && e.type === caster.type && !e.isPhantom);
        const mySideIncludingPhantoms = entities.filter(e => e.isP1 === caster.isP1 && e.type === caster.type); // Include phantoms for Phantom ability
        const manaKey = manaOwnerIsP1 !== null ? (manaOwnerIsP1 ? 'p1' : 'p2') : (caster.isP1 ? 'p1' : 'p2');

        // Simple property set with optional duration
        if (effect.property && effect.value !== undefined) {
            if (duration) {
                if (effect.count === 'allSameSide') {
                    const prop = effect.property;
                    mySide.forEach(t => {
                        t[prop] = effect.value;
                        setTimeout(() => { 
                            t[prop] = false; 
                        }, duration);
                    });
                } else {
                    const prop = effect.property;
                    caster[prop] = effect.value;
                    setTimeout(() => { 
                        caster[prop] = false; 
                    }, duration);
                }
            } else {
                caster[effect.property] = effect.value;
            }
        }

        // Property modifier
        if (effect.property && effect.modifier !== undefined) {
            caster[effect.property] += effect.modifier;
        }

        // Special effects
        if (effect.addToAuraList) {
            hexagonInquisitionAuras.push(caster);
        }

        if (effect.spawnCopies) {
            const targets = effect.count === 'allSameSide' ? mySideIncludingPhantoms : [caster];
            targets.forEach(t => {
                const copy = new Shape(caster.type, t.x + 20, t.y + 20, t.isP1, effect.phantom);
                // Ensure phantoms spawned by a heretic inherit the heretic gradient
                copy.isHeretic = caster.isHeretic === true;
                entities.push(copy);
            });
        }

        if (effect.spawnMine) {
            landmines.push({
                x: caster.x,
                y: caster.y,
                isP1: caster.isP1,
                dmg: caster.atk * effect.damageMultiplier,
                isHijacked: isHijacked
            });
        }

        if (effect.spawnRay && targetSide[0]) {
            const t = targetSide[0];
            const angle = Math.atan2(t.y - caster.y, t.x - caster.x);
            rays.push({
                x: caster.x,
                y: caster.y,
                vx: Math.cos(angle) * 6,
                vy: Math.sin(angle) * 6,
                isP1: caster.isP1,
                dmg: caster.atk * effect.damageMultiplier,
                isHijacked: isHijacked
            });
        }

        if (effect.calculation === 'missingHealthBonus') {
            caster.sufferingBonus += Math.floor(((caster.maxHp - caster.hp) / caster.maxHp) * 10) * 0.5;
        }

        if (effect.doubleMana) {
            stats[manaKey].mana *= 2;
            if (effect.autocast && stats[manaKey].mana >= 15) {
                stats[manaKey].mana -= 15;
                effect.autocast.forEach(type => {
                    const skillKey = type === 'buff' ? 'buff' : 'atk';
                    // If hijacked, use star's skills; otherwise use caster's skills
                    const sourceType = isHijacked ? 'star' : caster.type;
                    const abilityId = SHAPE_DATA[sourceType].skills[skillKey];
                    executeAbility(abilityId, caster, isHijacked, manaOwnerIsP1);
                });
            }
        }

        if (effect.manaBoostDamage) {
            const pKey = caster.isP1 ? 'p1' : 'p2';
            const manaUsed = Math.floor(stats[pKey].mana * 0.5);
            stats[pKey].mana -= manaUsed;
            caster.currentManaBoost = manaUsed * 0.01;
        }

        if (effect.createDomain) {
            caster.activeDomains.push({
                circle: caster,
                radius: caster.size * 3,
                startTime: frameCount,
                duration: effect.duration || 10000,
                lastDamageFrame: frameCount
            });
            addLog("DOMAIN EXPANSION ACTIVATED!");
        }

        if (effect.hijackEnemySkill) {
            const targetEnemy = targetSide.find(e => !e.isPhantom);
            if (!targetEnemy) {
                addLog("HIJACK FAILED: NO VALID TARGET!");
            } else if (targetEnemy.type === 'hexagon') {
                // Special case: Hexagon gets corrupted into a random shape (Heresy)
                performHeresy(targetEnemy);
            } else if (stats[targetEnemy.isP1 ? 'p1' : 'p2'].mana <= 0) {
                addLog("HIJACK FAILED: ENEMY HAS NO MANA!");
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
                        addLog("HIJACKED: " + enemyAbility.name.toUpperCase());
                    } else {
                        addLog("HIJACK FAILED: INSUFFICIENT MANA!");
                    }
                }, 500);
            }
        }
    }

    function activateSkill(shape, type, isHijacked = false) {
        const skillKey = type === "Buff" ? "buff" : type === "Attack" ? "atk" : "ult";
        const abilityId = SHAPE_DATA[shape.type].skills[skillKey];
        executeAbility(abilityId, shape, isHijacked);
    }

    function handleDamage(attacker, defender, amount) {
        if (!defender || !attacker) return;
        const defenderSide = entities.filter(e => e.isP1 === defender.isP1);
        const phantom = defenderSide.find(e => e.isPhantom);
        
        if (phantom) {
            phantom.hitsTaken++;
            if (phantom.hitsTaken >= 2) {
                entities.splice(entities.indexOf(phantom), 1);
                addLog("PHANTOM DESTROYED!");
            } else {
                addLog("PHANTOM CRACKED!");
            }
            return;
        }

        if (defender.isShielded) { defender.isShielded = false; addLog("SHIELD BLOCKED!"); return; }
        
        // Apply defense reduction: each defense point reduces damage by 0.1
        const damageReduction = defender.defense * 0.1;
        const finalDamage = Math.max(0, amount - damageReduction);
        
        defender.hp -= finalDamage;
        if (defender.victimActive && attacker) { 
            const reflectedDamage = Math.max(0, (amount * 0.5) - damageReduction);
            attacker.hp -= reflectedDamage; 
            defender.victimActive = false; 
            addLog("REFLECTED DMG!"); 
        }
        // Reset mana boost after attack
        if (attacker && attacker.currentManaBoost > 0) { attacker.currentManaBoost = 0; }
    }

    function tossCoin() {
        if (!gameActive) return;
        const coinVal = Math.random() < 0.5 ? 1 : 2; // 1 = P1, 2 = P2
        document.getElementById('coin-val').innerText = coinVal;
        const player = entities.find(e => e.isP1 === (coinVal === 1) && !e.isPhantom);
        if (!player) return;

        const outcome = Math.floor(Math.random() * 4); // 0-3 for 4 outcomes
        const playerName = coinVal === 1 ? "P1" : "P2";

        switch(outcome) {
            case 0: // +5 defense
                player.defense += 5;
                addLog(`${playerName}: LORD'S COIN: +5 DEFENSE`);
                break;
            case 1: // +2 damage
                player.baseAtk += 2;
                player.atk += 2;
                addLog(`${playerName}: LORD'S COIN: +2 DAMAGE`);
                break;
            case 2: // Cast random skill
                const skillTypes = ['Buff', 'Attack', 'Ultimate'];
                const randomSkill = skillTypes[Math.floor(Math.random() * 3)];
                activateSkill(player, randomSkill);
                const skillKey = randomSkill === "Buff" ? "buff" : randomSkill === "Attack" ? "atk" : "ult";
                const abilityId = SHAPE_DATA[player.type].skills[skillKey];
                const ability = abilities[abilityId];
                addLog(`${playerName}: LORD'S COIN: ${ability.name.toUpperCase()}`);
                break;
            case 3: // Heal 10
                player.hp = Math.min(player.hp + 10, player.maxHp);
                addLog(`${playerName}: LORD'S COIN: +10 HP`);
                break;
        }
    }

    function rollDice() {
        if (!gameActive) return;
        const val = Math.floor(Math.random() * 6) + 1;
        document.getElementById('dice-val').innerText = val;
        const pKey = val <= 3 ? 'p1' : 'p2';
        const player = entities.find(e => e.isP1 === (val <= 3) && !e.isPhantom);
        if (!player) return;
        let type = (val === 1 || val === 4) ? "Buff" : (val === 2 || val === 5) ? "Attack" : "Ultimate";
        const skillKey = type === "Buff" ? "buff" : type === "Attack" ? "atk" : "ult";
        const abilityId = SHAPE_DATA[player.type].skills[skillKey];
        const ability = abilities[abilityId];
        if (!ability) return;
        
        // Hexagon has no mana cost
        if (player.type === 'hexagon') {
            activateSkill(player, type); 
            addLog((val <= 3 ? "P1" : "P2") + ": " + ability.name.toUpperCase());
        } else {
            let cost = ability.cost;
            if (stats[pKey].mana >= cost) {
                stats[pKey].mana -= cost;
                activateSkill(player, type);
                addLog((val <= 3 ? "P1" : "P2") + ": " + ability.name.toUpperCase());
            }
        }
    }

    let frameCount = 0;
    function animate() {
        if (!gameActive) return;
        frameCount++;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        manaGems = manaGems.filter(gem => {
            ctx.fillStyle = "#00ff88"; ctx.beginPath(); ctx.arc(gem.x, gem.y, 14, 0, Math.PI*2); ctx.fill();
            // Check if hexagon with Inquisition aura corrupts this mana first
            const corruptingHex = hexagonInquisitionAuras.find(h => Math.sqrt((h.x - gem.x)**2 + (h.y - gem.y)**2) < 120);
            if (corruptingHex) {
                antimanaGems.push({ x: gem.x, y: gem.y, hexOwner: corruptingHex });
                corruptingHex.inquisitionActive = false;
                hexagonInquisitionAuras.splice(hexagonInquisitionAuras.indexOf(corruptingHex), 1);
                addLog("ANTIMANA CREATED!");
                return false;
            }
            let col = false;
            entities.forEach(e => {
                if (Math.sqrt((e.x - gem.x)**2 + (e.y - gem.y)**2) < e.size + 15) {
                    // Hexagon cannot pick up mana
                    if (e.type === 'hexagon') return;
                    if (e.isP1) stats.p1.mana += 20; else stats.p2.mana += 20;
                    col = true;
                }
            });
            return !col;
        });

        // Handle antimana pickup
        antimanaGems = antimanaGems.filter(gem => {
            ctx.fillStyle = "#b300b3"; ctx.beginPath(); ctx.arc(gem.x, gem.y, 14, 0, Math.PI*2); ctx.fill();
            
            // Check if any domain collects this antimana
            for (let entity of entities) {
                if (entity.activeDomains) {
                    for (let domain of entity.activeDomains) {
                        const dist = Math.sqrt((entity.x - gem.x)**2 + (entity.y - gem.y)**2);
                        if (dist < domain.radius) {
                            if (entity.isP1) stats.p1.mana -= 10; else stats.p2.mana -= 10; // Antimana drains mana
                            return false; // Collected
                        }
                    }
                }
            }
            
            let col = false;
            entities.forEach(e => {
                // Antimana is player-agnostic but cannot harm any current hexagon
                if (e.type === 'hexagon') return;
                // Circle with Reversal deletes antimana instead
                if (e.type === 'circle' && e.reversalActive) { col = true; return; }
                if (Math.sqrt((e.x - gem.x)**2 + (e.y - gem.y)**2) < e.size + 15) {
                    // Antimana damages health by 2x hexagon's damage stat
                    const dmg = gem.hexOwner.atk * 2;
                    handleDamage(gem.hexOwner, e, dmg);
                        addLog("ANTIMANA HIT!");
                    col = true;
                }
            });
            return !col;
        });

        landmines = landmines.filter(m => {
            ctx.fillStyle = m.isHijacked ? "#b300b3" : "#ff0000";
            ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI*2); ctx.fill();
            if (m.isHijacked) { ctx.strokeStyle = "#b300b3"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI*2); ctx.stroke(); }
            
            // Check if any domain deactivates this mine
            for (let entity of entities) {
                if (entity.activeDomains) {
                    for (let domain of entity.activeDomains) {
                        const dist = Math.sqrt((entity.x - m.x)**2 + (entity.y - m.y)**2);
                        if (dist < domain.radius) {
                            addLog("MINE DEACTIVATED BY DOMAIN!");
                            return false; // Deactivated
                        }
                    }
                }
            }
            
            let trig = false;
            entities.forEach(e => {
                if (e.isP1 !== m.isP1 && Math.sqrt((e.x-m.x)**2 + (e.y-m.y)**2) < e.size + 10) {
                    stats[e.isP1 ? 'p1' : 'p2'].mana = Math.floor(stats[e.isP1 ? 'p1' : 'p2'].mana / 2);
                    const mineOwner = entities.find(sq => sq.isP1 === m.isP1);
                    handleDamage(mineOwner, e, m.dmg);
                    trig = true; addLog("MINE DETONATED!");
                }
            });
            return !trig;
        });

        rays = rays.filter((r) => {
            r.x += r.vx; r.y += r.vy;
            if (r.x < 10 || r.x > canvas.width - 10) r.vx *= -1;
            if (r.y < 10 || r.y > canvas.height - 10) r.vy *= -1;
            ctx.fillStyle = r.isHijacked ? "#b300b3" : "white";
            ctx.beginPath(); ctx.arc(r.x, r.y, 10, 0, Math.PI*2); ctx.fill();
            if (r.isHijacked) { ctx.strokeStyle = "#b300b3"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, 10, 0, Math.PI*2); ctx.stroke(); }
            
            // Check if any domain deactivates this ray
            for (let entity of entities) {
                if (entity.activeDomains) {
                    for (let domain of entity.activeDomains) {
                        const dist = Math.sqrt((entity.x - r.x)**2 + (entity.y - r.y)**2);
                        if (dist < domain.radius) {
                            addLog("RAY DEACTIVATED BY DOMAIN!");
                            return false; // Deactivated
                        }
                    }
                }
            }
            
            let rem = false;
            entities.forEach(e => { if (e.isP1 !== r.isP1 && Math.sqrt((e.x-r.x)**2 + (e.y-r.y)**2) < e.size + 10) { const rayOwner = entities.find(en => en.isP1 === r.isP1); handleDamage(rayOwner, e, r.dmg); rem = true; } });
            landmines.forEach((m, i) => { if (Math.sqrt((r.x-m.x)**2 + (r.y-m.y)**2) < 20) { landmines.splice(i, 1); rem = true; addLog("MINE DEFUSED!"); } });
            return !rem;
        });

        entities = entities.filter(e => e.hp > 0);
        
        // Check for domain clashes
        const entitiesWithDomains = entities.filter(e => e.activeDomains && e.activeDomains.length > 0);
        const clashesToProcess = [];
        
        for (let i = 0; i < entitiesWithDomains.length; i++) {
            for (let j = i + 1; j < entitiesWithDomains.length; j++) {
                const entity1 = entitiesWithDomains[i];
                const entity2 = entitiesWithDomains[j];
                
                // Only clash if they're on opposite teams
                if (entity1.isP1 === entity2.isP1) continue;
                
                // Check if any domains overlap
                for (let domain1 of entity1.activeDomains) {
                    for (let domain2 of entity2.activeDomains) {
                        const dist = Math.sqrt((entity1.x - entity2.x)**2 + (entity1.y - entity2.y)**2);
                        if (dist < domain1.radius + domain2.radius) {
                            clashesToProcess.push({ entity1, entity2, domain1, domain2 });
                        }
                    }
                }
            }
        }
        
        // Process domain clashes
        clashesToProcess.forEach(clash => {
            const { entity1, entity2, domain1, domain2 } = clash;
            
            // Deal 2x damage to each entity
            entity1.hp -= entity2.atk * 2;
            entity2.hp -= entity1.atk * 2;
            
            // Remove both clashing domains
            entity1.activeDomains = entity1.activeDomains.filter(d => d !== domain1);
            entity2.activeDomains = entity2.activeDomains.filter(d => d !== domain2);
            
            addLog("DOMAIN CLASH! EXPLOSION!");
            
            // Create explosion effect that lasts for multiple frames
            const midX = (entity1.x + entity2.x) / 2;
            const midY = (entity1.y + entity2.y) / 2;
            const explosionRadius = (domain1.radius + domain2.radius) / 2;
            
            domainClashExplosions.push({
                x: midX,
                y: midY,
                radius: explosionRadius,
                startFrame: frameCount,
                duration: 120 // 2 seconds at 60fps
            });
        });
        
        // Apply domain damage each frame
        entities.forEach(entity => {
            if (!entity.activeDomains || entity.activeDomains.length === 0) return;
            entity.activeDomains = entity.activeDomains.filter(domain => {
                const elapsed = frameCount - domain.startTime;
                if (elapsed > domain.duration / (1000 / 60)) return false; // Roughly 10 seconds in frames
                
                // Apply damage once per second (60 frames at 60fps)
                if (frameCount - domain.lastDamageFrame >= 60) {
                    domain.lastDamageFrame = frameCount;
                    // Apply damage to enemies in domain using entity's current position
                    entities.forEach(e => {
                        if (e === entity || e.isP1 === entity.isP1) return; // Don't hit allies
                        const dist = Math.sqrt((e.x - entity.x)**2 + (e.y - entity.y)**2);
                        if (dist < domain.radius) {
                            e.hp -= entity.atk * 0.2;
                        }
                    });
                }
                return true;
            });
        });
        
        for (let i = 0; i < entities.length; i++) {
            entities[i].update(); entities[i].draw();
            
            // Draw active domains (for circles or hijacked circle skills on other entities)
            if (entities[i].activeDomains && entities[i].activeDomains.length > 0) {
                entities[i].activeDomains.forEach(domain => {
                    ctx.fillStyle = entities[i].isP1 ? 'rgba(77, 148, 255, 0.1)' : 'rgba(255, 77, 77, 0.1)';
                    ctx.beginPath();
                    ctx.arc(entities[i].x, entities[i].y, domain.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = entities[i].isP1 ? 'rgba(77, 148, 255, 0.4)' : 'rgba(255, 77, 77, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }
            
            for (let j = i + 1; j < entities.length; j++) {
                const a = entities[i], b = entities[j];
                if (a.isP1 !== b.isP1 && Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2) < a.size + b.size) {
                    // Collision cooldown: 10 frames (prevents multihits from speed boosts)
                    const canHitA = frameCount - a.lastHitFrame >= 10;
                    const canHitB = frameCount - b.lastHitFrame >= 10;
                    
                    [a.vx, b.vx] = [b.vx, a.vx]; [a.vy, b.vy] = [b.vy, a.vy];
                    // Apply poison on hit if attacker is triangle with poison attack active (one-time use)
                    if (a.type === 'triangle' && a.poisonAttackActive && !a.poisonHitUsed) { b.poisoned = 5; b.poisonDmg = a.atk * 0.2; a.poisonHitUsed = true; a.poisonAttackActive = false; }
                    if (b.type === 'triangle' && b.poisonAttackActive && !b.poisonHitUsed) { a.poisoned = 5; a.poisonDmg = b.atk * 0.2; b.poisonHitUsed = true; b.poisonAttackActive = false; }
                    
                    if (canHitA && canHitB) {
                        handleDamage(a, b, a.atk); 
                        handleDamage(b, a, b.atk);
                        a.lastHitFrame = frameCount;
                        b.lastHitFrame = frameCount;
                    }
                }
            }
        }

        // Draw domain clash explosions
        domainClashExplosions = domainClashExplosions.filter(explosion => {
            const elapsed = frameCount - explosion.startFrame;
            if (elapsed > explosion.duration) return false;
            
            // Animation: pulsing effect with expanding/contracting radius
            const progress = elapsed / explosion.duration;
            const pulse = Math.sin(elapsed * 0.3) * 0.3 + 1; // Oscillate between 0.7 and 1.3
            const fade = 1 - progress; // Fade out over time
            const currentRadius = explosion.radius * pulse;
            
            // Draw multiple layers for more visual impact
            ctx.save();
            
            // Outer glow
            ctx.fillStyle = `rgba(255, 200, 0, ${0.3 * fade})`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Middle layer
            ctx.fillStyle = `rgba(255, 100, 0, ${0.5 * fade})`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * fade})`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Expanding ring
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.9 * fade})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius * (1 + progress * 0.5), 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            return true;
        });

        function getCurrentSpeed(shape) {
            if (!shape) return 0;
            let currentSpeed = shape.baseSpeed;
            if (shape.blitzActive) {
                const count = entities.filter(e => e.isP1 === shape.isP1 && e.type === 'triangle').length;
                if (count > 0) {
                    currentSpeed *= (1 + (2.0 / count));
                } else {
                    currentSpeed *= 3.0;
                }
            }
            return currentSpeed;
        }

        const p1 = entities.find(e => e.isP1 && !e.isPhantom), p2 = entities.find(e => !e.isP1 && !e.isPhantom);
        if(p1 && p2) {
            document.getElementById('hp1').innerText = Math.ceil(p1.hp);
            document.getElementById('hp2').innerText = Math.ceil(p2.hp);
            document.getElementById('mana1').innerText = stats.p1.mana;
            document.getElementById('mana2').innerText = stats.p2.mana;
            // Show condensation boost if active
            const p1Display = p1.currentManaBoost > 0 ? `${p1.atk.toFixed(1)} [+${p1.currentManaBoost.toFixed(2)}]` : p1.atk.toFixed(1);
            const p2Display = p2.currentManaBoost > 0 ? `${p2.atk.toFixed(1)} [+${p2.currentManaBoost.toFixed(2)}]` : p2.atk.toFixed(1);
            document.getElementById('dmg1').innerText = p1Display;
            document.getElementById('dmg2').innerText = p2Display;
            document.getElementById('def1').innerText = p1.defense.toFixed(1);
            document.getElementById('def2').innerText = p2.defense.toFixed(1);
            document.getElementById('spd1').innerText = getCurrentSpeed(p1).toFixed(2);
            document.getElementById('spd2').innerText = getCurrentSpeed(p2).toFixed(2);
            updateAbilityUI(p1, p2);
            requestAnimationFrame(animate);
        } else { 
            const winner = !p1 ? p2 : p1;
            const winnerName = winner ? winner.type.toUpperCase() : 'UNKNOWN';
            const playerNum = !p1 ? 'P2' : 'P1';
            addLog(`${playerNum} (${winnerName}) VICTORIOUS`); 
            gameActive = false; 
        }
    }

    const startBtn = document.getElementById('startBtn');
    if (!startBtn) return;
    startBtn.addEventListener('click', function() {
        if (!abilitiesLoaded) {
            alert('Loading abilities... please wait a moment and try again.');
            return;
        }
        const p1Type = document.getElementById('p1Select').value, p2Type = document.getElementById('p2Select').value;
        document.getElementById('p1-header').style.color = '#4d94ff'; // P1 always blue
        document.getElementById('p2-header').style.color = '#ff4d4d'; // P2 always red
        document.getElementById('p1-type-ui').innerText = p1Type.toUpperCase();
        document.getElementById('p2-type-ui').innerText = p2Type.toUpperCase();
        
        // Use abilities.json for legend display
        updateLegends(p1Type, p2Type);
        document.getElementById('setup').style.display = 'none';
        canvas.style.display = 'block';
        document.getElementById('dashboard').style.display = 'flex';
        document.getElementById('bottom-ui').style.display = 'flex';
        document.getElementById('restartBtn').style.display = 'block';
        entities.push(new Shape(p1Type, 150, 200, true));
        entities.push(new Shape(p2Type, 650, 200, false));
        gameActive = true;
            addLog("BATTLE INITIALIZED");
        diceInterval = setInterval(rollDice, 5000);
        manaInterval = setInterval(() => { if(gameActive) manaGems.push({ x: Math.random()*740+30, y: Math.random()*340+30 }); }, 5000);
            coinInterval = setInterval(tossCoin, 10000);
        
        // Debug: Keyboard controls for abilities
        document.addEventListener('keydown', (e) => {
            if (!gameActive) return;
            const p1 = entities.find(e => e.isP1 && !e.isPhantom);
            const p2 = entities.find(e => !e.isP1 && !e.isPhantom);
            
            switch(e.key) {
                case '1': if (p1) activateSkill(p1, 'Buff'); break;
                case '2': if (p1) activateSkill(p1, 'Attack'); break;
                case '3': if (p1) activateSkill(p1, 'Ultimate'); break;
                case '4': if (p2) activateSkill(p2, 'Buff'); break;
                case '5': if (p2) activateSkill(p2, 'Attack'); break;
                case '6': if (p2) activateSkill(p2, 'Ultimate'); break;
                case '7': 
                    stats.p1.mana += 100;
                    stats.p2.mana += 100;
                    addLog("DEBUG: +100 MANA TO BOTH");
                    break;
                case '8':
                    if (p1) {
                        p1.hp = Math.min(p1.hp + 100, p1.maxHp);
                        console.log('P1 HP:', p1.hp, '/', p1.maxHp);
                    }
                    if (p2) {
                        p2.hp = Math.min(p2.hp + 100, p2.maxHp);
                        console.log('P2 HP:', p2.hp, '/', p2.maxHp);
                    }
                    addLog("DEBUG: +100 HP TO BOTH");
                    break;
            }
        });
        
        animate();
    });

    // Hook restart button (moved from inline)
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());
});
