import { logDisplay, logMessages } from './state.js';
import { SHAPE_DATA } from './config.js';
import { abilities } from './state.js';

export function addLog(message) {
  logMessages.unshift({ text: message, age: 0 });
  if (logMessages.length > 3) logMessages.splice(3);
  logMessages.forEach((msg, idx) => { msg.age = idx; });
  if (logDisplay) {
    logDisplay.innerHTML = logMessages.map((msg, idx) => {
      const fadeClass = idx > 0 ? 'fade' : '';
      return `<div class="log-entry ${fadeClass}">${msg.text}</div>`;
    }).join('');
  }
}

export function updateLegends(p1Type, p2Type) {
  const p1Skills = SHAPE_DATA[p1Type].skills;
  const p2Skills = SHAPE_DATA[p2Type].skills;
  const p1BuffAbility = abilities[p1Skills.buff] || { name: '', description: '', cost: 0 };
  const p1AtkAbility = abilities[p1Skills.atk] || { name: '', description: '', cost: 0 };
  const p1UltAbility = abilities[p1Skills.ult] || { name: '', description: '', cost: 0 };
  const p2BuffAbility = abilities[p2Skills.buff] || { name: '', description: '', cost: 0 };
  const p2AtkAbility = abilities[p2Skills.atk] || { name: '', description: '', cost: 0 };
  const p2UltAbility = abilities[p2Skills.ult] || { name: '', description: '', cost: 0 };

  const nameWithEmoji = (a) => a ? `${a.emoji ? a.emoji + ' ' : ''}${a.name}` : '';
  document.getElementById('p1-legend').innerHTML = `<table>
    <tr><th>TYPE</th><th>EFFECT</th></tr>
    <tr><td>BUFF (1)</td><td>${nameWithEmoji(p1BuffAbility)} (Cost: ${p1BuffAbility.cost}): ${p1BuffAbility.description}</td></tr>
    <tr><td>ATK (2)</td><td>${nameWithEmoji(p1AtkAbility)} (Cost: ${p1AtkAbility.cost}): ${p1AtkAbility.description}</td></tr>
    <tr><td>ULT (3)</td><td>${nameWithEmoji(p1UltAbility)} (Cost: ${p1UltAbility.cost}): ${p1UltAbility.description}</td></tr>
  </table>`;
  document.getElementById('p2-legend').innerHTML = `<table>
    <tr><th>TYPE</th><th>EFFECT</th></tr>
    <tr><td>BUFF (4)</td><td>${nameWithEmoji(p2BuffAbility)} (Cost: ${p2BuffAbility.cost}): ${p2BuffAbility.description}</td></tr>
    <tr><td>ATK (5)</td><td>${nameWithEmoji(p2AtkAbility)} (Cost: ${p2AtkAbility.cost}): ${p2AtkAbility.description}</td></tr>
    <tr><td>ULT (6)</td><td>${nameWithEmoji(p2UltAbility)} (Cost: ${p2UltAbility.cost}): ${p2UltAbility.description}</td></tr>
  </table>`;
}

export function updateAbilityUI(p1, p2) {
  const p1Box = document.getElementById('p1-ability');
  const p2Box = document.getElementById('p2-ability');
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
