// Layout.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import Header from "./Header";
import { Outlet } from 'react-router-dom';
import { Token } from '../types'; // Importe o tipo Token (ajuste o caminho)
import SystemIMG from '../img/bot.png';
import deftoken from '../img/0.png';

// Define o tipo de Mensagem
export type Message = {
  id: number;
  text: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
};

// Constantes para o remetente padrão do sistema
const DEFAULT_SYSTEM_SENDER_ID = '-1';
const DEFAULT_SYSTEM_SENDER_NAME = 'Sistema';
const DEFAULT_SYSTEM_SENDER_AVATAR = SystemIMG;

// NOVO: Tipo para os atributos básicos
export interface BasicAttribute {
  name: string;
  value: number;
  modifier: number; // Adicionado para consistência com FullCharSheet
}

// NOVO: Tipo principal para a Ficha de Personagem (uma versão mais leve para o Layout)
export interface CharacterSheet {
  imageUrl: string;
  health: {
    current: number;
    max: number;
    deathSaves: {
      successes: Array<boolean | null>;
      failures: Array<boolean | null>;
    };
  };
  attributes: BasicAttribute[];
  // Adicione outras seções da ficha aqui conforme necessário, se forem necessárias globalmente
}

// Context API para o layout
interface LayoutContextProps {
  addContentToLeft: (content: ReactNode) => void;
  addContentToCenter: (content: ReactNode) => void;
  addContentToRight: (content: ReactNode) => void;

  clearContentFromLeft: () => void;
  clearContentFromCenter: () => void;
  clearContentFromRight: () => void;
  selectedTokens: Token[];
  setSelectedTokens: (tokens: Token[]) => void;

  chatMessages: Message[];
  addChatMessage: (message: string, senderId?: string, senderName?: string, senderAvatar?: string) => void;

  // NOVO: Estado e função de atualização para a ficha de personagem
  characterSheet: CharacterSheet;
  updateCharacterSheet: (newSheetData: Partial<CharacterSheet>) => void;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);

// Hook para consumir o contexto
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout deve ser usado dentro de um LayoutProvider");
  }
  return context;
};

