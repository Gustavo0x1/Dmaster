// src/components/AudioControlTab.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../css/AudioControlTab/AudioControlTab.css';
import { AudioFile, ConnectedUser, AudioCommandData, StopAudioCommandData } from '../../types';

const AudioControlTab: React.FC = () => {
    const electron = (window as any).electron;
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
    const [volume, setVolumeState] = useState<number>(0.5);
    const [loopMusic, setLoopMusic] = useState<boolean>(false);
    const [targetUser, setTargetUser] = useState<number>(-1);

    const musicPlayerRef = useRef<HTMLAudioElement>(new Audio());
    const fxPlayerRef = useRef<HTMLAudioElement>(new Audio());

    // Ref para armazenar as Blob URLs criadas, para revogação e lookup
    const blobUrlsRef = useRef<Record<number, string>>({}); // Mapeia AudioFile.id para a Blob URL

    // Função para criar a Blob URL a partir dos dados Base64
    const createBlobUrl = useCallback((base64Data: string, mimeType: string): string | null => { // Retorna string | null
        if (!base64Data || !mimeType) {
            console.error("Missing base64Data or mimeType for Blob URL creation.");
            return null; // Retorna null em caso de dados ausentes
        }
        try {
            // Verifica se a string Base64 possui o prefixo esperado e remove se presente
            const cleanBase64Data = base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data;
            
            const byteCharacters = atob(cleanBase64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const url = URL.createObjectURL(blob);
            console.log(`[AudioControlTab] Created Blob URL: ${url}`);
            return url;
        } catch (e) {
            console.error("Error creating Blob URL:", e);
            console.error("Problematic base64 data (first 100 chars):", base64Data.substring(0, 100));
            return null; // Retorna null em caso de erro
        }
    }, []);

    // Atualizado para usar createBlobUrl e remover o filtro problemático
    const loadAudioFiles = useCallback(async () => {
        const result = await electron.getAudioPool();
        if (result) {
            Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = {};

            const filesWithUrls: AudioFile[] = result.map((file: AudioFile) => {
                const blobUrl = createBlobUrl(file.data, file.type);
                if (blobUrl) {
                    blobUrlsRef.current[file.id] = blobUrl;
                }
                return {
                    ...file,
                    url: blobUrl || '' // Atribui a Blob URL, ou string vazia se for null (para compatibilidade com `url: string`)
                };
            });
            setAudioFiles(filesWithUrls);
        }
    }, [createBlobUrl, electron]);

    const loadConnectedUsers = useCallback(async () => {
        const result = await electron.getConnectedUsers();
        if (result.success) {
            const users: ConnectedUser[] = result.data.map((id: number) => ({ userId: id, username: `Jogador ${id}` }));
            setConnectedUsers(users);
        } else {
            console.error("Erro ao carregar usuários conectados:");
        }
    }, [electron]);

    useEffect(() => {
        const fetchAndSetUserId = async () => {
            const id = await electron.getUserId();
        };
        fetchAndSetUserId();

        const handleSetClientUserId = (userId: string | null) => {
            console.log("Client USERID updated by main process:", userId);
            loadConnectedUsers();
        };
        electron.onSetClientUserId(handleSetClientUserId);

        loadAudioFiles();
        loadConnectedUsers();

        const handlePlayAudioCommand = async (data: AudioCommandData) => {
            const currentUserId = await electron.getUserId();
            const parsedCurrentUserId = currentUserId ? parseInt(currentUserId, 10) : null;

            if (data.targetUserId === -1 || data.targetUserId === parsedCurrentUserId) {
                console.log(`[AudioControlTab] Play audio command received. URL: ${data.audioUrl}, Target: ${data.targetUserId}`);
                
                const player = data.loop ? musicPlayerRef.current : fxPlayerRef.current;
                
                if (player) {
                    if (player.src !== data.audioUrl) {
                        player.src = data.audioUrl;
                    }
                    player.volume = data.volume;
                    player.loop = data.loop;
                    player.play().catch(e => console.error("Error playing audio:", e));
                } else {
                    console.warn("[AudioControlTab] Player ref is null during play command.");
                }
            }
        };

        const handleStopAudioCommand = async (data: StopAudioCommandData) => {
            const currentUserId = await electron.getUserId();
            const parsedCurrentUserId = currentUserId ? parseInt(currentUserId, 10) : null;

            if (data.targetUserId === -1 || data.targetUserId === parsedCurrentUserId) {
                console.log(`[AudioControlTab] Stop audio command received. Target: ${data.targetUserId}`);
                if (musicPlayerRef.current) {
                    musicPlayerRef.current.pause();
                    musicPlayerRef.current.currentTime = 0;
                }
                if (fxPlayerRef.current) {
                    fxPlayerRef.current.pause();
                    fxPlayerRef.current.currentTime = 0;
                }
            }
        };

        electron.onPlayAudio(handlePlayAudioCommand);
        electron.onStopAudio(handleStopAudioCommand);

        return () => {
            Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = {};
        };
    }, [loadAudioFiles, loadConnectedUsers, electron, createBlobUrl]);

    // Atualizado para usar createBlobUrl e remover o filtro problemático
    const handleAddAudio = async () => {
        const updatedPool = await electron.addAudio();
        if (updatedPool) {
            Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = {};

            const filesWithUrls: AudioFile[] = updatedPool.map((file: AudioFile) => {
                const blobUrl = createBlobUrl(file.data, file.type);
                if (blobUrl) {
                    blobUrlsRef.current[file.id] = blobUrl;
                }
                return {
                    ...file,
                    url: blobUrl || '' // Atribui a Blob URL, ou string vazia se for null (para compatibilidade com `url: string`)
                };
            });
            setAudioFiles(filesWithUrls);
        }
    };

    const handleSendAudioCommand = async (isMusic: boolean) => {
        if (!selectedAudio) {
            alert("Selecione um arquivo de áudio primeiro!");
            return;
        }
        // Verifica se a URL do áudio selecionado é válida antes de enviar
        if (!selectedAudio.url) {
            alert("O áudio selecionado não pôde ser carregado. Tente adicionar novamente.");
            return;
        }

        const data: AudioCommandData = {
            audioUrl: selectedAudio.url,
            volume: parseFloat(volume.toString()),
            loop: isMusic && loopMusic,
            targetUserId: targetUser
        };

        const result = await electron.sendAudioCommand("play-audio-command", data);
        if (!result.success) {
            console.error("Falha ao enviar comando de áudio:", result.message);
            alert(`Erro: ${result.message}`);
        }
    };

    const handleSendStopCommand = async () => {
        const data: StopAudioCommandData = {
            targetUserId: targetUser
        };
        
        const result = await electron.sendAudioCommand("stop-audio-command", data);
        if (!result.success) {
            console.error("Falha ao enviar comando de parada de áudio:", result.message);
            alert(`Erro ao parar áudio: ${result.message}`);
        }
    };

    return (
        <div className="audio-control-tab">
            <h2>Controle de Áudio</h2>

            <div className="audio-section">
                <h3>Biblioteca de Áudio</h3>
                <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAudio(audioFiles.find(f => f.id === parseInt(e.target.value)) || null)}>
                    <option value="">Selecione um Áudio</option>
                    {audioFiles.map(file => (
                        <option key={file.id} value={file.id} disabled={!file.url}>{file.name}{!file.url && " (Erro ao carregar)"}</option> // Desabilita se URL for inválida
                    ))}
                </select>
                <button onClick={handleAddAudio}>Adicionar Áudio</button>
            </div>

            <div className="audio-controls">
                <h3>Controles de Reprodução</h3>
                <label>
                    Volume:
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVolumeState(parseFloat(e.target.value))}
                    />
                    {(volume * 100).toFixed(0)}%
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={loopMusic}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoopMusic(e.target.checked)}
                    />
                    Loop (para música)
                </label>
            </div>

            <div className="target-selection">
                <h3>Tocar Para:</h3>
                <select onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTargetUser(parseInt(e.target.value, 10))} value={targetUser}>
                    <option value={-1}>Todos os Jogadores</option>
                    {connectedUsers.map(user => (
                        <option key={user.userId} value={user.userId}>{user.username || `Jogador ${user.userId}`}</option>
                    ))}
                </select>
            </div>

            <div className="action-buttons">
                <button onClick={() => handleSendAudioCommand(true)}>Tocar Música</button>
                <button onClick={() => handleSendAudioCommand(false)}>Tocar Efeito Sonoro</button>
                <button onClick={handleSendStopCommand}>Parar Áudio</button>
            </div>
            
            <audio ref={musicPlayerRef} style={{ display: 'none' }} />
            <audio ref={fxPlayerRef} style={{ display: 'none' }} />
        </div>
    );
};

export default AudioControlTab;