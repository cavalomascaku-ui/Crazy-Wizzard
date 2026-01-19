
import React, { useRef, useState } from 'react';
import { MobileInputState } from '../types';

interface MobileControlsProps {
  inputRef: React.MutableRefObject<MobileInputState>;
}

const MobileControls: React.FC<MobileControlsProps> = ({ inputRef }) => {
  // Use Refs for DOM elements to avoid Re-renders on every frame (Perf optimization)
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const rightZoneRef = useRef<HTMLDivElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleStick = (
    e: React.TouchEvent, 
    zoneRef: React.RefObject<HTMLDivElement | null>, 
    knobRef: React.RefObject<HTMLDivElement | null>,
    isAim: boolean
  ) => {
    // Prevent default to stop scrolling/zooming/navigation
    if (e.cancelable) e.preventDefault();
    e.stopPropagation(); 
    
    const touch = e.changedTouches[0];
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect || !knobRef.current) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const maxDist = rect.width / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDist = Math.min(distance, maxDist);
    
    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    // DIRECT DOM MANIPULATION (Zero React Overhead)
    knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    if (isAim) {
        knobRef.current.style.backgroundColor = (distance > 10) ? '#ff4444' : 'rgba(255,255,255,0.5)';
    }

    // Normalize -1 to 1
    const normX = x / maxDist;
    const normY = y / maxDist;

    inputRef.current.active = true;

    if (isAim) {
      inputRef.current.aimX = normX;
      inputRef.current.aimY = normY;
      inputRef.current.isShooting = distance > 10;
    } else {
      inputRef.current.moveX = normX;
      inputRef.current.moveY = normY;
    }
  };

  const resetStick = (
    knobRef: React.RefObject<HTMLDivElement | null>,
    isAim: boolean
  ) => {
    if (knobRef.current) {
        knobRef.current.style.transform = `translate(0px, 0px)`;
        if (isAim) knobRef.current.style.backgroundColor = 'rgba(255,255,255,0.5)';
    }

    if (isAim) {
      inputRef.current.aimX = 0;
      inputRef.current.aimY = 0;
      inputRef.current.isShooting = false;
    } else {
      inputRef.current.moveX = 0;
      inputRef.current.moveY = 0;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none select-none">
      
      {/* Fullscreen Button */}
      <button 
        onClick={toggleFullScreen}
        onTouchEnd={(e) => { e.preventDefault(); toggleFullScreen(); }}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 border-2 border-white/30 rounded flex items-center justify-center pointer-events-auto active:bg-white/30 z-[110]"
      >
        {!isFullscreen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
        ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                 <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
        )}
      </button>

      {/* Left Stick - Movement */}
      <div 
        ref={leftZoneRef}
        className="joystick-zone"
        style={{ left: '40px', bottom: '40px' }}
        onTouchStart={(e) => handleStick(e, leftZoneRef, leftKnobRef, false)}
        onTouchMove={(e) => handleStick(e, leftZoneRef, leftKnobRef, false)}
        onTouchEnd={() => resetStick(leftKnobRef, false)}
      >
        <div 
          ref={leftKnobRef}
          className="joystick-knob"
          style={{ transform: `translate(0px, 0px)` }}
        />
      </div>

      {/* Right Stick - Aiming */}
      <div 
        ref={rightZoneRef}
        className="joystick-zone"
        style={{ right: '40px', bottom: '40px' }}
        onTouchStart={(e) => handleStick(e, rightZoneRef, rightKnobRef, true)}
        onTouchMove={(e) => handleStick(e, rightZoneRef, rightKnobRef, true)}
        onTouchEnd={() => resetStick(rightKnobRef, true)}
      >
        <div 
          ref={rightKnobRef}
          className="joystick-knob"
          style={{ 
            transform: `translate(0px, 0px)`,
            backgroundColor: 'rgba(255,255,255,0.5)'
          }}
        />
      </div>

      {/* Jump Button */}
      <div 
        className="jump-btn"
        style={{ right: '40px', bottom: '200px' }}
        onTouchStart={(e) => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          inputRef.current.active = true;
          inputRef.current.isJumping = true;
        }}
        onTouchEnd={(e) => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          inputRef.current.isJumping = false;
        }}
      >
        PULAR
      </div>

      {/* Charge/Reload Button */}
      <div 
        className="jump-btn"
        style={{ 
            right: '140px', 
            bottom: '180px', 
            width: '60px', 
            height: '60px',
            fontSize: '10px'
        }}
        onTouchStart={(e) => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          inputRef.current.active = true;
          inputRef.current.isCharging = true;
        }}
        onTouchEnd={(e) => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          inputRef.current.isCharging = false;
        }}
      >
        CARGA
      </div>

    </div>
  );
};

export default MobileControls;