// Componente Layout
export const Layout = ({ children }: { children?: ReactNode }) => {
  const [column, setColumn] = useState<"left" | "center" | "right">("center");
  const [leftContent, setLeftContent] = useState<React.ReactNode>(null);
  const [centerContent, setCenterContent] = useState<React.ReactNode>(null);
  const [rightContent, setRightContent] = useState<React.ReactNode>(null);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);

  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: 1, text: 'Bem-vindo ao chat!', sender: { id: DEFAULT_SYSTEM_SENDER_ID, name: DEFAULT_SYSTEM_SENDER_NAME, avatar: DEFAULT_SYSTEM_SENDER_AVATAR } },
    { id: 2, text: 'Gostaria de saber mais sobre o projeto.', sender: { id: 'john_doe', name: 'João Silva', avatar: 'https://via.placeholder.com/50/FF5733/FFFFFF?text=JS' } },
    { id: 3, text: 'Olá! Em que posso ajudar?', sender: { id: 'user', name: 'Você', avatar: 'https://via.placeholder.com/50/3366FF/FFFFFF?text=VC' } },
  ]);



  // NOVO: Estado da Ficha de Personagem Centralizada (para o Layout)
  const [characterSheet, setCharacterSheet] = useState<CharacterSheet>({
    imageUrl: deftoken, // URL padrão da imagem do personagem
    health: {
      current: 35,
      max: 50,
      deathSaves: {
        successes: [null, null, null],
        failures: [null, null, null],
      },
    },
    attributes: [
      { name: 'Força', value: 10, modifier: 0 },
      { name: 'Destreza', value: 12, modifier: 1 },
      { name: 'Constituição', value: 14, modifier: 2 },
      { name: 'Inteligência', value: 8, modifier: -1 },
      { name: 'Sabedoria', value: 16, modifier: 3 },
      { name: 'Carisma', value: 10, modifier: 0 },
    ],
    // Inicialize outros dados da ficha aqui
  });

  // NOVO: Função para atualizar a ficha de personagem
  const updateCharacterSheet = useCallback((newSheetData: Partial<CharacterSheet>) => {
    setCharacterSheet(prevSheet => {
      // Mescla profundamente os objetos aninhados para evitar sobrescrever tudo
      const updatedSheet = { ...prevSheet, ...newSheetData };

      if (newSheetData.health) {
        updatedSheet.health = { ...prevSheet.health, ...newSheetData.health };
        if (newSheetData.health.deathSaves) {
          updatedSheet.health.deathSaves = { ...prevSheet.health.deathSaves, ...newSheetData.health.deathSaves };
        }
      }
      if (newSheetData.attributes) {
        // Para atributos, pode ser mais complexo se a ordem ou nomes mudarem.
        // Aqui, estou substituindo o array completo. Ajuste conforme sua necessidade.
        updatedSheet.attributes = newSheetData.attributes;
      }
      return updatedSheet;
    });
  }, []);

  const addChatMessage = useCallback((message: string, senderId?: string, senderName?: string, senderAvatar?: string): void => {
    const finalSenderId = senderId !== undefined ? senderId : DEFAULT_SYSTEM_SENDER_ID;
    const finalSenderName = senderName !== undefined ? senderName : DEFAULT_SYSTEM_SENDER_NAME;
    const finalSenderAvatar = senderAvatar !== undefined ? senderAvatar : DEFAULT_SYSTEM_SENDER_AVATAR;

    setChatMessages((prevMessages) => {
        return [
            ...prevMessages,
            { id: prevMessages.length + 1, text: message, sender: { id: finalSenderId, name: finalSenderName, avatar: finalSenderAvatar } },
        ];
    });
  }, []);


  // Memoizar funções com useCallback
  const addContentToLeft = useCallback((content: ReactNode) => {
    setLeftContent(content);
  }, []);

  const addContentToCenter = useCallback((content: ReactNode) => {
    setCenterContent(content);
  }, []);

  const addContentToRight = useCallback((content: ReactNode) => {
    setRightContent(content);
  }, []);

  const clearContentFromLeft = useCallback(() => {
    setLeftContent(null);
  }, []);

  const clearContentFromCenter = useCallback(() => {
    setCenterContent(null);
  }, []);

  const clearContentFromRight = useCallback(() => {
    setRightContent(null);
  }, []);

  // Use useMemo para evitar re-renderizações desnecessárias do contexto
  const contextValue = useMemo(() => ({
    addContentToLeft,
    addContentToCenter,
    addContentToRight,
    clearContentFromLeft,
    clearContentFromCenter,
    clearContentFromRight,
    selectedTokens,
    setSelectedTokens,
    chatMessages,
    addChatMessage,
    characterSheet, // Exportando a ficha
    updateCharacterSheet, // Exportando a função de atualização da ficha
  }), [
    addContentToLeft, addContentToCenter, addContentToRight,
    clearContentFromLeft, clearContentFromCenter, clearContentFromRight,
    selectedTokens, setSelectedTokens,
    chatMessages, addChatMessage,
    characterSheet, updateCharacterSheet
  ]);


  return (
    <LayoutContext.Provider value={contextValue}>
      <header>
        <Header />
      </header>

      <div className="layout-container">

        <div className={`column left-column ${column === "left" ? "active" : ""}`}>
          {leftContent}
        </div>

        <div className={`column tavern center-column ${column === "center" ? "active" : ""}`}>
          {children || <Outlet />}
          {centerContent}
        </div>

        <div className={`column right-column ${column === "right" ? "active" : ""}`}>
          {rightContent}
        </div>
      </div>
    </LayoutContext.Provider>
  );
};