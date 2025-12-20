export const SHAPE_DATA = {
  // Triangle: Fragile, high speed. Low defense forces reliance on evasion and swarm tactics.
  triangle: { hp: 100, size: 24, color: '#ff4d4d', atk: 6, defense: 0, baseSpeed: 4.5, skills: { buff: 'blitz', atk: 'poison', ult: 'phantom' } },
  
  // Square: The true Tank. High HP and highest base defense to shrug off minor collisions.
  square: { hp: 250, size: 24, color: '#4d94ff', atk: 8, defense: 3, baseSpeed: 3.5, skills: { buff: 'shield', atk: 'mine', ult: 'suffering' } },
  
  // Star: Moderate defense. Needs to survive long enough to trigger Interest.
  star: { hp: 140, size: 24, color: '#ffff4d', atk: 5, defense: 1, baseSpeed: 4.2, skills: { buff: 'victim', atk: 'starRay', ult: 'usury' } },
  
  // Hexagon: "Holy Armor". Low HP (80) but high base Defense (4). 
  // Combined with Dogma (+2), it effectively ignores 6 damage per hit, making it a nightmare for low-atk shapes like Triangle.
  hexagon: { hp: 80, size: 24, color: '#ff4dff', atk: 4, defense: 4, baseSpeed: 3.8, skills: { buff: 'dogma', atk: 'inquisition', ult: 'divineBlessing' } },
  
  // Circle: Beefy stats to compensate for low mobility and the need to stand ground in Domain.
  circle: { hp: 200, size: 24, color: '#00ff00', atk: 7, defense: 2, baseSpeed: 3.2, skills: { buff: 'reversal', atk: 'condensation', ult: 'domainExpansion' } },
  
  // Pentagon: Average defense. Reliant on its versatile kit and the Inside Job "reset".
  pentagon: { hp: 160, size: 24, color: '#ffaa33', atk: 5, defense: 1, baseSpeed: 3.5, skills: { buff: 'patriotism', atk: 'foreignBase', ult: 'insideJob' } },
  
  // Rhombus: Solid all-around stats. High HP makes it a reliable duelist.
  rhombus: { hp: 180, size: 24, color: '#ff1493', atk: 4, defense: 1, baseSpeed: 4.0, skills: { buff: 'probabilityAlteration', atk: 'ddos', ult: 'wonderOfYou' } }
};