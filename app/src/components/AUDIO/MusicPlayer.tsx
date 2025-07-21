// src/context/AudioContext.tsx
import React, { createContext, useState, useContext, useRef, useEffect, ReactNode } from 'react';

// Remover a declaração global 'declare global' daqui.
// Acessaremos window.electron e o tiparemos localmente.

interface AudioContextType {
  currentSongName: string;
  volume: number;
  setVolume: (volume: number) => void;
  playMusic: (audioFile: string) => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  isPlaying: boolean;
}

export const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
    // Tipagem local para 'electron'
    const electron = (window as any).electron;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolumeState] = useState(0.5);
  const [currentSongName, setCurrentSongName] = useState("Nenhuma música tocando");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null); // Armazena como number

  // Efeito para carregar o src da música quando a URL muda
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && currentAudioUrl && audio.src !== currentAudioUrl) {
      audio.src = currentAudioUrl;
      const fileName = currentAudioUrl.split('/').pop()?.split('?')[0] || "Música Desconhecida";
      setCurrentSongName(decodeURIComponent(fileName.replace(/\.mp3$/, '')));
    }
  }, [currentAudioUrl]);

  // Efeito para ajustar o volume do elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Listener para saber quando a música realmente começou/parou de tocar
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handlePlayEvent = () => setIsPlaying(true);
      const handlePauseEvent = () => setIsPlaying(false);

      audio.addEventListener('play', handlePlayEvent);
      audio.addEventListener('pause', handlePauseEvent);

      return () => {
        audio.removeEventListener('play', handlePlayEvent);
        audio.removeEventListener('pause', handlePauseEvent);
      };
    }
  }, []);

  // Efeito para escutar comandos de áudio do Electron (main process)
  useEffect(() => {
    const audio = audioRef.current;

    // Obter e definir o USERID deste cliente
    const fetchAndSetUserId = async () => {
        const id = await electron.getUserId(); // Chamando get-userid via invoke
        const parsedId = id ? parseInt(id, 10) : null;
        setMyUserId(parsedId);
        console.log("[AudioContext] Initial Client USERID set to:", parsedId);
    };
    fetchAndSetUserId();

    // Listener para atualizações de USERID do main process
    const handleSetClientUserId = (userId: string | null) => {
        const parsedId = userId ? parseInt(userId, 10) : null;
        setMyUserId(parsedId);
        console.log("[AudioContext] Client USERID updated by main process to:", parsedId);
    };
    electron.onSetClientUserId(handleSetClientUserId);

    const handlePlayAudioCommand = (data: { audioUrl: string; volume: number; loop: boolean; targetUserId: number }) => {
        // Verifica se o comando é para "-1" (todos) ou para este cliente específico
        if (data.targetUserId === -1 || data.targetUserId === myUserId) {
            console.log(`[AudioContext] Recebido comando 'play-audio' para ${data.targetUserId}. URL: ${data.audioUrl}`);
            setCurrentAudioUrl(data.audioUrl);
            if (audio) {
                audio.volume = data.volume;
                audio.loop = data.loop;
                audio.play().catch(error => {
                    console.warn("Falha ao tocar áudio no AudioContext (provavelmente autoplay bloqueado):", error);
                    setIsPlaying(false);
                });
                setIsPlaying(true);
            }
        }
    };

    const handleStopAudioCommand = (data: { targetUserId: number }) => {
        // Verifica se o comando é para "-1" (todos) ou para este cliente específico
        if (data.targetUserId === -1 || data.targetUserId === myUserId) {
            console.log(`[AudioContext] Recebido comando 'stop-audio' para ${data.targetUserId}.`);
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
                setIsPlaying(false);
            }
        }
    };

    electron.onPlayAudio(handlePlayAudioCommand); // Usando 'electron' local
    electron.onStopAudio(handleStopAudioCommand); // Usando 'electron' local

    return () => {
        // ... (limpeza, se houver)
    };
  }, [myUserId]); // myUserId é uma dependência


  const handleSetVolume = (newVolume: number) => {
    setVolumeState(newVolume);
  };

  const playMusic = (audioFile: string) => {
    setCurrentAudioUrl(audioFile);
    if (audioRef.current) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(error => {
            console.warn("Falha ao tocar música localmente:", error);
            setIsPlaying(false);
        });
        setIsPlaying(true);
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
        console.warn("Falha ao retomar música localmente:", error);
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