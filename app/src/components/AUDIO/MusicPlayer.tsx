// src/context/AudioContext.tsx
import React, { createContext, useState, useContext, useRef, useEffect, ReactNode } from 'react';

import defaultMusic from '../../audio/music1.mp3';

interface AudioContextType {
  currentSongName: string;
  volume: number;
  setVolume: (volume: number) => void;
  playMusic: (audioFile: string) => void;
  pauseMusic: () => void; // Adiciona função de pausa
  resumeMusic: () => void; // Adiciona função para retomar a reprodução
  isPlaying: boolean; // Indica se a música está tocando
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
  initialAudioFile?: string;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children, initialAudioFile = defaultMusic }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolumeState] = useState(0); // Renomeado para evitar conflito com setVolume do contexto
  const [currentSongName, setCurrentSongName] = useState("Nenhuma música tocando");
  const [currentAudioFile, setCurrentAudioFile] = useState(initialAudioFile);
  const [isPlaying, setIsPlaying] = useState(false); // Novo estado para controlar o play/pause

  // Efeito para carregar o src da música quando o arquivo muda
  useEffect(() => {
    if (audioRef.current && audioRef.current.src !== currentAudioFile) {
      audioRef.current.src = currentAudioFile;
      const fileName = currentAudioFile.split('/').pop()?.split('?')[0] || "Música Desconhecida";
      setCurrentSongName(decodeURIComponent(fileName.replace(/\.mp3$/, '')));
      // Não chamamos play() aqui diretamente para evitar o bloqueio de autoplay
      // O play() será chamado por playMusic ou resumeMusic, que esperam interação do usuário.
    }
  }, [currentAudioFile]); // Apenas depende de currentAudioFile

  // Efeito para ajustar o volume do elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]); // Apenas depende do volume

  // Listener para saber quando a música realmente começou a tocar
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
  }, []);

  const handleSetVolume = (newVolume: number) => {
    setVolumeState(newVolume); // Atualiza o estado interno de volume
    // O useEffect acima irá atualizar o volume do audioRef.current
  };

  const playMusic = (audioFile: string) => {
    setCurrentAudioFile(audioFile); // Isso irá disparar o useEffect para mudar o src
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(error => {
        console.warn("Falha ao tentar tocar a música (autoplay bloqueado ou outro erro):", error);
        setIsPlaying(false); // Se falhou, não está tocando
      });
      setIsPlaying(true); // Assumimos que vai tocar, mas o catch pode reverter
    }
  };

  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeMusic = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.warn("Falha ao tentar retomar a música (autoplay bloqueado ou outro erro):", error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const contextValue = {
    currentSongName,
    volume,
    setVolume: handleSetVolume,
    playMusic,
    pauseMusic,
    resumeMusic,
    isPlaying,
  };

  return (
    <AudioContext.Provider value={contextValue}>
      <audio ref={audioRef} />
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};