
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player, Particle, MobileInputState, Enemy, Card, PlayerStats, Meteor } from '../types';
import MobileControls from './MobileControls';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  GROUND_Y, 
  COLOR_WHITE 
} from '../constants';

interface StageOneProps {
  setGameState: (state: GameState) => void;
  sfxVolume: number; 
  isTouchDevice: boolean; 
}

interface GrassBlade {
  x: number;
  height: number;
  lean: number;
  maxLean: number;
}

interface Bat {
  angle: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  centerX: number;
  centerY: number;
  size: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  frame: number;
  active: boolean;
  audio?: HTMLAudioElement;
  damage: number;
  size: number;
  piercing: number; // How many enemies can it pass through?
  hitEnemies: number[]; // IDs of enemies already hit to prevent multi-hit on same frame/pass
}

const WALL_WIDTH = 40;
const BACKGROUND_IMAGE_URL = "https://i.imgur.com/Mh40r7w.png";
const PLAYER_SPRITE_URL = "https://i.imgur.com/wwOpQgA.png";
const STAFF_SPRITE_URL = "https://i.imgur.com/ilFHqiv.png";
const PROJECTILE_SPRITE_URL = "https://i.imgur.com/f6Ng2Dh.png";

// New Boss Assets
const ENEMY_BASE_URL = "https://i.imgur.com/e1uHmuW.png"; // Walk (0), Atk(1,2), Transf(3-10), BossWalk(10)
const BOSS_ATTACK_URL = "https://i.imgur.com/OSreR7n.png"; // Sword(0,1), Sheath(2), Meteor(3), Mana(4)

// HUD Assets
const MANA_BAR_EMPTY_URL = "https://i.imgur.com/1DZTFII.png"; 
const MANA_BAR_FILL_URL = "https://i.imgur.com/wJnrWwp.png";  
const TRIANGLE_SPRITE_URL = "https://i.imgur.com/Z9bb1pT.png";
const SFX_MANA_FULL_URL = "https://pgs92212.github.io/bruxo-maluco/sons/barradegama.mp3";

const SFX_WALK_URL = "https://pgs92212.github.io/bruxo-maluco/sons/andandograma.mp3";
const SFX_PROJECTILE_URL = "https://pgs92212.github.io/bruxo-maluco/sons/projetilsom.mp3";

// Initial Config
const INITIAL_MAX_HP = 3;
const BASE_ENEMY_SPAWN_RATE = 200; 

// Helper for Linear Interpolation
const lerp = (start: number, end: number, t: number) => {
  return start + (end - start) * t;
};

// --- CARDS DATABASE ---
const CARDS_POOL: Card[] = [
  {
    id: 'mana_discharge',
    name: 'Mana Discharge',
    description: 'Mana cost reduced by 25%.',
    imageUrl: 'https://i.imgur.com/Ye9M5BR.jpeg', // Vortex Logic
    apply: (s) => { s.manaCost *= 0.75; }
  },
  {
    id: 'arcane_flow',
    name: 'Arcane Flow',
    description: 'Recharge speed +40%.',
    imageUrl: 'https://i.imgur.com/Ye9M5BR.jpeg', // Vortex
    apply: (s) => { s.manaChargeSpeed *= 1.4; }
  },
  {
    id: 'deep_reserves',
    name: 'Deep Reserves',
    description: 'Max Mana +60.',
    imageUrl: 'https://i.imgur.com/YLCWNB5.jpeg', // Taça transbordando
    apply: (s) => { s.maxMana += 60; }
  },
  {
    id: 'glass_wand',
    name: 'Glass Wand',
    description: 'Damage x2, but Max HP -1.',
    imageUrl: 'https://i.imgur.com/gbeZ4ro.jpeg', // Varinha Quebrada
    apply: (s) => { s.damage *= 2.0; s.maxHp = Math.max(1, s.maxHp - 1); }
  },
  {
    id: 'stone_skin',
    name: 'Stone Skin',
    description: 'Max HP +1.',
    imageUrl: 'https://i.imgur.com/rQposon.jpeg', // Capacete
    apply: (s) => { s.maxHp += 1; }
  },
  {
    id: 'haste',
    name: 'Haste',
    description: 'Move Speed +20%.',
    imageUrl: 'https://i.imgur.com/eSU99VA.jpeg', // Bota com asa
    apply: (s) => { s.moveSpeed *= 1.2; }
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'Projectile Speed +40%, Range +.',
    imageUrl: 'https://i.imgur.com/IV0iIOX.jpeg', // Sniper
    apply: (s) => { s.projectileSpeed *= 1.4; }
  },
  {
    id: 'giant_slayer',
    name: 'Giant Slayer',
    description: 'Projectile Size +60%.',
    imageUrl: 'https://i.imgur.com/15p3qAa.jpeg', // Bola de mana esmagando crânio
    apply: (s) => { s.projectileSize *= 1.6; }
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    description: 'Damage +30%, Cost +10%.',
    imageUrl: 'https://i.imgur.com/LhCRz8r.jpeg', // Raio
    apply: (s) => { s.damage *= 1.3; s.manaCost *= 1.1; }
  },
  {
    id: 'blood_rite',
    name: 'Blood Rite',
    description: 'Vampirism: 15% chance to heal on kill.',
    imageUrl: 'https://i.imgur.com/jVbNsfY.jpeg', // Vampirismo
    apply: (s) => { s.vampirism = Math.min(1.0, s.vampirism + 0.15); }
  },
  {
    id: 'soul_piercer',
    name: 'Soul Piercer',
    description: 'Projectiles pierce +1 enemy.',
    imageUrl: 'https://i.imgur.com/LwTmPCE.jpeg', // Perfuração
    apply: (s) => { s.piercing += 1; }
  },
  {
    id: 'feather_weight',
    name: 'Feather',
    description: 'Jump +20%, Fall Slower.',
    imageUrl: 'https://i.imgur.com/eSU99VA.jpeg', // Reusing Boot logic for agility
    apply: (s) => { s.jumpForce *= 1.1; }
  }
];

