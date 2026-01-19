
import React from 'react';
import { GameState } from '../types';

interface SettingsProps {
  setGameState: (state: GameState) => void;
  musicVolume: number;
  setMusicVolume: (vol: number) => void;
  sfxVolume: number;
  setSfxVolume: (vol: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  setGameState, 
  musicVolume, 
  setMusicVolume, 
  sfxVolume, 
  setSfxVolume 
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white z-50 select-none">
      <div className="border-4 border-white p-8 md:p-12 flex flex-col items-center bg-black max-w-lg w-full">
        
        <h1 className="text-3xl md:text-5xl text-white mb-8 tracking-widest font-bold uppercase text-center">
          CONFIGURAÇÕES
        </h1>
        
        <div className="w-full flex flex-col gap-8 mb-8">
          {/* Music Volume */}
          <div className="flex flex-col gap-2">
            <label className="text-sm uppercase tracking-wider font-bold">Música ({Math.round(musicVolume * 100)}%)</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-2">
            <label className="text-sm uppercase tracking-wider font-bold">Efeitos Sonoros ({Math.round(sfxVolume * 100)}%)</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>

        <button 
          className="w-full py-4 bg-white text-black border-2 border-white hover:bg-gray-200 transition-colors text-sm uppercase tracking-wider font-bold"
          onClick={() => setGameState(GameState.MENU)}
          onTouchEnd={(e) => { e.preventDefault(); setGameState(GameState.MENU); }}
        >
          VOLTAR
        </button>
      </div>
    </div>
  );
};

export default Settings;
