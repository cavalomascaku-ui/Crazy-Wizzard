
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  SETTINGS = 'SETTINGS'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface PlayerStats {
  moveSpeed: number;
  jumpForce: number;
  manaCost: number;
  manaChargeSpeed: number;
  maxMana: number;
  maxHp: number;
  damage: number;
  projectileSpeed: number;
  projectileSize: number;
  piercing: number; // Number of enemies a projectile can pass through
  vampirism: number; // 0 to 1 chance to heal 1 HP on kill
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isGrounded: boolean;
  facingRight: boolean;
  walkFrame: number; // For animation
  isStaffEquipped: boolean; // Is the staff currently in hand?
  staffAnimState: number; // 0.0 (On Back) to 1.0 (In Hand)
  
  // Combat State
  isAttacking: boolean;
  attackFrame: number; // 0 to 4 for staff animation
  isCharging: boolean; // Manual Mana Charge
  
  // Mana System
  mana: number;
  // Stats object for upgrades
  stats: PlayerStats;

  // Health & Damage
  hp: number;
  hitFlashTimer: number; // > 0 means red flash
  invulnerabilityTimer: number;
  isParalyzed: boolean; // Cannot move/act when true
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  hp: number;
  maxHp: number;
  facingRight: boolean;
  
  // Visuals
  hitFlashTimer: number; // > 0 means red flash
  
  // Animation & AI
  state: 'WALK' | 'ATTACK';
  
  // Boss Specifics
  isBoss: boolean;
  bossState: 'NORMAL' | 'TRANSFORMING_PULSE' | 'TRANSFORMING_MORPH' | 'TRANSFORMING_WAIT' | 'IDLE' | 'ATTACK_SWORD' | 'ATTACK_METEOR' | 'ATTACK_MANA';
  bossTimer: number; // Generic timer for states
  bossAnimFrame: number; // Specific frame counter for boss
  
  walkTimer: number; // For the "waddle" rotation
  attackFrame: number;
  attackCooldown: number;
}

export interface MobileInputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  aimX: number; // -1 to 1
  aimY: number; // -1 to 1
  isJumping: boolean;
  isShooting: boolean;
  isCharging: boolean; // Manual Reload button
  active: boolean; // if true, input comes from touch
}

export interface Card {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  apply: (stats: PlayerStats) => void;
}
