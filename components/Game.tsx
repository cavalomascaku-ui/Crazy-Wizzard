
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player, Particle } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_FORCE, 
  MOVE_SPEED, 
  GROUND_Y, 
  COLOR_WHITE 
} from '../constants';

interface GameProps {
  setGameState: (state: GameState) => void;
}

const Game: React.FC<GameProps> = ({ setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Game Refs to avoid stale state in loop
  // Fixed: Added mana and maxMana properties to the playerRef initialization.
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2,
    y: GROUND_Y - 48, // Adjusted start height
    width: 24, // Hitbox width
    height: 48, // Hitbox height (taller for wizard)
    vy: 0,
    isGrounded: true,
    facingRight: true,
    walkFrame: 0,
    isStaffEquipped: false,
    staffAnimState: 0,
    isAttacking: false,
    attackFrame: 0,
    mana: 100,
    maxMana: 100,
  });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure strict pixel art rendering
    ctx.imageSmoothingEnabled = false;

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') setGameState(GameState.MENU);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game Loop
    let animationFrameId: number;

    const spawnTrail = (x: number, y: number) => {
      if (Math.random() > 0.5) return; // Not every frame
      particlesRef.current.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 10 - 5),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        size: Math.random() * 2 + 1
      });
    };

    const update = () => {
      frameRef.current++;
      const player = playerRef.current;
      
      // Horizontal Movement
      if (keysRef.current['a'] || keysRef.current['arrowleft']) {
        player.x -= MOVE_SPEED;
        player.facingRight = false;
        if (player.isGrounded) spawnTrail(player.x + player.width, player.y + player.height);
      }
      if (keysRef.current['d'] || keysRef.current['arrowright']) {
        player.x += MOVE_SPEED;
        player.facingRight = true;
        if (player.isGrounded) spawnTrail(player.x, player.y + player.height);
      }

      // Boundary Checks
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;

      // Vertical Movement (Jump)
      if ((keysRef.current['w'] || keysRef.current['arrowup'] || keysRef.current[' ']) && player.isGrounded) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
        // Jump particles
        for(let i=0; i<5; i++) spawnTrail(player.x + player.width/2, player.y + player.height);
      }

      // Physics
      player.vy += GRAVITY;
      player.y += player.vy;

      // Ground Collision
      if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.isGrounded = true;
      } else {
        player.isGrounded = false;
      }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
    };

    // New Pixel Art Drawer
    const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
      const pixelSize = 2; // Smaller pixel size for in-game
      
      // Calculate drawing start position relative to hitbox
      // Hitbox is approx 24px wide, 48px high. 
      // Our sprite is 16 blocks wide * 2 = 32px drawn width.
      // 24 blocks high * 2 = 48px drawn height.
      const dx = p.x + p.width/2 - (8 * pixelSize); 
      const dy = p.y + p.height - (24 * pixelSize); 

      ctx.save();
      
      // Flip logic
      if (!p.facingRight) {
        // Translate to center of player, flip, then translate back
        ctx.translate(p.x + p.width/2, p.y + p.height/2);
        ctx.scale(-1, 1);
        ctx.translate(-(p.x + p.width/2), -(p.y + p.height/2));
      }

      // Helper for pixel drawing
      const drawPix = (x: number, y: number, color: string = COLOR_WHITE) => {
        ctx.fillStyle = color;
        ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, pixelSize, pixelSize);
      };
      const drawRect = (x: number, y: number, w: number, h: number, color: string = COLOR_WHITE) => {
        ctx.fillStyle = color;
        ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, w * pixelSize, h * pixelSize);
      };

      // --- SAME SPRITE LOGIC AS MENU (Scaled down) ---
      
      // 1. STAFF
      drawRect(14, 4, 1, 20); 
      // Thunder Tip
      drawPix(14, 1); drawPix(14, 2); drawPix(14, 3);
      drawPix(13, 2); drawPix(15, 0); 
      drawPix(13, 4);

      // 2. HAT
      drawRect(6, 0, 2, 1);
      drawRect(5, 1, 2, 1);
      drawRect(4, 2, 4, 1);
      drawRect(3, 3, 6, 1);
      drawRect(3, 4, 6, 1);
      drawRect(2, 5, 8, 1);
      drawRect(2, 6, 8, 1);
      drawRect(0, 7, 12, 1); // Brim

      // 3. FACE & BEARD
      drawRect(2, 8, 8, 3, '#000'); // Face shadow
      drawPix(3, 9, COLOR_WHITE); // Eye L
      drawPix(7, 9, COLOR_WHITE); // Eye R

      drawRect(2, 11, 8, 2); 
      drawRect(2, 13, 8, 6); 
      drawRect(3, 19, 6, 2);
      drawRect(4, 21, 4, 1);
      drawRect(5, 22, 2, 1);

      // 4. ROBE SIDES
      drawRect(1, 11, 1, 8);
      drawRect(10, 11, 1, 8);
      drawRect(2, 21, 2, 2);
      drawRect(8, 21, 2, 2);

      ctx.restore();
    };

    const draw = () => {
      // Clear Screen
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Ground
      ctx.strokeStyle = COLOR_WHITE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Draw Particles
      ctx.fillStyle = COLOR_WHITE;
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      // Draw Player
      drawPlayer(ctx, playerRef.current);
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [setGameState]);

  return (
    <div className="relative flex items-center justify-center h-screen bg-gray-900">
      <div className="border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          className="bg-black block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="absolute top-4 left-4 text-white font-xs opacity-50">
        CONTROLES: WASD / SETAS + ESPAÇO PARA PULAR
      </div>
    </div>
  );
};

export default Game;
