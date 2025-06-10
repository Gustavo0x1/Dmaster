// components/Home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useLayout } from '../components/Layout'; // Import useLayout
import RPGGrid from '../components/MainGrids';
import Chat from '../components/ChatBox';
import { ChatProvider } from '../components/contexts/ChatContext';

// Define a type for the sendChatMessage function
type SendChatMessageFunction = (message: string) => void;

// Define a interface para o objeto electron exposto no window
// Isso é crucial para a tipagem segura do ipcRenderer
interface ElectronAPI {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}



const Home: React.FC = () => {
    const electron = (window as any).electron; // Acessa a API Electron
    const { addContentToCenter, addContentToRight, clearContentFromCenter, clearContentFromRight } = useLayout(); // Use the layout hook
    const [sendChatMessage, setSendChatMessage] = useState<SendChatMessageFunction | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null); // Estado para armazenar o USERID do MAIN
    const [isLoadingUserId, setIsLoadingUserId] = useState<boolean>(true); // Estado para controlar o carregamento do userId

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