// src/components/AudioControlTab.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
//import '../../css/AudioControlTab/AudioControlTab.css';
import { AudioFile, ConnectedUser, AudioCommandData, StopAudioCommandData } from '../../types';
import { useLayout } from '../Layout';

interface AudioFileWithCategory extends AudioFile {
    category: 'music' | 'effect';
}

const AudioControlTab: React.FC = () => {
    const electron = (window as any).electron;
    const { addContentToLeft, addContentToCenter, addContentToRight, clearContentFromLeft, clearContentFromCenter, clearContentFromRight } = useLayout();

    const [audioFiles, setAudioFiles] = useState<AudioFileWithCategory[]>([]);
    const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<AudioFileWithCategory | null>(null);
    const [volume, setVolumeState] = useState<number>(0.5);
    const [loopMusic, setLoopMusic] = useState<boolean>(false);
    const [targetUsers, setTargetUsers] = useState<number[]>([]);

    const [musicSearchTerm, setMusicSearchTerm] = useState<string>('');
    const [effectSearchTerm, setEffectSearchTerm] = useState<string>('');
    const [newAudioName, setNewAudioName] = useState<string>('');
    const [newAudioType, setNewAudioType] = useState<'music' | 'effect'>('music');

    const musicPlayerRef = useRef<HTMLAudioElement>(new Audio());
    const fxPlayerRef = useRef<HTMLAudioElement>(new Audio());

    const blobUrlsRef = useRef<Record<number, string>>({});

    const createBlobUrl = useCallback((base64Data: string, mimeType: string): string | null => {
        if (!base64Data || !mimeType) {
            console.error("Missing base64Data or mimeType for Blob URL creation.");
            return null;
        }
        try {
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
            return null;
        }
    }, []);

    const loadAudioFiles = useCallback(async () => {
        const result = await electron.getAudioPool();
        if (result) {
            Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = {};

            const filesWithUrls: AudioFileWithCategory[] = result.map((file: AudioFileWithCategory) => {
                const blobUrl = createBlobUrl(file.data, file.type);
                if (blobUrl) {
                    blobUrlsRef.current[file.id] = blobUrl;
                }
                return {
                    ...file,
                    url: blobUrl || ''
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
            setTargetUsers([-1]); // Default to "Todos os Jogadores"
        } else {
            console.error("Erro ao carregar usuários conectados:");
        }
    }, [electron]);

const handleAddAudio = useCallback(async () => {
    if (!newAudioName.trim()) {
        alert("Por favor, insira um nome para o áudio.");
        return;
    }
    // Pass newAudioName and newAudioType as arguments to the IPC call
    const updatedPool = await electron.addAudio(newAudioName, newAudioType);
    if (updatedPool) {
        // Revoke old URLs before creating new ones
        Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
        blobUrlsRef.current = {};

        // Map updated files to create new Blob URLs
        const filesWithUrls: AudioFileWithCategory[] = updatedPool.map((file: AudioFileWithCategory) => {
            const blobUrl = createBlobUrl(file.data, file.type);
            if (blobUrl) {
                blobUrlsRef.current[file.id] = blobUrl;
            }
            return {
                ...file,
                url: blobUrl || ''
            };
        });
        setAudioFiles(filesWithUrls);
        // Clear input fields after successful addition
        setNewAudioName('');
        setNewAudioType('music'); // Reset to default 'music'
    }
}, [newAudioName, newAudioType, createBlobUrl, electron]);

    // MUDANÇA: Memoize handleSendAudioCommand
    const handleSendAudioCommand = useCallback(async (audioFile: AudioFileWithCategory, isMusic: boolean) => {
        if (!audioFile) {
            alert("Selecione um arquivo de áudio primeiro!");
            return;
        }

        const targetsToSend = targetUsers.includes(-1) ? [-1] : targetUsers;

        if (targetsToSend.length === 0) {
            alert("Selecione para quem tocar o áudio (Todos os Jogadores ou jogadores específicos).");
            return;
        }

        for (const targetId of targetsToSend) {
            const data: AudioCommandData = {
                audioId: audioFile.id,
                audioUrl: audioFile.url || '',
                volume: parseFloat(volume.toString()),
                loop: isMusic && loopMusic,
                targetUserId: targetId
            };
            console.log("sending data with id: " + audioFile.id + ", URL: " + audioFile.url + ", to target: " + targetId);
            const result = await electron.sendAudioCommand("play-audio-command", data);
            if (!result.success) {
                console.error("Falha ao enviar comando de áudio para " + targetId + ":", result.message);
                alert(`Erro ao tocar áudio para ${targetId}: ${result.message}`);
            }
        }
    }, [targetUsers, volume, loopMusic, electron]); // Dependências para handleSendAudioCommand

    // MUDANÇA: Memoize handleSendStopCommand
    const handleSendStopCommand = useCallback(async () => {
        const targetsToSend = targetUsers.includes(-1) ? [-1] : targetUsers;

        if (targetsToSend.length === 0) {
            alert("Selecione para quem parar o áudio (Todos os Jogadores ou jogadores específicos).");
            return;
        }

        for (const targetId of targetsToSend) {
            const data: StopAudioCommandData = {
                targetUserId: targetId
            };

            const result = await electron.sendAudioCommand("stop-audio-command", data);
            if (!result.success) {
                console.error("Falha ao enviar comando de parada de áudio para " + targetId + ":", result.message);
                alert(`Erro ao parar áudio para ${targetId}: ${result.message}`);
            }
        }
    }, [targetUsers, electron]); // Dependências para handleSendStopCommand

    // MUDANÇA: Memoize handleToggleUserSelection
    const handleToggleUserSelection = useCallback((userId: number) => {
        setTargetUsers(prevSelectedUsers => {
            if (userId === -1) {
                return prevSelectedUsers.includes(-1) ? [] : [-1];
            }

            const updatedUsers = prevSelectedUsers.filter(id => id !== -1);

            if (updatedUsers.includes(userId)) {
                return updatedUsers.filter(id => id !== userId);
            } else {
                return [...updatedUsers, userId];
            }
        });
    }, []); // Sem dependências se setTargetUsers não mudar

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

        const handlePlayAudioCommandReceived = async (data: AudioCommandData) => {
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

        const handleStopAudioCommandReceived = async (data: StopAudioCommandData) => {
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

        electron.onPlayAudio(handlePlayAudioCommandReceived);
        electron.onStopAudio(handleStopAudioCommandReceived);

        return () => {
            Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current = {};
            clearContentFromRight();
            clearContentFromCenter();
            clearContentFromLeft();
        };
    }, [loadAudioFiles, loadConnectedUsers, electron, clearContentFromRight, clearContentFromCenter, clearContentFromLeft]);

    useEffect(() => {
        // Content for the right column (Add Audio)
        const rightColumnContent = (
            <div className="audio-right-column">
                <div className="audio-add-section">
                    <h3>Adicionar Novo Áudio</h3>
                    <input
                        type="text"
                        placeholder="Nome do Áudio"
                        value={newAudioName}
                        onChange={(e) => setNewAudioName(e.target.value)}
                    />
                    <select
                        value={newAudioType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAudioType(e.target.value as 'music' | 'effect')}
                    >
                        <option value="music">Música</option>
                        <option value="effect">Efeito Sonoro</option>
                    </select>
                    <button onClick={handleAddAudio}>Selecionar e Adicionar Arquivo</button>
                </div>
            </div>
        );
        addContentToRight(rightColumnContent);

        // Content for the left column (Target User Selection as Cards)
        const leftColumnContent = (
            <div className="audio-left-column">
                <h3>Tocar Para:</h3>
                <div className="user-cards-container">
                    {/* Card para "Todos os Jogadores" */}
                    <div className={`user-card ${targetUsers.includes(-1) ? 'selected' : ''}`}>
                        <label>
                            <input
                                type="checkbox"
                                value={-1}
                                checked={targetUsers.includes(-1)}
                                onChange={() => handleToggleUserSelection(-1)}
                            />
                            Todos os Jogadores
                            {/* Ícone virá aqui posteriormente */}
                        </label>
                    </div>

                    {/* Cards para usuários conectados */}
                    {connectedUsers.map(user => (
                        <div key={user.userId} className={`user-card ${targetUsers.includes(user.userId) ? 'selected' : ''}`}>
                            <label>
                                <input
                                    type="checkbox"
                                    value={user.userId}
                                    checked={targetUsers.includes(user.userId)}
                                    onChange={() => handleToggleUserSelection(user.userId)}
                                />
                                {user.username || `Jogador ${user.userId}`}
                                {/* Ícone virá aqui posteriormente */}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        );
        addContentToLeft(leftColumnContent);

        // Content for the center column (Music and FX tables)
        const centerColumnContent = (
            <div className="audio-center-column">


                <h3>Músicas</h3>
                <input
                    type="text"
                    placeholder="Pesquisar músicas..."
                    value={musicSearchTerm}
                    onChange={(e) => setMusicSearchTerm(e.target.value)}
                />
                <div className="audio-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audioFiles
                                .filter(file => file.category === 'music' && file.name.toLowerCase().includes(musicSearchTerm.toLowerCase()))
                                .map(file => (
                                    <tr key={file.id}>
                                        <td>{file.name}</td>
                                        <td>
                                            <button onClick={() => handleSendAudioCommand(file, true)}>Play</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <h3>Efeitos Sonoros</h3>
                <input
                    type="text"
                    placeholder="Pesquisar efeitos..."
                    value={effectSearchTerm}
                    onChange={(e) => setEffectSearchTerm(e.target.value)}
                />
                <div className="audio-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audioFiles
                                .filter(file => file.category === 'effect' && file.name.toLowerCase().includes(effectSearchTerm.toLowerCase()))
                                .map(file => (
                                    <tr key={file.id}>
                                        <td>{file.name}</td>
                                        <td>
                                            <button onClick={() => handleSendAudioCommand(file, false)}>Play</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
                <div className="action-buttons">
                    <button onClick={handleSendStopCommand}>Parar Áudio</button>
                </div>
            </div>
        );
        addContentToCenter(centerColumnContent);


    }, [
        connectedUsers,
        audioFiles,
        volume,
        loopMusic,
        targetUsers,
        musicSearchTerm,
        effectSearchTerm,
        newAudioName,
        newAudioType,
        addContentToRight,
        addContentToCenter,
        addContentToLeft,
        handleAddAudio,
        handleSendAudioCommand,
        handleSendStopCommand,
        handleToggleUserSelection
    ]);


    return (
        <div className="audio-control-tab">
            <audio ref={musicPlayerRef} style={{ display: 'none' }} />
            <audio ref={fxPlayerRef} style={{ display: 'none' }} />
        </div>
    );
};

export default AudioControlTab;