const StageOne: React.FC<StageOneProps> = ({ setGameState, sfxVolume, isTouchDevice }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groundTextureRef = useRef<HTMLCanvasElement | null>(null);
  const wallTextureRef = useRef<HTMLCanvasElement | null>(null);
  
  const isTouchModeRef = useRef<boolean>(isTouchDevice);
  const [levelUpCards, setLevelUpCards] = useState<Card[]>([]);
  const [showLevelUpScreen, setShowLevelUpScreen] = useState(false);
  
  // Animation State for Selection
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isAnimatingSelection, setIsAnimatingSelection] = useState(false);

  // Input References
  const mobileInputRef = useRef<MobileInputState>({
    moveX: 0, moveY: 0, aimX: 0, aimY: 0,
    isJumping: false, isShooting: false, isCharging: false, active: false
  });

  // Audio Refs
  const walkAudioRef = useRef<HTMLAudioElement | null>(null);
  const manaFullAudioRef = useRef<HTMLAudioElement | null>(null);
  const wasManaFullRef = useRef<boolean>(false);
  
  // Game Logic Refs
  const pausedRef = useRef<boolean>(false);
  const warningMsgRef = useRef<{text: string, timer: number}>({text: '', timer: 0});
  const screenShakeRef = useRef<number>(0);
  
  // Wave Logic
  const waveRef = useRef(1);
  const enemiesKilledInWaveRef = useRef(0);
  const enemiesToKillRef = useRef(5); 
  const enemySpawnTimerRef = useRef<number>(0);
  const enemyIdCounter = useRef<number>(0);
  const enemiesSpawnedInWaveRef = useRef(0);
  
  // Boss Logic
  const hasBossSpawnedRef = useRef(false);

  // Image Refs
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const staffImageRef = useRef<HTMLImageElement | null>(null);
  const projectileImageRef = useRef<HTMLImageElement | null>(null);
  const enemyBaseImageRef = useRef<HTMLImageElement | null>(null);
  const bossAttackImageRef = useRef<HTMLImageElement | null>(null);
  const manaBarEmptyRef = useRef<HTMLImageElement | null>(null);
  const manaBarFillRef = useRef<HTMLImageElement | null>(null);
  const triangleImageRef = useRef<HTMLImageElement | null>(null);
  
  // Game Entities Refs
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2,
    y: GROUND_Y - 48,
    width: 24, 
    height: 48, 
    vy: 0,
    isGrounded: true,
    facingRight: true,
    walkFrame: 0,
    isStaffEquipped: false,
    staffAnimState: 0,      
    isAttacking: false,
    attackFrame: 0,
    isCharging: false,
    mana: 100,
    hp: INITIAL_MAX_HP,
    hitFlashTimer: 0,
    invulnerabilityTimer: 0,
    isParalyzed: false,
    // Dynamic Stats
    stats: {
      moveSpeed: 4,
      jumpForce: -10,
      manaCost: 15,
      manaChargeSpeed: 0.3,
      maxMana: 100,
      maxHp: INITIAL_MAX_HP,
      damage: 15,
      projectileSpeed: 5,
      projectileSize: 1.0,
      piercing: 0,
      vampirism: 0
    }
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const grassRef = useRef<GrassBlade[]>([]);
  const batsRef = useRef<Bat[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  
  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  // --- LOGIC: SELECT CARDS ---
  const pickRandomCards = () => {
    const shuffled = [...CARDS_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const initiateCardSelect = (card: Card) => {
    if (isAnimatingSelection) return;

    setSelectedCardId(card.id);
    setIsAnimatingSelection(true);

    // Play animation then apply stats
    setTimeout(() => {
        applyCardAndResume(card);
    }, 1500);
  };

  const applyCardAndResume = (card: Card) => {
    card.apply(playerRef.current.stats);
    
    // Heal Logic: On level up, restore HP to new Max HP
    playerRef.current.hp = playerRef.current.stats.maxHp; 
    
    // Reset for next wave
    waveRef.current++;
    enemiesKilledInWaveRef.current = 0;
    enemiesSpawnedInWaveRef.current = 0;
    enemiesToKillRef.current = 5 + (waveRef.current * 3); // Scaling steeper
    hasBossSpawnedRef.current = false;
    
    // Clear projectiles/enemies (cleanup)
    projectilesRef.current = [];
    enemiesRef.current = []; 
    meteorsRef.current = [];
    
    // Reset selection state
    setIsAnimatingSelection(false);
    setSelectedCardId(null);
    setShowLevelUpScreen(false);
    pausedRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // --- SETUP AUDIO ---
    if (!walkAudioRef.current) {
      const audio = new Audio(SFX_WALK_URL);
      audio.loop = true;
      walkAudioRef.current = audio;
    }
    if (!manaFullAudioRef.current) {
      const audio = new Audio(SFX_MANA_FULL_URL);
      manaFullAudioRef.current = audio;
    }

    // --- LOAD IMAGES ---
    const loadImg = (url: string) => {
      const img = new Image();
      img.src = url;
      return img;
    };

    if (!bgImageRef.current) bgImageRef.current = loadImg(BACKGROUND_IMAGE_URL);
    if (!playerImageRef.current) playerImageRef.current = loadImg(PLAYER_SPRITE_URL);
    if (!staffImageRef.current) staffImageRef.current = loadImg(STAFF_SPRITE_URL);
    if (!projectileImageRef.current) projectileImageRef.current = loadImg(PROJECTILE_SPRITE_URL);
    if (!enemyBaseImageRef.current) enemyBaseImageRef.current = loadImg(ENEMY_BASE_URL);
    if (!bossAttackImageRef.current) bossAttackImageRef.current = loadImg(BOSS_ATTACK_URL);
    
    if (!manaBarEmptyRef.current) manaBarEmptyRef.current = loadImg(MANA_BAR_EMPTY_URL);
    if (!manaBarFillRef.current) manaBarFillRef.current = loadImg(MANA_BAR_FILL_URL);
    if (!triangleImageRef.current) triangleImageRef.current = loadImg(TRIANGLE_SPRITE_URL);

    // --- INITIALIZE BATS ---
    if (batsRef.current.length === 0) {
      const towerX = CANVAS_WIDTH * 0.5;
      const towerY = CANVAS_HEIGHT * 0.35 - 100; 
      
      for(let i = 0; i < 12; i++) {
        batsRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radiusX: 60 + Math.random() * 80,
          radiusY: 20 + Math.random() * 30,
          speed: (Math.random() > 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.01),
          centerX: towerX,
          centerY: towerY,
          size: 1 + Math.random() * 2
        });
      }
    }

    // --- GENERATE TEXTURES ---
    if (!groundTextureRef.current) {
      const h = CANVAS_HEIGHT - GROUND_Y;
      const w = CANVAS_WIDTH;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const oCtx = offCanvas.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = '#000000'; oCtx.fillRect(0, 0, w, h);
        oCtx.fillStyle = COLOR_WHITE; oCtx.fillRect(0, 0, w, 4);
        for(let y = 4; y < h; y += 2) {
          for(let x = 0; x < w; x += 2) {
             if (Math.random() < 0.1) oCtx.fillRect(x, y, 2, 2);
          }
        }
        for(let i=0; i<30; i++) {
           const rw = 12 + Math.random() * 24;
           const rh = 8 + Math.random() * 12;
           const rx = Math.random() * (w - rw);
           const ry = 4 + Math.random() * (h - rh - 4);
           oCtx.fillRect(rx, ry, rw, rh); 
           oCtx.fillStyle = '#000000'; oCtx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);
           oCtx.fillStyle = COLOR_WHITE;
        }
      }
      groundTextureRef.current = offCanvas;
    }

    if (!wallTextureRef.current) {
        const w = WALL_WIDTH;
        const h = CANVAS_HEIGHT;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const oCtx = offCanvas.getContext('2d');
        if (oCtx) {
            oCtx.fillStyle = '#000000'; oCtx.fillRect(0, 0, w, h);
            oCtx.fillStyle = COLOR_WHITE;
            for (let x = 0; x < w; x+=10) if(Math.random() > 0.5) oCtx.fillRect(x, 0, 1, h);
            const brickH = 32;
            for (let y = 0; y < h; y += brickH) {
                 oCtx.fillRect(0, y, w, 1);
                 for (let k=0; k<10; k++) {
                     const px = Math.random() * w; const py = y + Math.random() * brickH;
                     oCtx.fillRect(px, py, 1, 1);
                 }
            }
            for (let i=0; i<50; i++) {
                const bx = Math.random() * w; const by = Math.random() * h;
                const bw = Math.random() * 10 + 5; const bh = Math.random() * 20 + 5;
                oCtx.fillStyle = '#000000'; oCtx.fillRect(bx, by, bw, bh);
            }
            oCtx.fillStyle = COLOR_WHITE; oCtx.fillRect(w-2, 0, 2, h); 
        }
        wallTextureRef.current = offCanvas;
    }

    // --- GRASS ---
    if (grassRef.current.length === 0) {
      const startX = WALL_WIDTH + 5;
      const endX = CANVAS_WIDTH - WALL_WIDTH - 5;
      const density = 4;
      for (let x = startX; x < endX; x += Math.random() * density + 2) {
        grassRef.current.push({
          x: x,
          height: 8 + Math.random() * 8,
          lean: 0,
          maxLean: 10 + Math.random() * 10 
        });
      }
    }

    // Input handlers
    const handleTouchDetected = () => {
        isTouchModeRef.current = true;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLevelUpScreen) return; // Block input during level up

      if (e.key === 'Escape') {
        pausedRef.current = !pausedRef.current;
        if (pausedRef.current && walkAudioRef.current) walkAudioRef.current.pause();
        return;
      }
      if (pausedRef.current) {
          if (e.key.toLowerCase() === 'q') setGameState(GameState.MENU);
          return; 
      }
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'e') {
        playerRef.current.isStaffEquipped = !playerRef.current.isStaffEquipped;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (pausedRef.current || showLevelUpScreen) return;
      if (isTouchModeRef.current) return;
      if (mobileInputRef.current.active) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (pausedRef.current || showLevelUpScreen) return;
      if (isTouchModeRef.current) return;
      if (mobileInputRef.current.active) return;

      if (e.button === 0) { 
        if (playerRef.current.isParalyzed) return;

        const player = playerRef.current;
        const cost = player.stats.manaCost;
        if (player.isStaffEquipped && !player.isAttacking && !player.isCharging && player.mana >= cost) {
          player.isAttacking = true;
          player.attackFrame = 0;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchDetected);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    let animationFrameId: number;

    const spawnTrail = (x: number, y: number, color: string = COLOR_WHITE) => {
      if (Math.random() > 0.5) return;
      particlesRef.current.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 10 - 5),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        size: Math.random() * 2 + 1
      });
    };
    
    const spawnSmoke = (x: number, y: number) => {
        for(let i=0; i<8; i++) {
            particlesRef.current.push({
                x: x, 
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 2,
                life: 2.0,
                size: 2 + Math.random() * 4
            });
        }
    };

    const spawnBlood = (x: number, y: number) => {
       for(let i=0; i<5; i++) {
         particlesRef.current.push({
           x: x, y: y,
           vx: (Math.random() - 0.5) * 4,
           vy: (Math.random() - 1) * 4,
           life: 1.0,
           size: Math.random() * 3 + 1
         });
       }
    };

    const spawnHealEffect = (x: number, y: number) => {
       for(let i=0; i<8; i++) {
         particlesRef.current.push({
           x: x + (Math.random() * 20 - 10), 
           y: y + (Math.random() * 20 - 10),
           vx: 0,
           vy: -1 - Math.random(),
           life: 1.5,
           size: 3
         });
       }
    };
    
    const spawnManaDrainParticle = (sourceX: number, sourceY: number, destX: number, destY: number) => {
        const dx = destX - sourceX;
        const dy = destY - sourceY;
        const angle = Math.atan2(dy, dx);
        const speed = 4 + Math.random() * 2;
        
        particlesRef.current.push({
            x: sourceX,
            y: sourceY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6,
            size: 3 + Math.random() * 2
        });
    }

    const spawnShootingStar = () => {
        if (Math.random() > 0.995) {
            shootingStarsRef.current.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * (CANVAS_HEIGHT * 0.5),
                vx: -2 - Math.random() * 4,
                vy: 1 + Math.random() * 2,
                length: 20 + Math.random() * 30,
                life: 1.0
            });
        }
    }

    const fireProjectile = (angle: number, startX: number, startY: number) => {
      const stats = playerRef.current.stats;
      const speed = stats.projectileSpeed;
      const sfx = new Audio(SFX_PROJECTILE_URL);
      sfx.volume = 0.25 * sfxVolume; // Apply Volume
      sfx.play().catch(e => console.warn("Audio play blocked", e));

      projectilesRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: angle,
        frame: 0,
        active: true,
        audio: sfx,
        damage: stats.damage,
        size: stats.projectileSize,
        piercing: stats.piercing,
        hitEnemies: []
      });
    };

    const spawnEnemy = () => {
        // Can we spawn more?
        if (enemiesSpawnedInWaveRef.current >= enemiesToKillRef.current && !hasBossSpawnedRef.current) return;
        // Don't spawn if boss is alive
        if (enemiesRef.current.some(e => e.isBoss)) return;

        enemyIdCounter.current++;
        enemiesSpawnedInWaveRef.current++;
        const isLeft = Math.random() > 0.5;
        const spawnX = isLeft ? -50 : CANVAS_WIDTH + 50;
        
        const enemyW = 40; 
        // Adjusted from 100 to 70 to match 79px visual height + offset
        const enemyH = 70; 

        // Scaling HP based on wave
        const hp = 30 + (waveRef.current * 8); 

        enemiesRef.current.push({
            id: enemyIdCounter.current,
            x: spawnX,
            y: GROUND_Y - enemyH,
            width: enemyW,
            height: enemyH,
            vx: 0,
            hp: hp,
            maxHp: hp,
            facingRight: !isLeft,
            state: 'WALK',
            walkTimer: Math.random() * 100,
            attackFrame: 0,
            attackCooldown: 0,
            hitFlashTimer: 0,
            isBoss: false,
            bossState: 'NORMAL',
            bossTimer: 0,
            bossAnimFrame: 0
        });
    };

    const update = () => {
      if (showLevelUpScreen) return; // Completely pause updates

      frameRef.current++;
      const player = playerRef.current;
      const stats = player.stats;
      const mobile = mobileInputRef.current;
      
      let isMoving = false; 

      // Screen Shake Decay
      if (screenShakeRef.current > 0) screenShakeRef.current = Math.max(0, screenShakeRef.current - 1);

      // --- WARNING MESSAGE TIMER ---
      if (warningMsgRef.current.timer > 0) warningMsgRef.current.timer--;

      // --- ENEMY SPAWNER ---
      enemySpawnTimerRef.current++;
      const spawnRate = Math.max(50, BASE_ENEMY_SPAWN_RATE - (waveRef.current * 10));
      
      if (enemySpawnTimerRef.current > spawnRate) {
          spawnEnemy();
          enemySpawnTimerRef.current = 0;
      }

      // --- CHECK WAVE CLEAR ---
      // Modified: Wait for boss if it exists
      if (enemiesSpawnedInWaveRef.current >= enemiesToKillRef.current && enemiesRef.current.length === 0) {
          pausedRef.current = true;
          setLevelUpCards(pickRandomCards());
          setShowLevelUpScreen(true);
          return;
      }

      // --- PLAYER INPUT ---
      // If Paralyzed, skip all input logic
      if (!player.isParalyzed) {

        const isAimingMobile = mobile.active && (Math.abs(mobile.aimX) > 0.1 || Math.abs(mobile.aimY) > 0.1);

        if (isAimingMobile) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const aimDist = 200;
            mouseRef.current = {
            x: pCenterX + mobile.aimX * aimDist,
            y: pCenterY + mobile.aimY * aimDist
            };
            player.isStaffEquipped = true;
        } else if (isTouchModeRef.current) {
            if (!player.isAttacking && !player.isCharging) {
                player.isStaffEquipped = false;
            }
        }
        
        // CHARGING LOGIC (PC + MOBILE)
        const isChargeInput = keysRef.current['r'] || keysRef.current['shift'] || mobile.isCharging;
        
        if (isChargeInput) {
            if (!player.isCharging) {
                if (player.mana < stats.manaCost) {
                    player.isCharging = true;
                } else {
                    warningMsgRef.current = { text: "USE REMAINING MANA!", timer: 60 };
                }
            }
        } else {
            player.isCharging = false;
        }

        if (player.isCharging) {
            player.isStaffEquipped = true; 
            if (player.mana < stats.maxMana) {
                player.mana += stats.manaChargeSpeed;
                if (player.mana >= stats.maxMana) {
                player.mana = stats.maxMana;
                if (!wasManaFullRef.current && manaFullAudioRef.current) {
                    manaFullAudioRef.current.volume = 0.5 * sfxVolume;
                    manaFullAudioRef.current.currentTime = 1; 
                    manaFullAudioRef.current.play().catch(e => console.warn("Mana audio blocked", e));
                    wasManaFullRef.current = true;
                }
                } else {
                    wasManaFullRef.current = false;
                }
            }
        } else {
            wasManaFullRef.current = false;
        }

        if (mobile.active && mobile.isShooting) {
            if (player.isStaffEquipped && !player.isAttacking && !player.isCharging && player.mana >= stats.manaCost) {
                player.isAttacking = true;
                player.attackFrame = 0;
            }
        }

        const isKeyLeft = keysRef.current['a'] || keysRef.current['arrowleft'];
        const isKeyRight = keysRef.current['d'] || keysRef.current['arrowright'];
        const isMobileLeft = mobile.moveX < -0.2;
        const isMobileRight = mobile.moveX > 0.2;
        const isMovingLeft = isKeyLeft || isMobileLeft;
        const isMovingRight = isKeyRight || isMobileRight;
        isMoving = isMovingLeft || isMovingRight;

        // --- WALK SOUND ---
        if (walkAudioRef.current) {
            walkAudioRef.current.volume = 0.3 * sfxVolume; 
            if (isMoving && player.isGrounded && !pausedRef.current) {
            if (walkAudioRef.current.paused) {
                walkAudioRef.current.play().catch(e => console.warn("Walk audio blocked", e));
            }
            } else {
            if (!walkAudioRef.current.paused) {
                walkAudioRef.current.pause();
                walkAudioRef.current.currentTime = 0;
            }
            }
        }

        // --- PLAYER FACING ---
        const playerCenterX = player.x + player.width / 2;
        if (player.isStaffEquipped && !player.isCharging) {
            if (!isTouchModeRef.current || isAimingMobile) {
                player.facingRight = mouseRef.current.x >= playerCenterX;
            } else if (isTouchModeRef.current) {
                if (isMovingRight) player.facingRight = true;
                if (isMovingLeft) player.facingRight = false;
            }
        } else {
            if (isMovingRight) player.facingRight = true;
            if (isMovingLeft) player.facingRight = false;
        }

        // --- PLAYER MOVEMENT ---
        if (isMoving && player.isGrounded) player.walkFrame += 0.2;
        else player.walkFrame = 0;
        
        if (isMovingLeft) {
            player.x -= stats.moveSpeed;
            if (player.isGrounded) spawnTrail(player.x + player.width, player.y + player.height);
        }
        if (isMovingRight) {
            player.x += stats.moveSpeed;
            if (player.isGrounded) spawnTrail(player.x, player.y + player.height);
        }

        const isJumpKey = keysRef.current['w'] || keysRef.current['arrowup'] || keysRef.current[' '];
        const isJumpMobile = mobile.isJumping;
        if ((isJumpKey || isJumpMobile) && player.isGrounded) {
            player.vy = stats.jumpForce;
            player.isGrounded = false;
            for(let i=0; i<5; i++) spawnTrail(player.x + player.width/2, player.y + player.height);
        }

        // --- PLAYER COMBAT FIRE ---
        const playerCenterY = player.y + player.height / 2;
        let angleToMouse = Math.atan2(mouseRef.current.y - playerCenterY, mouseRef.current.x - playerCenterX);
        if (isTouchModeRef.current && !isAimingMobile) {
            angleToMouse = player.facingRight ? 0 : Math.PI;
        }

        if (player.isAttacking) {
            const prevFrame = Math.floor(player.attackFrame);
            player.attackFrame += 0.25; 
            const currentFrame = Math.floor(player.attackFrame);
            if (prevFrame < 3 && currentFrame === 3) {
                const staffLen = 50; 
                const tipX = playerCenterX + Math.cos(angleToMouse) * staffLen;
                const tipY = playerCenterY + Math.sin(angleToMouse) * staffLen + 10;
                player.mana -= stats.manaCost;
                fireProjectile(angleToMouse, tipX, tipY);
            }
            if (player.attackFrame >= 4) {
            player.isAttacking = false;
            player.attackFrame = 0;
            }
        }

      } else {
          // Player IS Paralyzed
          player.isCharging = false;
          player.isAttacking = false;
          // Reverse Staff Animation logic handled in Draw/Render via staffAnimState override?
          // We will handle the visual reverse in the render loop based on player.isParalyzed
      }

      // --- PLAYER PHYSICS (Always applied) ---
      player.vy += GRAVITY;
      player.y += player.vy;
      if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.isGrounded = true;
      } else {
        player.isGrounded = false;
      }
      
      // Boundaries
      if (player.x < WALL_WIDTH) player.x = WALL_WIDTH;
      if (player.x + player.width > CANVAS_WIDTH - WALL_WIDTH) player.x = CANVAS_WIDTH - WALL_WIDTH - player.width;

      // --- PLAYER STAFF ANIM (Always applied) ---
      const EQUIP_SPEED = 0.15;
      if (player.isStaffEquipped && player.staffAnimState < 1) {
        player.staffAnimState += EQUIP_SPEED;
        if (player.staffAnimState > 1) player.staffAnimState = 1;
      } else if (!player.isStaffEquipped && player.staffAnimState > 0) {
        player.staffAnimState -= EQUIP_SPEED;
        if (player.staffAnimState < 0) player.staffAnimState = 0;
      }

      // --- PLAYER DAMAGE STATES ---
      if (player.hitFlashTimer > 0) player.hitFlashTimer--;
      if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer--;

      const playerCenterX = player.x + player.width / 2;

      // --- ENEMY LOGIC ---
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        const distToPlayer = playerCenterX - (enemy.x + enemy.width/2);
        
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - 1);
        
        // --- BOSS LOGIC ---
        if (enemy.isBoss) {
            
            // State Machine
            if (enemy.bossState === 'TRANSFORMING_PULSE') {
                player.isParalyzed = true;
                enemy.bossTimer++;
                // 2 seconds @ 60fps = 120 frames
                if (enemy.bossTimer > 120) {
                    enemy.bossState = 'TRANSFORMING_MORPH';
                    enemy.bossTimer = 0;
                    enemy.bossAnimFrame = 4; // Start from sprite 4
                }
            }
            else if (enemy.bossState === 'TRANSFORMING_MORPH') {
                enemy.bossTimer++;
                if (enemy.bossTimer % 10 === 0) { // Speed of morph
                    enemy.bossAnimFrame++;
                    if (enemy.bossAnimFrame > 10) {
                        enemy.bossState = 'TRANSFORMING_WAIT';
                        enemy.bossTimer = 0;
                    }
                }
            }
            else if (enemy.bossState === 'TRANSFORMING_WAIT') {
                enemy.bossTimer++;
                // 0.7s @ 60fps ~= 42 frames
                if (enemy.bossTimer > 42) {
                    enemy.bossState = 'IDLE';
                    enemy.bossAnimFrame = 10; // Idle Sprite
                    player.isParalyzed = false;
                    enemy.hp = 200 + (waveRef.current * 50); // Boss HP
                    enemy.maxHp = enemy.hp;
                }
            }
            else if (enemy.bossState === 'IDLE') {
                 enemy.bossTimer++;
                 // AI: Face player & CHASE
                 enemy.facingRight = distToPlayer > 0;
                 const dir = distToPlayer > 0 ? 1 : -1;
                 
                 // Movement for Boss
                 if (Math.abs(distToPlayer) > 40) {
                     enemy.x += dir * 0.8; // Boss is faster than normal enemies
                     enemy.walkTimer += 0.2;
                 }

                 // Cooldown for attack
                 if (enemy.bossTimer > 80) { // Attack every ~1.3s
                     const roll = Math.random();
                     enemy.bossTimer = 0;

                     const distAbs = Math.abs(distToPlayer);
                     
                     // Attack Decision Logic: Sword only when close (< 120px)
                     if (distAbs < 120) {
                         if (roll < 0.7) {
                             enemy.bossState = 'ATTACK_SWORD';
                             enemy.bossAnimFrame = 0;
                         } else {
                             // Small chance to use Mana drain even close
                             enemy.bossState = 'ATTACK_MANA';
                             enemy.bossAnimFrame = 4;
                         }
                     } else {
                         // Ranged Only
                         if (roll < 0.6) {
                             enemy.bossState = 'ATTACK_METEOR';
                             enemy.bossAnimFrame = 3;
                         } else {
                             enemy.bossState = 'ATTACK_MANA';
                             enemy.bossAnimFrame = 4;
                         }
                     }
                 }
            }
            else if (enemy.bossState === 'ATTACK_SWORD') {
                // Sword Logic: Frames 0, 1 on Sheet 2
                enemy.bossTimer++;
                if (enemy.bossTimer > 20) {
                    enemy.bossAnimFrame = 1; // Swing
                    // Hitbox check
                    if (Math.abs(distToPlayer) < 100 && Math.abs(player.y - enemy.y) < 100) {
                         if (player.invulnerabilityTimer <= 0) {
                            player.hp -= 1;
                            player.invulnerabilityTimer = 60;
                            player.hitFlashTimer = 10;
                            spawnBlood(player.x + player.width/2, player.y + player.height/2);
                            if (player.hp <= 0) setGameState(GameState.GAME_OVER);
                         }
                    }
                }
                if (enemy.bossTimer > 40) {
                    enemy.bossState = 'IDLE';
                    enemy.bossAnimFrame = 10;
                    enemy.bossTimer = 0;
                }
            }
            else if (enemy.bossState === 'ATTACK_MANA') {
                // Mana Steal: Frame 4 on Sheet 2
                player.isParalyzed = true;
                enemy.bossTimer++;
                
                // Drain Effect
                if (enemy.bossTimer % 5 === 0 && player.mana > 0) {
                    const stealAmount = 2; // Slow drain
                    player.mana = Math.max(0, player.mana - stealAmount);
                    spawnManaDrainParticle(player.x + player.width/2, player.y, enemy.x + enemy.width/2, enemy.y);
                }
                
                // Big burst at end
                if (enemy.bossTimer > 90) { // 1.5s duration
                    player.mana = Math.max(0, player.mana - (player.stats.maxMana * 0.35));
                    player.isParalyzed = false;
                    enemy.bossState = 'IDLE';
                    enemy.bossAnimFrame = 10;
                    enemy.bossTimer = 0;
                }
            }
            else if (enemy.bossState === 'ATTACK_METEOR') {
                 // Meteor: Frame 3 on Sheet 2
                 enemy.bossTimer++;
                 if (enemy.bossTimer === 30) {
                     // Spawn Meteors
                     for(let m=0; m<5; m++) {
                         meteorsRef.current.push({
                             x: Math.random() * CANVAS_WIDTH,
                             y: -100 - (Math.random() * 500), // Staggered height
                             vx: (Math.random() - 0.5) * 2,
                             vy: 8 + Math.random() * 5,
                             size: 20 + Math.random() * 20
                         });
                     }
                 }
                 if (enemy.bossTimer > 60) {
                     enemy.bossState = 'IDLE';
                     enemy.bossAnimFrame = 10;
                     enemy.bossTimer = 0;
                 }
            }

        } else {
            // --- NORMAL ENEMY LOGIC ---
            if (Math.abs(distToPlayer) > 30) {
                enemy.state = 'WALK';
                enemy.facingRight = distToPlayer > 0;
                const dir = distToPlayer > 0 ? 1 : -1;
                const enemySpeed = 0.35; 
                enemy.x += dir * enemySpeed;
                enemy.walkTimer += 0.1;
            } else {
                if (enemy.state !== 'ATTACK') {
                    enemy.state = 'ATTACK';
                    enemy.attackFrame = 0;
                }
            }
        }

        // Enemy Collision with Player (Contact Damage)
        // Boss contact damage is separate from attacks? Let's keep it for now but maybe disable if paralysis
        if (
            !player.isParalyzed &&
            Math.abs(distToPlayer) < (player.width + enemy.width) / 2 &&
            Math.abs((player.y + player.height/2) - (enemy.y + enemy.height/2)) < 50
        ) {
            if (player.invulnerabilityTimer <= 0) {
                player.hp--;
                player.invulnerabilityTimer = 60; 
                player.hitFlashTimer = 10;
                spawnBlood(player.x + player.width/2, player.y + player.height/2);
                if (player.hp <= 0) {
                    setGameState(GameState.GAME_OVER);
                }
            }
        }

        // Projectile Collision
        for (let pIdx = projectilesRef.current.length - 1; pIdx >= 0; pIdx--) {
            const p = projectilesRef.current[pIdx];
            
            if (p.hitEnemies.includes(enemy.id)) continue;

            if (
                p.x > enemy.x && p.x < enemy.x + enemy.width &&
                p.y > enemy.y && p.y < enemy.y + enemy.height
            ) {
                // HIT
                if (!enemy.isBoss || (enemy.isBoss && enemy.bossState !== 'TRANSFORMING_PULSE' && enemy.bossState !== 'TRANSFORMING_MORPH')) {
                    enemy.hp -= p.damage;
                    enemy.hitFlashTimer = 10;
                    if (!enemy.isBoss) enemy.x += (p.vx > 0 ? 5 : -5); // Knockback only for normal
                    
                    p.hitEnemies.push(enemy.id);
                    spawnBlood(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    
                    if (p.piercing > 0) {
                        p.piercing--;
                    } else {
                        p.active = false;
                    }
                }

                if (enemy.hp <= 0) {
                    // MUTATION CHECK
                    const isMutating = !hasBossSpawnedRef.current && waveRef.current >= 2 && Math.random() < 0.5; // 50% chance after Wave 2

                    if (!enemy.isBoss && isMutating) {
                        // TRANSFORM INTO BOSS
                        enemy.hp = 1; // Keep alive technically
                        enemy.isBoss = true;
                        enemy.bossState = 'TRANSFORMING_PULSE';
                        enemy.width = 50; // Hitbox matching 109px visual approx ratio
                        enemy.height = 100; // Matching 109px visual height
                        hasBossSpawnedRef.current = true;
                        warningMsgRef.current = { text: "An enemy has mutated...", timer: 180 };

                        // EVAPORATE OTHERS
                        for(let j=enemiesRef.current.length-1; j>=0; j--) {
                            const other = enemiesRef.current[j];
                            if (!other.isBoss) {
                                spawnSmoke(other.x + other.width/2, other.y + other.height/2);
                                enemiesRef.current.splice(j, 1);
                                enemiesKilledInWaveRef.current++;
                            }
                        }

                    } else {
                        // DIE
                        enemiesKilledInWaveRef.current++;
                        if (stats.vampirism > 0 && Math.random() < stats.vampirism) {
                            if (player.hp < stats.maxHp) {
                                player.hp++;
                                spawnHealEffect(player.x + player.width/2, player.y);
                            }
                        }
                        enemiesRef.current.splice(i, 1);
                    }
                }

                if (!p.active) {
                    projectilesRef.current.splice(pIdx, 1);
                }
            }
        }
      }

      // --- METEOR LOGIC ---
      for (let mIdx = meteorsRef.current.length - 1; mIdx >= 0; mIdx--) {
          const m = meteorsRef.current[mIdx];
          m.x += m.vx;
          m.y += m.vy;
          
          // Collision with ground
          if (m.y >= GROUND_Y) {
              screenShakeRef.current = 10;
              // Splash damage check
              if (Math.abs((player.x + player.width/2) - m.x) < 80) {
                  if (player.invulnerabilityTimer <= 0) {
                      player.hp--;
                      player.invulnerabilityTimer = 60;
                      player.hitFlashTimer = 10; // Visual red flash
                      spawnBlood(player.x + player.width/2, player.y + player.height/2);
                      if (player.hp <= 0) setGameState(GameState.GAME_OVER);
                  }
              }
              meteorsRef.current.splice(mIdx, 1);
          }
      }

      // --- UPDATE PROJECTILES (Movement) ---
      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const p = projectilesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.frame += 0.5;
        if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
          p.active = false;
          if (p.audio) {
            p.audio.pause();
            p.audio.currentTime = 0;
          }
        }
        if (!p.active) projectilesRef.current.splice(i, 1);
      }

      // --- BACKGROUND ENTITIES ---
      batsRef.current.forEach(bat => bat.angle += bat.speed);
      spawnShootingStar();
      for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
          const s = shootingStarsRef.current[i];
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.02;
          if (s.life <= 0) shootingStarsRef.current.splice(i, 1);
      }

      // --- GRASS ---
      const pBottomY = player.y + player.height;
      grassRef.current.forEach(blade => {
        let targetLean = 0;
        let hasInfluence = false;

        const dxP = playerCenterX - blade.x;
        const distP = Math.abs(dxP);
        if (distP < 32 && Math.abs(pBottomY - GROUND_Y) < 15) {
           const influence = (32 - distP) / 32;
           const dir = dxP > 0 ? -1 : 1;
           let pushForce = 8;
           if (isMoving) pushForce += 12;
           targetLean = dir * pushForce * influence;
           hasInfluence = true;
        }
        
        // Enemy Grass Influence
        if (!hasInfluence) {
            for (const enemy of enemiesRef.current) {
                const eCenterX = enemy.x + enemy.width / 2;
                const eBottomY = enemy.y + enemy.height;
                const dxE = eCenterX - blade.x;
                const distE = Math.abs(dxE);
                
                if (distE < 32 && Math.abs(eBottomY - GROUND_Y) < 30) {
                    const influence = (32 - distE) / 32;
                    const dir = dxE > 0 ? -1 : 1;
                    const pushForce = 12;
                    targetLean = dir * pushForce * influence;
                    hasInfluence = true;
                    break;
                }
            }
        }

        blade.lean = lerp(blade.lean, targetLean, 0.3);
      });

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
    };

    const drawStaff = (ctx: CanvasRenderingContext2D, p: Player, angleToMouse: number, shakeX: number, shakeY: number) => {
        if (!staffImageRef.current || !staffImageRef.current.complete) return;
        const spriteW = 258;
        const spriteH = 759;
        const scale = 0.09;
        let frameIndex = 0;
        
        let rotation = angleToMouse + Math.PI / 2;

        if (p.isAttacking) {
            frameIndex = Math.floor(p.attackFrame);
            if (frameIndex > 3) frameIndex = 3;
        } else if (p.isCharging) {
            const oscillate = Math.floor(frameRef.current / 8) % 2;
            frameIndex = 2 + oscillate; 
            rotation = (-Math.PI / 4) + Math.PI / 2; 
        } else if (p.isParalyzed) {
             // Reverse Eye Close Logic
             // Cycle frames backwards 3 -> 0 based on time
             const animTime = Math.floor(frameRef.current / 5) % 4; 
             frameIndex = 3 - animTime; 
             rotation = (-Math.PI / 4) + Math.PI / 2; // Held up
        }

        const sx = frameIndex * spriteW;
        ctx.save();
        const cx = p.x + p.width / 2 + shakeX;
        const cy = p.y + p.height / 2 + shakeY;
        ctx.translate(cx, cy);
        
        if (p.isStaffEquipped) {
            if (p.isCharging || p.isParalyzed) {
                const chargeAngle = p.facingRight ? -Math.PI / 4 : -Math.PI * 0.75;
                ctx.rotate(chargeAngle + Math.PI / 2);
            } else {
                ctx.rotate(rotation);
            }

            ctx.drawImage(
                staffImageRef.current,
                sx, 0, spriteW, spriteH,
                - (spriteW * scale) / 2,
                - (spriteH * scale) * 0.8,
                spriteW * scale,
                spriteH * scale
            );
        } else {
            const backOffset = p.facingRight ? -4 : 4;
            const rot = p.facingRight ? -0.2 : 0.2;
            ctx.translate(backOffset, -5);
            ctx.rotate(rot);
            ctx.drawImage(
                staffImageRef.current,
                0, 0, spriteW, spriteH,
                - (spriteW * scale) / 2, 
                - (spriteH * scale) / 2 - 10,
                spriteW * scale,
                spriteH * scale
            );
        }
        ctx.restore();
    };

    const drawProjectiles = (ctx: CanvasRenderingContext2D) => {
        if (!projectileImageRef.current || !projectileImageRef.current.complete) return;
        const spriteSize = 100;
        
        projectilesRef.current.forEach(proj => {
            const scale = 0.9 * (proj.size || 1.0); 
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.rotate(proj.angle);
            const loopFrames = [2, 3, 4];
            const animationIndex = Math.floor(proj.frame) % loopFrames.length;
            const frameIndex = loopFrames[animationIndex];
            const sx = frameIndex * spriteSize;
            ctx.drawImage(
                projectileImageRef.current!,
                sx, 0, spriteSize, spriteSize,
                - (spriteSize * scale) / 2,
                - (spriteSize * scale) / 2,
                spriteSize * scale,
                spriteSize * scale
            );
            ctx.restore();
        });
    }

    const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
      const mobile = mobileInputRef.current;
      if (playerImageRef.current && playerImageRef.current.complete) {
        const cols = 2; 
        const frameW = 500;
        const frameH = 500;
        const FPS = 4;
        const ticksPerFrame = Math.floor(60 / FPS);
        const frameIndex = Math.floor(frameRef.current / ticksPerFrame) % cols;
        const sx = frameIndex * frameW;
        const renderSize = 64; 

        // Shake logic
        const shakeX = p.hitFlashTimer > 0 ? (Math.random() - 0.5) * 5 : 0;
        const shakeY = p.hitFlashTimer > 0 ? (Math.random() - 0.5) * 5 : 0;

        const centerX = p.x + p.width / 2 + shakeX;
        const bottomY = p.y + p.height + shakeY;
        
        let angle = 0;
        if (!isTouchModeRef.current || (mobile.active && (Math.abs(mobile.aimX) > 0.1 || Math.abs(mobile.aimY) > 0.1))) {
           const dx = mouseRef.current.x - centerX;
           const dy = mouseRef.current.y - (p.y + p.height/2);
           angle = Math.atan2(dy, dx);
        } else {
           angle = p.facingRight ? 0 : Math.PI;
        }

        const drawStaffBehind = !p.isStaffEquipped || (p.isStaffEquipped && Math.sin(angle) < -0.5 && !p.isCharging && !p.isParalyzed);
        if (drawStaffBehind) drawStaff(ctx, p, angle, shakeX, shakeY);
        
        ctx.save();
        
        if (p.hitFlashTimer > 0) {
             ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(600%)';
        }
        
        // Purple tint if paralyzed
        if (p.isParalyzed) {
            ctx.filter = 'hue-rotate(270deg) contrast(1.2)';
        }

        ctx.translate(centerX, bottomY);
        if (!p.facingRight) ctx.scale(-1, 1);
        ctx.drawImage(
            playerImageRef.current, 
            sx, 0, frameW, frameH, 
            -renderSize / 2, -renderSize + 4, 
            renderSize, renderSize
        );
        ctx.restore();
        if (!drawStaffBehind) drawStaff(ctx, p, angle, shakeX, shakeY);
      }
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
        if (!enemyBaseImageRef.current || !enemyBaseImageRef.current.complete) return;
        
        // Base Sprite Sheet: 500x500 each, 11 frames row
        const spriteW = 500;
        const spriteH = 500;
        
        let frameIndex = 0;
        let currentImage = enemyBaseImageRef.current;
        let scaleFactor = 1.0;

        if (enemy.isBoss) {
            scaleFactor = 1.4; // Boss is robust
            if (enemy.bossState === 'TRANSFORMING_PULSE') {
                 frameIndex = 3; 
                 // Pulse effect
                 const pulse = 1.0 + Math.sin(frameRef.current * 0.2) * 0.1;
                 scaleFactor *= pulse;
            } 
            else if (enemy.bossState === 'TRANSFORMING_MORPH' || enemy.bossState === 'TRANSFORMING_WAIT') {
                 // Clamp to 10 to avoid empty frame issue
                 frameIndex = Math.min(enemy.bossAnimFrame, 10); 
            } 
            else if (enemy.bossState === 'IDLE') {
                 frameIndex = 10;
            }
            else {
                 // Combat States using Sheet 2
                 if (bossAttackImageRef.current && bossAttackImageRef.current.complete) {
                     currentImage = bossAttackImageRef.current;
                     // Sheet 2 mapping: Sword(0,1), Sheath(2), Meteor(3), Mana(4)
                     frameIndex = enemy.bossAnimFrame;
                 }
            }
        } else {
            // Normal Enemy
            if (enemy.state === 'ATTACK') {
                enemy.attackFrame += 0.1;
                const cycle = Math.floor(enemy.attackFrame) % 4; 
                // Attack frames are 1 and 2
                frameIndex = cycle < 2 ? 1 : 2;
            } else {
                frameIndex = 0; // Walk
            }
        }

        const sx = frameIndex * spriteW;
        const waddle = enemy.isBoss ? 0 : Math.sin(enemy.walkTimer) * 0.1; 
        
        const shakeX = enemy.hitFlashTimer > 0 ? (Math.random() - 0.5) * 5 : 0;
        const shakeY = enemy.hitFlashTimer > 0 ? (Math.random() - 0.5) * 5 : 0;

        ctx.save();
        
        // --- VISUAL ADJUSTMENTS BASED ON USER INPUT ---
        // Boss: Size 109, Offset 18
        // Normal: Size 79, Offset 13
        const renderH = (enemy.isBoss ? 109 : 79) * scaleFactor; 
        const Y_OFFSET = enemy.isBoss ? 18 : 13;
        
        const ratio = spriteW / spriteH; 
        const renderW = renderH * ratio;
        
        ctx.translate(enemy.x + enemy.width/2 + shakeX, enemy.y + enemy.height + shakeY + Y_OFFSET);
        
        if (!enemy.facingRight) ctx.scale(-1, 1);
        if (!enemy.isBoss || enemy.bossState === 'IDLE') ctx.rotate(waddle);

        if (enemy.hitFlashTimer > 0) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg) saturate(600%)';
        }

        ctx.drawImage(
            currentImage,
            sx, 0, spriteW, spriteH,
            -renderW / 2, -renderH,
            renderW, renderH
        );

        ctx.restore();
    };

    const drawBossHUD = (ctx: CanvasRenderingContext2D, boss: Enemy) => {
        const barW = 400;
        const barH = 20;
        const x = (CANVAS_WIDTH - barW) / 2;
        const y = 50;

        // Border
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
        
        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, barW, barH);
        
        // Fill
        const pct = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = '#8a2be2'; // Boss Purple
        ctx.fillRect(x, y, barW * pct, barH);
        
        // Text
        ctx.font = '12px "Press Start 2P"';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText("CORRUPTED ENTITY", CANVAS_WIDTH / 2, y - 10);
    }

    const drawHUD = (ctx: CanvasRenderingContext2D, p: Player) => {
      if (!manaBarEmptyRef.current || !manaBarFillRef.current || !triangleImageRef.current) return;
      if (!manaBarEmptyRef.current.complete || !manaBarFillRef.current.complete || !triangleImageRef.current.complete) return;

      const manaPct = p.mana / p.stats.maxMana;
      const barScale = 0.3; 
      const triScale = 0.12; 

      const emptyW = 309;
      const emptyH = 111;
      const fillW = 258;
      const fillH = 38;

      const renderEmptyW = emptyW * barScale;
      const renderEmptyH = emptyH * barScale;
      const renderFillW = fillW * barScale;
      const renderFillH = fillH * barScale;
      
      const triW = 344;
      const triH = 322;
      const renderTriW = triW * triScale;
      const renderTriH = triH * triScale;

      const innerOffsetX = 26 * barScale;
      const innerOffsetY = 36 * barScale;

      // BOTTOM RIGHT POSITIONING
      const totalGroupWidth = renderEmptyW + 5 + renderTriW;
      const marginX = CANVAS_WIDTH - totalGroupWidth - 10;
      const marginY = CANVAS_HEIGHT - renderEmptyH - 10;

      ctx.drawImage(
        manaBarEmptyRef.current,
        0, 0, emptyW, emptyH,
        marginX, marginY, 
        renderEmptyW, renderEmptyH
      );

      if (manaPct > 0) {
        const srcVisibleW = fillW * manaPct;
        const destVisibleW = renderFillW * manaPct;

        ctx.drawImage(
            manaBarFillRef.current,
            0, 0, srcVisibleW, fillH, 
            marginX + innerOffsetX, marginY + innerOffsetY, destVisibleW, renderFillH
        );
      }

      const hudFrame = Math.min(3, Math.floor(manaPct * 4));

      ctx.drawImage(
        triangleImageRef.current,
        hudFrame * triW, 0, triW - 20, triH, 
        marginX + renderEmptyW + 5, marginY + (renderEmptyH - renderTriH) / 2, 
        renderTriW, renderTriH
      );
      
      // Wave Info
      ctx.font = '16px "Press Start 2P"';
      ctx.fillStyle = COLOR_WHITE;
      ctx.textAlign = 'left';
      ctx.fillText(`WAVE ${waveRef.current}`, 20, 30);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(`KILLS: ${enemiesKilledInWaveRef.current} / ${enemiesToKillRef.current}`, 20, 50);

      // Boss HP
      const boss = enemiesRef.current.find(e => e.isBoss && e.bossState !== 'TRANSFORMING_PULSE' && e.bossState !== 'TRANSFORMING_MORPH' && e.bossState !== 'TRANSFORMING_WAIT');
      if (boss) {
          drawBossHUD(ctx, boss);
      }

      // Warning Message
      if (warningMsgRef.current.timer > 0) {
        if (Math.floor(frameRef.current / 5) % 2 === 0) { // Blink
             ctx.save();
             ctx.font = '20px "Press Start 2P"';
             ctx.fillStyle = '#FF4444';
             ctx.textAlign = 'center';
             ctx.fillText(warningMsgRef.current.text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
             ctx.restore();
        }
      }
    };

    const drawPauseScreen = (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.font = '30px "Press Start 2P"';
      ctx.fillStyle = COLOR_WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText("PRESS [ESC] TO RESUME", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.fillText("PRESS [Q] TO QUIT", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      ctx.restore();
    };

    const drawLevelUpScreen = (ctx: CanvasRenderingContext2D) => {
       ctx.save();
       ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
       ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
       
       ctx.font = '30px "Press Start 2P"';
       ctx.fillStyle = COLOR_WHITE;
       ctx.textAlign = 'center';
       ctx.fillText("WAVE CLEARED", CANVAS_WIDTH / 2, 100);
       
       ctx.font = '14px "Press Start 2P"';
       ctx.fillText("CHOOSE AN UPGRADE", CANVAS_WIDTH / 2, 140);
       
       ctx.restore();
    };

    const draw = () => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const shakeX = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;
      const shakeY = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;
      
      ctx.save();
      ctx.translate(shakeX, shakeY);

      if (bgImageRef.current && bgImageRef.current.complete) {
          ctx.save();
          ctx.globalAlpha = 0.5; 
          ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = COLOR_WHITE; 
      shootingStarsRef.current.forEach(s => {
          ctx.globalAlpha = s.life;
          ctx.lineWidth = 2; 
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * s.length * 0.1, s.y - s.vy * s.length * 0.1);
          ctx.stroke();
      });
      ctx.fillStyle = COLOR_WHITE; 
      batsRef.current.forEach(bat => {
          const bx = bat.centerX + Math.cos(bat.angle) * bat.radiusX;
          const by = bat.centerY + Math.sin(bat.angle) * bat.radiusY;
          ctx.beginPath();
          ctx.arc(bx, by, bat.size, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.restore();

      if (wallTextureRef.current) {
        ctx.drawImage(wallTextureRef.current, 0, 0);
        ctx.save();
        ctx.translate(CANVAS_WIDTH, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(wallTextureRef.current, 0, 0);
        ctx.restore();
      }

      enemiesRef.current.forEach(enemy => drawEnemy(ctx, enemy));

      if (groundTextureRef.current) {
        ctx.drawImage(groundTextureRef.current, 0, GROUND_Y);
      }
      
      // Draw Meteors
      ctx.fillStyle = '#8a2be2'; // Purple
      meteorsRef.current.forEach(m => {
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.fillStyle = 'rgba(138, 43, 226, 0.5)';
          ctx.beginPath();
          ctx.moveTo(m.x - m.size, m.y);
          ctx.lineTo(m.x + m.size, m.y);
          ctx.lineTo(m.x, m.y - m.size * 3);
          ctx.fill();
          ctx.fillStyle = '#8a2be2';
      });

      ctx.fillStyle = COLOR_WHITE;
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      drawPlayer(ctx, playerRef.current);
      drawProjectiles(ctx);

      ctx.strokeStyle = COLOR_WHITE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      grassRef.current.forEach(blade => {
        const startX = blade.x;
        const startY = GROUND_Y;
        const endX = blade.x + blade.lean;
        const endY = GROUND_Y - blade.height;
        const controlX = blade.x; 
        const controlY = GROUND_Y - (blade.height * 0.5);
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      });
      ctx.stroke();
      
      ctx.restore(); // End Shake

      drawHUD(ctx, playerRef.current);

      if (pausedRef.current && !showLevelUpScreen) {
          drawPauseScreen(ctx);
      }

      if (showLevelUpScreen) {
          drawLevelUpScreen(ctx);
      }
    };

    const loop = () => {
      if (!pausedRef.current || showLevelUpScreen) {
          if (!showLevelUpScreen) update();
      }
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchDetected);
      cancelAnimationFrame(animationFrameId);
      if (walkAudioRef.current) {
        walkAudioRef.current.pause();
        walkAudioRef.current = null;
      }
      if (manaFullAudioRef.current) {
        manaFullAudioRef.current.pause();
        manaFullAudioRef.current = null;
      }
    };
  }, [setGameState, sfxVolume, showLevelUpScreen]);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-black overflow-hidden select-none">
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          className="block h-full object-contain cursor-none"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Mobile Overlay */}
        {!showLevelUpScreen && <MobileControls inputRef={mobileInputRef} />}

        {/* Level Up DOM Overlay */}
        {showLevelUpScreen && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-[200]">
                 <div className="relative w-full h-full flex items-center justify-center">
                     <div className="flex flex-col md:flex-row gap-8 p-4 mt-20 transition-all">
                        {levelUpCards.map((card) => {
                            const isSelected = selectedCardId === card.id;
                            const isOthersHidden = selectedCardId !== null && !isSelected;

                            if (isOthersHidden) return null;

                            return (
                                <button 
                                    key={card.id}
                                    className={`
                                        bg-black border-2 p-4 flex flex-col items-center justify-between 
                                        transition-all duration-1000 ease-in-out cursor-pointer group
                                        ${isSelected 
                                            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-96 scale-125 z-[300] border-white shadow-[0_0_50px_rgba(255,255,255,0.8)] rotate-[360deg]' 
                                            : 'w-48 h-64 border-white hover:bg-white hover:text-black hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] relative'
                                        }
                                    `}
                                    onClick={() => initiateCardSelect(card)}
                                    onTouchEnd={(e) => { e.preventDefault(); initiateCardSelect(card); }}
                                    disabled={selectedCardId !== null}
                                >
                                    <h3 className="text-sm font-bold uppercase text-center mb-4">{card.name}</h3>
                                    
                                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-4">
                                        {card.imageUrl ? (
                                            <img 
                                                src={card.imageUrl} 
                                                alt={card.name} 
                                                className={`object-contain w-full h-full grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500 ${isSelected ? 'grayscale-0' : ''}`}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 border-2 border-current rotate-45 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-current rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <p className={`text-[10px] text-center mt-2 leading-relaxed font-sans opacity-80 ${isSelected ? 'text-xs' : ''}`}>
                                        {card.description}
                                    </p>
                                </button>
                            );
                        })}
                     </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default StageOne;
