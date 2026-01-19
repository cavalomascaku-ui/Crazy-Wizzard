
import React from 'react';
import { GameState } from '../types';

interface GameOverProps {
  setGameState: (state: GameState) => void;
}

const GameOver: React.FC<GameOverProps> = ({ setGameState }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-50 select-none">
      {/* Container with White Border for High Contrast */}
      <div className="border-4 border-white p-12 flex flex-col items-center bg-black max-w-lg w-full">
        
        <h1 className="text-4xl md:text-5xl text-white mb-2 tracking-widest font-bold uppercase text-center">
          VOCÊ MORREU
        </h1>
        
        <div className="w-full h-1 bg-white mb-8 flicker"></div>

        <div className="flex flex-col gap-4 w-full">
          <button 
            className="w-full py-4 bg-black border-2 border-white text-white hover:bg-white hover:text-black transition-colors text-sm uppercase tracking-wider font-bold"
            onClick={() => setGameState(GameState.PLAYING)}
            onTouchEnd={(e) => { e.preventDefault(); setGameState(GameState.PLAYING); }}
          >
            Tentar Novamente
          </button>
          
          <button 
            className="w-full py-4 bg-transparent border-2 border-gray-600 text-gray-400 hover:border-white hover:text-white transition-colors text-sm uppercase tracking-wider"
            onClick={() => setGameState(GameState.MENU)}
            onTouchEnd={(e) => { e.preventDefault(); setGameState(GameState.MENU); }}
          >
            Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
