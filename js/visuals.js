import { frameCount, splashes } from './state.js';

/**
 * Renders all visual effects for a shape
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Shape} shape - The shape to render visuals for
 */
export function renderVisuals(ctx, shape) {
  renderSparkles(ctx, shape);
  renderSufferingParticles(ctx, shape);
  renderProbabilityBlur(ctx, shape);
  renderPhantomRings(ctx, shape);
  renderPatriotismFlag(ctx, shape);
  renderInsideJobSilhouettes(ctx, shape);
  renderReversalWater(ctx, shape);
  renderCondensationDrops(ctx, shape);
  renderInterventionCross(ctx, shape);
  renderDogmaShake(ctx, shape);
  renderInterest(ctx, shape);
  renderMourning(ctx, shape);
}

/**
 * Renders damage/healing/mana splashes with stacking behavior
 * Should be called once per frame, not per shape
 */
export function renderSplashes(ctx) {
  if (typeof frameCount === 'undefined') return;
  
  // Clean up expired splashes
  for (let i = splashes.length - 1; i >= 0; i--) {
    const splash = splashes[i];
    const elapsed = frameCount - splash.startFrame;
    if (elapsed > splash.duration) {
      splashes.splice(i, 1);
    }
  }
  
  // Group splashes by position to create stacks
  const stacks = new Map();
  splashes.forEach(splash => {
    const key = `${Math.round(splash.x / 10)}_${Math.round(splash.y / 10)}`;
    if (!stacks.has(key)) {
      stacks.set(key, []);
    }
    stacks.get(key).push(splash);
  });
  
  // Render each stack
  stacks.forEach(stack => {
    // Sort by startFrame - newest first
    stack.sort((a, b) => b.startFrame - a.startFrame);
    
    stack.forEach((splash, index) => {
      const elapsed = frameCount - splash.startFrame;
      const progress = elapsed / splash.duration;
      
      // Position: newest at top, push older ones down
      const yOffset = index * 25;
      const y = splash.y - 30 - yOffset - (elapsed * 0.5);
      
      // Fade out towards end
      const alpha = 1 - Math.pow(progress, 2);
      
      // Scale pulse at start
      const scale = progress < 0.2 ? 1 + (1 - progress / 0.2) * 0.5 : 1;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(20 * scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw colored border for player identification
      const borderColor = splash.isP1 !== undefined ? (splash.isP1 ? '#4d94ff' : '#ff4d4d') : '#000';
      
      // Colored stroke for player identification
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.strokeText(splash.text, splash.x, y);
      
      // Fill with splash color
      ctx.fillStyle = splash.color;
      ctx.fillText(splash.text, splash.x, y);
      
      ctx.restore();
    });
  });
}


/**
 * Wonder of You - White sparkles orbiting the shape
 */
function renderSparkles(ctx, shape) {
  if (!shape.wonderOfYouActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 0;
  
  for (let i = 0; i < 8; i++) {
    const angle = (frameCount * 0.05 + i * Math.PI / 4) % (Math.PI * 2);
    const dist = shape.size * 1.5;
    const sparkleX = shape.x + Math.cos(angle) * dist;
    const sparkleY = shape.y + Math.sin(angle) * dist;
    const sparkleSize = 2 + Math.sin(frameCount * 0.1 + i) * 1;
    
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Suffering - Red particles orbiting the shape
 */
function renderSufferingParticles(ctx, shape) {
  if (!shape.sufferingVisual || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff0000';
  
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const offset = frameCount * 0.03 + i * (Math.PI * 2 / particleCount);
    const radius = shape.size * 0.8 + Math.sin(frameCount * 0.05 + i) * 8;
    const px = shape.x + Math.cos(offset) * radius;
    const py = shape.y + Math.sin(offset) * radius;
    
    const alpha = 0.7 + Math.sin(frameCount * 0.1 + i) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(255, ${Math.floor(alpha * 100)}, 0, ${alpha})`;
    
    ctx.beginPath();
    ctx.arc(px, py, 5 + Math.sin(frameCount * 0.15 + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Probability Alteration - Moving blur/ghost effect
 */
function renderProbabilityBlur(ctx, shape) {
  if (!shape.probabilityActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff00ff';
  
  const blurOffset = Math.sin(frameCount * 0.2) * 8;
  
  ctx.beginPath();
  drawShapePath(ctx, shape, blurOffset);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

/**
 * Extra visual rings for phantoms when effects are active
 */
function renderPhantomRings(ctx, shape) {
  if (!shape.isPhantom) return;
  
  if (shape.blitzActive) {
    ctx.save();
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.size * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  
  if (shape.poisoned > 0) {
    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.size * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Helper function to draw shape path with offset
 */
function drawShapePath(ctx, shape, offsetX = 0) {
  const x = shape.x + offsetX;
  const y = shape.y;
  const size = shape.size;
  
  switch (shape.type) {
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      break;
      
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
      
    case 'circle':
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
      
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(x + size * Math.cos(i * Math.PI / 3), y + size * Math.sin(i * Math.PI / 3));
      }
      break;
      
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 5);
        ctx.lineTo(x + size * Math.cos(ang), y + size * Math.sin(ang));
      }
      break;
      
    case 'rhombus':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      break;
      
    case 'star':
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          Math.cos((18 + i * 72) / 180 * Math.PI) * size + x,
          -Math.sin((18 + i * 72) / 180 * Math.PI) * size + y
        );
        ctx.lineTo(
          Math.cos((54 + i * 72) / 180 * Math.PI) * (size / 2) + x,
          -Math.sin((54 + i * 72) / 180 * Math.PI) * (size / 2) + y
        );
      }
      break;
  }
}

/**
 * Patriotism - Red, white, and blue flag overlay
 */
function renderPatriotismFlag(ctx, shape) {
  if (!shape.patriotismActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  
  // Create clipping path for the shape
  ctx.beginPath();
  drawShapePath(ctx, shape, 0);
  ctx.clip();
  
  ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.1) * 0.1;
  
  // Draw red and white stripes
  const stripeHeight = (shape.size * 2) / 7;
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff0000' : '#ffffff';
    ctx.fillRect(shape.x - shape.size * 1.5, shape.y - shape.size + i * stripeHeight, shape.size * 3, stripeHeight);
  }
  
  // Draw blue canton
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(shape.x - shape.size * 1.5, shape.y - shape.size, shape.size, stripeHeight * 3.5);
  
  // Draw white stars
  ctx.fillStyle = '#ffffff';
  const starCount = 9;
  for (let i = 0; i < starCount; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = shape.x - shape.size * 1.3 + col * (shape.size * 0.3);
    const sy = shape.y - shape.size * 0.8 + row * (stripeHeight * 1.1);
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Inside Job - Two silhouettes swapping positions
 */
function renderInsideJobSilhouettes(ctx, shape) {
  if (!shape.insideJobActive || typeof frameCount === 'undefined') return;
  
  const elapsed = frameCount - shape.insideJobStart;
  const duration = 60; // 1 second
  if (elapsed > duration) {
    shape.insideJobActive = false;
    return;
  }
  
  ctx.save();
  const progress = elapsed / duration;
  const offset = Math.sin(progress * Math.PI) * shape.size * 3;
  
  // Draw two silhouettes swapping positions
  ctx.globalAlpha = 0.5 * (1 - progress);
  ctx.fillStyle = '#00ffff';
  
  // First silhouette moving right
  ctx.beginPath();
  drawShapePath(ctx, shape, offset);
  ctx.fill();
  
  // Second silhouette moving left
  ctx.fillStyle = '#ff00ff';
  ctx.beginPath();
  drawShapePath(ctx, shape, -offset);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Reversal - Moving water/wave effect
 */
function renderReversalWater(ctx, shape) {
  if (!shape.reversalActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  
  // Draw wavy lines across the shape
  for (let i = 0; i < 5; i++) {
    const yOffset = (i - 2) * 5;
    ctx.beginPath();
    for (let x = -shape.size; x <= shape.size; x += 2) {
      const y = yOffset + Math.sin((x / 10) + frameCount * 0.1 + i) * 3;
      if (x === -shape.size) {
        ctx.moveTo(shape.x + x, shape.y + y);
      } else {
        ctx.lineTo(shape.x + x, shape.y + y);
      }
    }
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Condensation - Dripping water droplets
 */
function renderCondensationDrops(ctx, shape) {
  if (!shape.condensationActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.fillStyle = '#4dd2ff';
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#4dd2ff';
  
  // Create dripping effect
  const dropCount = 6;
  for (let i = 0; i < dropCount; i++) {
    const angle = (i / dropCount) * Math.PI * 2;
    const startX = shape.x + Math.cos(angle) * shape.size;
    const startY = shape.y + Math.sin(angle) * shape.size;
    
    // Drop falls down over time
    const dropProgress = ((frameCount * 0.05 + i) % 60) / 60;
    const dropY = startY + dropProgress * shape.size * 2;
    const dropSize = 3 - dropProgress * 2;
    
    if (dropSize > 0.5) {
      ctx.globalAlpha = 1 - dropProgress;
      ctx.beginPath();
      ctx.arc(startX, dropY, dropSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

/**
 * Intervention - Pulsing cross effect
 */
function renderInterventionCross(ctx, shape) {
  if (!shape.interventionActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.strokeStyle = '#ffff00';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ffff00';
  ctx.lineWidth = 3;
  
  const pulse = 1 + Math.sin(frameCount * 0.15) * 0.3;
  const size = shape.size * 1.5 * pulse;
  
  ctx.globalAlpha = 0.8;
  
  // Vertical line
  ctx.beginPath();
  ctx.moveTo(shape.x, shape.y - size);
  ctx.lineTo(shape.x, shape.y + size);
  ctx.stroke();
  
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(shape.x - size, shape.y);
  ctx.lineTo(shape.x + size, shape.y);
  ctx.stroke();
  
  // Small circle at center
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, 4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Dogma - Shake and flicker effect
 * Note: The shake is applied in shape.js draw() by modifying x/y temporarily
 * This function adds a white flicker overlay
 */
function renderDogmaShake(ctx, shape) {
  if (!shape.dogmaActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  
  const flicker = Math.random() > 0.7 ? 0.3 : 0;
  if (flicker > 0) {
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    
    ctx.beginPath();
    drawShapePath(ctx, shape, 0);
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Interest (Usury) - Waving dollar sign
 */
function renderInterest(ctx, shape) {
  if (!shape.interestActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  ctx.fillStyle = '#00ff00';
  ctx.strokeStyle = '#00ff00';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ff00';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Waving motion: side to side and up/down
  const wave = Math.sin(frameCount * 0.15) * 10;
  const bounce = Math.sin(frameCount * 0.2) * 5;
  const scale = 1 + Math.sin(frameCount * 0.1) * 0.1;
  
  ctx.globalAlpha = 0.9;
  ctx.save();
  ctx.translate(shape.x + wave, shape.y - shape.size - 20 + bounce);
  ctx.scale(scale, scale);
  ctx.fillText('$', 0, 0);
  ctx.strokeText('$', 0, 0);
  ctx.restore();
  
  ctx.restore();
}
/**
 * Mourning - Dark pulsing overlay when base is lost
 */
function renderMourning(ctx, shape) {
  if (!shape.mourningActive || typeof frameCount === 'undefined') return;
  
  ctx.save();
  // Dark pulsing overlay - draw a circle around the shape
  const pulse = Math.sin(frameCount * 0.1) * 0.3 + 0.5; // 0.2 to 0.8
  
  // Draw a large dark circle overlay
  const size = (shape.size || 20) * 1.5;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse * 0.6})`;
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw thick red pulsing ring
  ctx.strokeStyle = `rgba(200, 0, 0, ${pulse})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, size * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}