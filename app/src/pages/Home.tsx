// components/Home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLayout } from '../components/Layout'; // Import useLayout
import RPGGrid from '../components/MainGrids';
import Chat from '../components/ChatBox';
import { ChatProvider } from '../components/contexts/ChatContext';
import CombatTracker from '../components/CombatTracker';
import { CombatTrackerToken } from '../types';

import Img1 from '../img/0.png'
import Img2 from '../img/1.png'
import Img3 from '../img/15.png'

type SendChatMessageFunction = (message: string) => void;

// Define a interface para o objeto electron exposto no window
// Isso é crucial para a tipagem segura do ipcRenderer
interface ElectronAPI {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}



const Home: React.FC = () => {
    const electron = (window as any).electron; // Acessa a API Electron
    const { addContentToCenter, addContentToRight, clearContentFromCenter, clearContentFromRight,addContentToLeft,clearContentFromLeft } = useLayout(); // Use the layout hook
    const [sendChatMessage, setSendChatMessage] = useState<SendChatMessageFunction | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null); // Estado para armazenar o USERID do MAIN
    const [isLoadingUserId, setIsLoadingUserId] = useState<boolean>(true); // Estado para controlar o carregamento do userId
    const [combatants, setCombatants] = useState<CombatTrackerToken[]>([
        { id: '1', name: 'Herói Valente', portraitUrl: Img1, ac: 17, currentHp: 80, maxHp: 90, initiative: 20, type: 'ally', danoCausado: 25, danoSofrido: 10 },
        { id: '2', name: 'Orc Brutal', portraitUrl: Img2, ac: 15, currentHp: 15, maxHp: 25, initiative: 18, type: 'enemy', danoCausado: 10, danoSofrido: 25 },
        { id: '3', name: 'Maga Arcana', portraitUrl: Img3, ac: 12, currentHp: 50, maxHp: 50, initiative: 15, type: 'ally', danoCausado: 40, danoSofrido: 0 },
    ]);


  // Esta função será passada como prop para o CombatTracker
  const handleCombatantsChange = (updatedCombatants: CombatTrackerToken[]) => {
    setCombatants(updatedCombatants);
  };
    // Efeito para buscar o USERID do processo MAIN
    useEffect(() => {
        const getUserIdFromMain = async () => {
            if (!electron) {
                console.warn('Objeto electron não encontrado. Não será possível buscar o userId.');
                // Define um userId padrão ou lida com o erro se Electron não estiver disponível
                setCurrentUserId(1); // Usar 1 como fallback, se apropriado para seu ambiente de desenvolvimento
                setIsLoadingUserId(false);
                return;
            }
            try {
                const userId = await electron.invoke('get-userid');
                console.log('USERID obtido do MAIN:', userId);
                if (userId !== undefined && userId !== null) {
                    setCurrentUserId(userId);
                } else {
                    console.warn('USERID retornado do MAIN é nulo ou indefinido. Usando 1 como fallback.');
                    setCurrentUserId(1); // Fallback caso o MAIN retorne null/undefined
                }
            } catch (error) {
                console.error('Erro ao buscar USERID do MAIN:', error);
                setCurrentUserId(1); // Fallback em caso de erro
            } finally {
                setIsLoadingUserId(false);
            }
        };

        getUserIdFromMain();
    }, [electron]); // Dependência em electron para garantir que a API está disponível

    // Use useEffect para adicionar componentes ao layout quando Home mounts
    useEffect(() => {
        // Só adicione os componentes se o userId já foi carregado
        if (!isLoadingUserId && currentUserId !== null) {
            // Add RPGGrid to the center column
            addContentToLeft(    <CombatTracker 
          combatants={combatants} 
          
          
        />);


// ... no seu JSX

            addContentToCenter(<RPGGrid />);
            // Add Chat to the right column, passing the setSendChatMessage prop and the currentUserId
            addContentToRight(<ChatProvider  USERID={currentUserId}><Chat  USERID={currentUserId} /></ChatProvider>); // Use userId aqui

            // Cleanup function to remove components when Home unmounts
            return () => {
                clearContentFromCenter();
                clearContentFromRight();
            };
        }
    }, [
        isLoadingUserId,
        currentUserId,
        addContentToCenter,
        addContentToRight,
        clearContentFromCenter,
        clearContentFromRight,
        setSendChatMessage,
    ]);

    // O componente Home em si não precisa renderizar nada diretamente
    // dentro de seu retorno, já que seus filhos agora são gerenciados pelo Layout.
    // Você pode retornar um spinner de carregamento enquanto o userId está sendo buscado.
    if (isLoadingUserId) {
        return <div>Carregando usuário...</div>; // Ou um componente de loading
    }

    return null; // Ou um placeholder se não houver carregamento
};

export default Home;