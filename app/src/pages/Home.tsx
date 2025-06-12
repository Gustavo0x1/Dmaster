// pages/Home.tsx
import React, { useEffect, useState } from 'react';
import { useLayout } from '../components/Layout';
import RPGGrid from '../components/MainGrids';
import Chat from '../components/ChatBox';
import { ChatProvider } from '../components/contexts/ChatContext';
import CombatTracker from '../components/CombatTracker';
import { CombatTrackerToken } from '../types';

import Img1 from '../img/0.png'
import Img2 from '../img/1.png'
import Img3 from '../img/15.png'

const Home: React.FC = () => {
    const { addContentToCenter, addContentToRight, addContentToLeft, clearContentFromCenter, clearContentFromRight, clearContentFromLeft } = useLayout();
    const [isFogModeActive, setIsFogModeActive] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isLoadingUserId, setIsLoadingUserId] = useState<boolean>(true);
    
    // O estado dos combatentes
    const [combatants, setCombatants] = useState<CombatTrackerToken[]>([
        { id: '1', name: 'Herói Valente', portraitUrl: Img1, ac: 17, currentHp: 80, maxHp: 90, initiative: 20, type: 'ally', danoCausado: 25, danoSofrido: 10 },
        { id: '2', name: 'Orc Brutal', portraitUrl: Img2, ac: 15, currentHp: 15, maxHp: 25, initiative: 18, type: 'enemy', danoCausado: 10, danoSofrido: 25 },
        { id: '3', name: 'Maga Arcana', portraitUrl: Img3, ac: 12, currentHp: 50, maxHp: 50, initiative: 15, type: 'ally', danoCausado: 40, danoSofrido: 0 },
    ]);

    // Função para ser passada ao CombatTracker
    const handleCombatantsChange = (updatedCombatants: CombatTrackerToken[]) => {
        setCombatants(updatedCombatants);
    };

    // Efeito para buscar o USERID (sem alterações)
    useEffect(() => {
        const electron = (window as any).electron;
        const getUserIdFromMain = async () => {
            if (!electron) {
                setCurrentUserId(1);
                setIsLoadingUserId(false);
                return;
            }
            try {
                const userId = await electron.invoke('get-userid');
                setCurrentUserId(userId ?? 1);
            } catch (error) {
                console.error('Erro ao buscar USERID do MAIN:', error);
                setCurrentUserId(1);
            } finally {
                setIsLoadingUserId(false);
            }
        };
        getUserIdFromMain();
    }, []);

    // Efeito principal para adicionar conteúdo ao Layout
    useEffect(() => {
        if (!isLoadingUserId && currentUserId !== null) {
            // Coluna da Esquerda: Combat Tracker
            addContentToLeft(
                <CombatTracker 
                    combatants={combatants} 
                   
                />
            );

            // Coluna Central: Grid e Botão de Fog
            addContentToCenter(
             
                    <RPGGrid currentUserId={1}  />
             
             
            );
            
            // Coluna da Direita: Chat
            addContentToRight(
                <ChatProvider USERID={currentUserId}>
                    <Chat USERID={currentUserId} />
                </ChatProvider>
            );

            // Função de limpeza
            return () => {
                clearContentFromLeft();
                clearContentFromCenter();
                clearContentFromRight();
            };
        }
    // CORREÇÃO CRÍTICA: Adicionar 'isFogModeActive' e 'combatants' ao array de dependências
    }, [
        isLoadingUserId,
        currentUserId,
        isFogModeActive, 
        combatants,
        addContentToCenter,
        addContentToRight,
        addContentToLeft,
        clearContentFromCenter,
        clearContentFromRight,
        clearContentFromLeft,
    ]);

    if (isLoadingUserId) {
        return <div>Carregando...</div>;
    }

    return null;
};

export default Home;