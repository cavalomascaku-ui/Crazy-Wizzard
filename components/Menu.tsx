
import React, { useEffect, useRef } from 'react';
import { COLOR_WHITE } from '../constants';

interface MenuProps {
  onStart: () => void;
  onSettings: () => void;
}

const PLAYER_SPRITE_URL = "https://i.imgur.com/wwOpQgA.png";

const Menu: React.FC<MenuProps> = ({ onStart, onSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // State for Drag Rotation
  const rotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onStart();
      }
    };

    // --- MOUSE ---
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - lastXRef.current;
        rotationRef.current += deltaX * 0.01;
        lastXRef.current = e.clientX;
      }
    };
    const handleMouseUp = () => { isDraggingRef.current = false; };

    // --- TOUCH ---
    const handleTouchStart = (e: TouchEvent) => {
       if (e.touches.length > 0) {
           isDraggingRef.current = true;
           lastXRef.current = e.touches[0].clientX;
       }
    }
    const handleTouchMove = (e: TouchEvent) => {
        if (isDraggingRef.current && e.touches.length > 0) {
            e.preventDefault(); // Prevent scroll
            const clientX = e.touches[0].clientX;
            const deltaX = clientX - lastXRef.current;
            rotationRef.current += deltaX * 0.01;
            lastXRef.current = clientX;
        }
    }
    const handleTouchEnd = () => { isDraggingRef.current = false; }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onStart]);

  // Character Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Strict pixelation
    ctx.imageSmoothingEnabled = false;

    // Load Image
    if (!imageRef.current) {
        const img = new Image();
        img.src = PLAYER_SPRITE_URL;
        imageRef.current = img;
    }

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Animation vars
      const hoverY = Math.floor(Math.sin(frame * 0.05) * 6); 

      // ANIMATION LOGIC (4 FPS)
      const FPS = 4;
      const ticksPerFrame = Math.floor(60 / FPS);
      const spriteFrameIndex = Math.floor(frame / ticksPerFrame) % 2;

      ctx.save();
      
      // Translate to center + hover
      ctx.translate(centerX, centerY + hoverY);
      
      const scaleX = Math.cos(rotationRef.current);
      ctx.scale(scaleX, 1);

      if (imageRef.current && imageRef.current.complete) {
          const frameW = 500;
          const frameH = 500;
          const sx = spriteFrameIndex * frameW;
          const sy = 0;
          
          // Render Size (fit in 300x300 canvas)
          const renderSize = 180;

          // Draw Image Centered
          ctx.drawImage(
              imageRef.current,
              sx, sy, frameW, frameH,
              -renderSize / 2, -renderSize / 2,
              renderSize, renderSize
          );
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-10 select-none">
      <h1 className="text-4xl md:text-6xl text-center tracking-widest uppercase flicker mb-8 md:mb-16 pointer-events-none" style={{ textShadow: '0 0 10px white' }}>
        BRUXO<br/>MALUCO
      </h1>
      
      <div className="relative pointer-events-none">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={300} 
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      
      <div className="mt-12 flex flex-col gap-4 z-50">
        <button 
          className="px-8 py-4 bg-white/10 border-2 border-white/30 text-white rounded-none animate-pulse text-sm hover:text-gray-300 hover:bg-white/20 transition-all select-none active:scale-95 uppercase tracking-wider font-bold"
          onClick={onStart}
          onTouchEnd={(e) => { e.preventDefault(); onStart(); }}
        >
          INICIAR JOGO
        </button>

        <button 
          className="px-8 py-3 bg-transparent border-2 border-gray-600 text-gray-400 rounded-none text-xs hover:text-white hover:border-white transition-all select-none active:scale-95 uppercase tracking-wider"
          onClick={onSettings}
          onTouchEnd={(e) => { e.preventDefault(); onSettings(); }}
        >
          CONFIGURAÇÕES
        </button>
      </div>
      
      <div className="mt-8 text-[10px] text-gray-500 text-center px-4">
        PC: WASD + MOUSE | MOBILE: JOYSTICKS
      </div>
    </div>
  );
};

export default Menu;
