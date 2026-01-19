
import React, { useState, useEffect, useRef } from 'react';
import Menu from './components/Menu';
import StageOne from './components/StageOne';
import GameOver from './components/GameOver';
import Settings from './components/Settings';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Audio State with LocalStorage Persistence
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('musicVolume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  
  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem('sfxVolume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  
  // Custom Cursor Logic
  const cursorRef = useRef<HTMLDivElement>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // --- AUDIO SYSTEM (Simplified) ---
  useEffect(() => {
    const MUSIC_URL = "https://pgs92212.github.io/bruxo-maluco/musica/musicafantasy.mp3";
    
    // Create Audio Object
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = musicVolume;
    bgmRef.current = audio;

    // Autoplay handling
    const playAudio = async () => {
      try {
        await audio.play();
      } catch (err) {
        console.log("Autoplay blocked, waiting for user interaction");
      }
    };

    playAudio();

    // Fallback interaction handler
    const handleInteraction = () => {
      if (bgmRef.current && bgmRef.current.paused) {
        bgmRef.current.play().catch(e => console.error("Play failed", e));
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      audio.pause();
      audio.src = "";
      bgmRef.current = null;
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []); // Run once on mount

  // Update Music Volume & Persist
  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = musicVolume;
    }
    localStorage.setItem('musicVolume', musicVolume.toString());
  }, [musicVolume]);

  // Persist SFX Volume
  useEffect(() => {
    localStorage.setItem('sfxVolume', sfxVolume.toString());
  }, [sfxVolume]);
  
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(true);
      window.removeEventListener('touchstart', detectTouch);
    };

    window.addEventListener('touchstart', detectTouch);

    const moveCursor = (e: MouseEvent) => {
      if (cursorRef.current && !isTouchDevice) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    const mouseDown = () => {
      if (cursorRef.current && !isTouchDevice) {
        cursorRef.current.classList.add('scale-90');
      }
    };

    const mouseUp = () => {
      if (cursorRef.current && !isTouchDevice) {
        cursorRef.current.classList.remove('scale-90');
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('touchstart', detectTouch);
    };
  }, [isTouchDevice]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Custom Cursor */}
      {!isTouchDevice && (
        <div 
            ref={cursorRef}
            className="fixed top-0 left-0 z-[100] pointer-events-none"
            style={{ willChange: 'transform' }}
        >
            <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ imageRendering: 'pixelated' }}
            >
                <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor="#000000" floodOpacity="0.5"/>
                </filter>
                </defs>
                <g filter="url(#shadow)">
                <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M2 2V16L6 12H10L13 18L15 17L12 11H16L2 2Z" 
                    fill="white" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="square" 
                    strokeLinejoin="miter" 
                    shapeRendering="crispEdges"
                />
                </g>
            </svg>
        </div>
      )}

      {/* CRT Overlay Effects */}
      <div className="scanlines pointer-events-none z-50"></div>
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-10 bg-noise"></div>
      <div className="absolute inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

      <div className="relative z-10 w-full h-full">
        {gameState === GameState.MENU && (
          <Menu 
            onStart={() => setGameState(GameState.PLAYING)} 
            onSettings={() => setGameState(GameState.SETTINGS)} 
          />
        )}
        
        {gameState === GameState.SETTINGS && (
          <Settings 
            setGameState={setGameState}
            musicVolume={musicVolume}
            setMusicVolume={setMusicVolume}
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
          />
        )}
        
        {gameState === GameState.PLAYING && (
          <StageOne 
            setGameState={setGameState} 
            sfxVolume={sfxVolume}
            isTouchDevice={isTouchDevice}
          />
        )}

        {gameState === GameState.GAME_OVER && (
          <GameOver setGameState={setGameState} />
        )}
      </div>
    </div>
  );
};

export default App;
