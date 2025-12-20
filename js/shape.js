import { ctx, canvas, entities, frameCount } from './state.js';
import { getPhantomEfficiency } from './mechanics.js';
import { SHAPE_DATA } from './config.js';
import { renderVisuals } from './visuals.js';

export class Shape {
  constructor(type, x, y, isP1, isPhantom = false) {
    const data = SHAPE_DATA[type];
    this.type = type; this.x = x; this.y = y;
    this.color = isP1 ? '#4d94ff' : '#ff4d4d';
    this.hp = data.hp; this.maxHp = data.hp; this.size = data.size;
    this.baseAtk = data.atk; this.atk = data.atk;
    this.baseDefense = data.defense ?? 1;
    this.defense = this.baseDefense;
    this.baseSpeed = data.baseSpeed; this.isP1 = isP1;
    this.isPhantom = isPhantom;
    this.isHeretic = false;
    this.hitsTaken = 0;
    this.isShielded = false; this.victimActive = false;
    this.sufferingBonus = 0;
    this.blitzActive = false; this.poisoned = 0;
    this.poisonDmg = 0;
    this.inquisitionActive = false;
    this.blitzDmgBonus = 0;
    this.poisonAttackActive = false;
    this.poisonHitUsed = false;
    this.reversalActive = false;
    this.currentManaBoost = 0;
    this.wonderOfYouActive = false;
    this.wonderOfYouUntil = 0;
    this.silenced = false;
    this.probabilityActive = false;
    this.probabilityUntil = 0;
    this.patriotismActive = false;
    this.sufferingVisual = false;
    this.sufferingVisualUntil = 0;
    this.insideJobActive = false;
    this.insideJobStart = 0;
    this.condensationActive = false;
    this.interventionActive = false;
    this.dogmaActive = false;
    this.interestActive = false;
    this.mourningActive = false;
    this.activeDomains = [];
    this.abilityEmoji = '';
    this.abilityEmojiUntil = 0;
    this.lastHitFrame = -100;
    this.edgeStuckFrames = 0;
    let angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
  }
  draw() {
    const ctxLocal = ctx; if (!ctxLocal) return;
    ctxLocal.save();
    
    // Apply shake effect if dogma is active
    let shakeX = 0, shakeY = 0;
    if (this.dogmaActive && typeof frameCount !== 'undefined') {
      shakeX = (Math.random() - 0.5) * 6;
      shakeY = (Math.random() - 0.5) * 6;
    }
    
    const drawX = this.x + shakeX;
    const drawY = this.y + shakeY;
    let fillStyle = this.color;
    if (this.isHeretic) {
      const grad = ctxLocal.createRadialGradient(drawX, drawY, this.size * 0.2, drawX, drawY, this.size * 1.2);
      if (this.isP1) {
        grad.addColorStop(0, '#b5d4ff');
        grad.addColorStop(0.55, '#4d94ff');
        grad.addColorStop(1, '#0a2a5f');
      } else {
        grad.addColorStop(0, '#ffb3b3');
        grad.addColorStop(0.55, '#ff4d4d');
        grad.addColorStop(1, '#4f0000');
      }
      fillStyle = grad;
    }
    ctxLocal.fillStyle = fillStyle;
    
    // Apply visual effects in priority order (highest priority last for shadowBlur)
    let hasStroke = false;
    
    if (this.isPhantom) ctxLocal.globalAlpha = 0.6;
    
    // Base glow effects
    if (this.poisoned > 0) { ctxLocal.shadowBlur = 10; ctxLocal.shadowColor = '#0f0'; }
    if (this.blitzActive) { ctxLocal.shadowBlur = 15; ctxLocal.shadowColor = '#ff9900'; ctxLocal.strokeStyle = '#ff9900'; ctxLocal.lineWidth = 2; hasStroke = true; }
    if (this.inquisitionActive) { ctxLocal.shadowBlur = 20; ctxLocal.shadowColor = '#b300b3'; ctxLocal.strokeStyle = '#b300b3'; ctxLocal.lineWidth = 3; hasStroke = true; }
    if (this.victimActive) { ctxLocal.shadowBlur = 15; ctxLocal.shadowColor = 'gold'; ctxLocal.strokeStyle = 'gold'; ctxLocal.lineWidth = 4; hasStroke = true; }
    if (this.isShielded) { ctxLocal.shadowBlur = 15; ctxLocal.shadowColor = 'cyan'; ctxLocal.strokeStyle = 'cyan'; ctxLocal.lineWidth = 4; hasStroke = true; }
    if (this.wonderOfYouActive) { ctxLocal.shadowBlur = 25; ctxLocal.shadowColor = '#fff'; }
    if (this.probabilityActive) { ctxLocal.shadowBlur = 20; ctxLocal.shadowColor = '#ff00ff'; }
    
    // Silenced gets priority outline (drawn separately to not conflict)
    const isSilenced = this.silenced;

    ctxLocal.beginPath();
    if (this.type === 'triangle') {
      ctxLocal.moveTo(drawX, drawY - this.size);
      ctxLocal.lineTo(drawX - this.size, drawY + this.size);
      ctxLocal.lineTo(drawX + this.size, drawY + this.size);
    } else if (this.type === 'square') {
      // Use a path so stroke-based effects (blitz/inquisition/shield) are visible on squares
      ctxLocal.rect(drawX - this.size, drawY - this.size, this.size * 2, this.size * 2);
    } else if (this.type === 'star') {
      for (let i = 0; i < 5; i++) {
        ctxLocal.lineTo(Math.cos((18+i*72)/180*Math.PI)*this.size+drawX, -Math.sin((18+i*72)/180*Math.PI)*this.size+drawY);
        ctxLocal.lineTo(Math.cos((54+i*72)/180*Math.PI)*(this.size/2)+drawX, -Math.sin((54+i*72)/180*Math.PI)*(this.size/2)+drawY);
      }
    } else if (this.type === 'hexagon') {
      for (let i = 0; i < 6; i++) ctxLocal.lineTo(drawX + this.size * Math.cos(i * Math.PI / 3), drawY + this.size * Math.sin(i * Math.PI / 3));
    } else if (this.type === 'pentagon') {
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 5);
        ctxLocal.lineTo(drawX + this.size * Math.cos(ang), drawY + this.size * Math.sin(ang));
      }
    } else if (this.type === 'rhombus') {
      ctxLocal.moveTo(drawX, drawY - this.size);
      ctxLocal.lineTo(drawX + this.size, drawY);
      ctxLocal.lineTo(drawX, drawY + this.size);
      ctxLocal.lineTo(drawX - this.size, drawY);
    } else if (this.type === 'circle') {
      ctxLocal.arc(drawX, drawY, this.size, 0, Math.PI * 2);
    }
    ctxLocal.closePath(); ctxLocal.fill();
    if (hasStroke) ctxLocal.stroke();
    
    // Draw silenced effect as separate layer so it doesn't conflict with other effects
    if (isSilenced) {
      ctxLocal.save();
      ctxLocal.strokeStyle = '#000';
      ctxLocal.lineWidth = 5;
      ctxLocal.shadowBlur = 15;
      ctxLocal.shadowColor = '#000';
      ctxLocal.beginPath();
      if (this.type === 'triangle') {
        ctxLocal.moveTo(drawX, drawY - this.size);
        ctxLocal.lineTo(drawX - this.size, drawY + this.size);
        ctxLocal.lineTo(drawX + this.size, drawY + this.size);
      } else if (this.type === 'square') {
        ctxLocal.rect(drawX - this.size, drawY - this.size, this.size * 2, this.size * 2);
      } else if (this.type === 'star') {
        for (let i = 0; i < 5; i++) {
          ctxLocal.lineTo(Math.cos((18+i*72)/180*Math.PI)*this.size+drawX, -Math.sin((18+i*72)/180*Math.PI)*this.size+drawY);
          ctxLocal.lineTo(Math.cos((54+i*72)/180*Math.PI)*(this.size/2)+drawX, -Math.sin((54+i*72)/180*Math.PI)*(this.size/2)+drawY);
        }
      } else if (this.type === 'hexagon') {
        for (let i = 0; i < 6; i++) ctxLocal.lineTo(drawX + this.size * Math.cos(i * Math.PI / 3), drawY + this.size * Math.sin(i * Math.PI / 3));
      } else if (this.type === 'pentagon') {
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + i * (2 * Math.PI / 5);
          ctxLocal.lineTo(drawX + this.size * Math.cos(ang), drawY + this.size * Math.sin(ang));
        }
      } else if (this.type === 'rhombus') {
        ctxLocal.moveTo(drawX, drawY - this.size);
        ctxLocal.lineTo(drawX + this.size, drawY);
        ctxLocal.lineTo(drawX, drawY + this.size);
        ctxLocal.lineTo(drawX - this.size, drawY);
      } else if (this.type === 'circle') {
        ctxLocal.arc(drawX, drawY, this.size, 0, Math.PI * 2);
      }
      ctxLocal.closePath();
      ctxLocal.stroke();
      ctxLocal.restore();
    }

    if (this.isPhantom && this.hitsTaken === 1) {
      ctxLocal.strokeStyle = 'white';
      ctxLocal.lineWidth = 3;
      ctxLocal.setLineDash([5, 3]);
      ctxLocal.stroke();
      ctxLocal.setLineDash([]);
    }
    
    // Render all visual effects
    renderVisuals(ctxLocal, this);
    
    // Overlay a question mark for debug figure
    if (this.appearanceQuestion) {
      ctxLocal.fillStyle = '#ffffff';
      ctxLocal.font = 'bold 18px Courier New, monospace';
      ctxLocal.textAlign = 'center';
      ctxLocal.textBaseline = 'middle';
      ctxLocal.fillText('?', this.x, this.y);
    }
    if (this.abilityEmoji && typeof frameCount !== 'undefined' && frameCount <= this.abilityEmojiUntil) {
      ctxLocal.fillStyle = '#ffffff';
      ctxLocal.font = '18px sans-serif';
      ctxLocal.textAlign = 'center';
      ctxLocal.textBaseline = 'middle';
      ctxLocal.fillText(this.abilityEmoji, this.x, this.y - this.size - 12);
    }
    ctxLocal.restore();
  }
  update() {
    const canvasLocal = canvas; if (!canvasLocal) return;
    this.atk = this.baseAtk + this.sufferingBonus + this.blitzDmgBonus + this.currentManaBoost;
    let currentSpeed = this.baseSpeed;
    if (this.blitzActive) {
      const count = entities.filter(e => e.isP1 === this.isP1 && e.type === 'triangle').length;
      let boost = count > 0 ? (1 + (2.0 / count)) : 3.0;
      if (this.isPhantom) {
        const eff = getPhantomEfficiency(this.isP1, this.type);
        boost *= eff;
        this.blitzDmgBonus = this.baseAtk * 0.5 * eff;
      } else {
        this.blitzDmgBonus = this.baseAtk * 0.5;
      }
      currentSpeed *= boost;
    } else {
      this.blitzDmgBonus = 0;
    }
    const mag = Math.sqrt(this.vx**2 + this.vy**2);
    if (mag > 0) { this.vx = (this.vx / mag) * currentSpeed; this.vy = (this.vy / mag) * currentSpeed; }

    if (this.noMove) {
      // Skip movement/drift/bounce for debug question figure
      return;
    }

    if (Math.random() < 0.02) {
      const drift = (Math.random() - 0.5) * 0.4;
      const speed = Math.sqrt(this.vx**2 + this.vy**2) || currentSpeed;
      const ang = Math.atan2(this.vy, this.vx) + drift;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
    }

    this.x += this.vx; this.y += this.vy;

    let bounced = false;
    if (this.x < this.size) { this.x = this.size; this.vx = Math.abs(this.vx); bounced = true; }
    else if (this.x > canvasLocal.width - this.size) { this.x = canvasLocal.width - this.size; this.vx = -Math.abs(this.vx); bounced = true; }
    if (this.y < this.size) { this.y = this.size; this.vy = Math.abs(this.vy); bounced = true; }
    else if (this.y > canvasLocal.height - this.size) { this.y = canvasLocal.height - this.size; this.vy = -Math.abs(this.vy); bounced = true; }
    if (bounced) {
      const tweak = (Math.random() - 0.5) * 0.4;
      const speed = Math.sqrt(this.vx**2 + this.vy**2) || currentSpeed;
      const ang = Math.atan2(this.vy, this.vx) + tweak;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
    }

    const nearLeft = this.x <= this.size + 0.5 && this.vx < 0;
    const nearRight = this.x >= canvasLocal.width - this.size - 0.5 && this.vx > 0;
    const nearTop = this.y <= this.size + 0.5 && this.vy < 0;
    const nearBottom = this.y >= canvasLocal.height - this.size - 0.5 && this.vy > 0;
    if (nearLeft || nearRight || nearTop || nearBottom || Math.sqrt(this.vx**2 + this.vy**2) < 0.05) {
      this.edgeStuckFrames++;
    } else {
      this.edgeStuckFrames = 0;
    }
    if (this.edgeStuckFrames > 20) {
      const nudgeAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(nudgeAngle) * currentSpeed;
      this.vy = Math.sin(nudgeAngle) * currentSpeed;
      this.x = Math.min(Math.max(this.x, this.size + 1), canvasLocal.width - this.size - 1);
      this.y = Math.min(Math.max(this.y, this.size + 1), canvasLocal.height - this.size - 1);
      this.edgeStuckFrames = 0;
    }
    if (this.poisoned > 0) {
      this.poisoned -= 1/60;
      if (Math.floor(this.poisoned * 60) % 60 === 0) {
        const eff = this.isPhantom ? getPhantomEfficiency(this.isP1, this.type) : 1;
        this.hp -= this.poisonDmg * eff;
      }
    }
  }
}
