/* eslint-disable no-unused-expressions */
import React, { createContext, useContext, useEffect,useState, ReactNode, useCallback } from "react";
import Header from "./Header";
import { Outlet } from 'react-router-dom';
import { Token } from '../types'; // Importe o tipo Token
import { ChatProvider } from '../components/contexts/ChatContext';
// Context API para o layout
interface LayoutContextProps {
  addContentToLeft: (content: ReactNode) => void;
  addContentToCenter: (content: ReactNode) => void;
  addContentToRight: (content: ReactNode) => void;

   clearContentFromLeft: () => void; // NOVO: Limpa apenas a coluna esquerda
  clearContentFromCenter: () => void; // NOVO: Limpa apenas a coluna central
  clearContentFromRight: () => void; // NOVO: Limpa apenas a coluna direita
  selectedTokens: Token[]; // NOVO: Tokens selecionados do grid
  setSelectedTokens: (tokens: Token[]) => void; // NOVO: Função para atualizar os tokens selecionados
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
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]); // NOVO: Estado para tokens selecionados no Layout
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState<boolean>(true);
  const electron = (window as any).electron

      useEffect(() => {
      const getUserIdFromMain = async () => {
          if (!electron) {
              console.warn('Objeto electron não encontrado. Não será possível buscar o userId.');
              setCurrentUserId(1); // Fallback
              setIsLoadingUserId(false);
              return;
          }
          try {
              const userId = await electron.invoke('get-userid');
              console.log('USERID obtido do MAIN no Layout:', userId);
              if (userId !== undefined && userId !== null) {
                  setCurrentUserId(userId);
              } else {
                  console.warn('USERID retornado do MAIN é nulo ou indefinido. Usando 1 como fallback.');
                  setCurrentUserId(1); // Fallback
              }
          } catch (error) {
              console.error('Erro ao buscar USERID do MAIN no Layout:', error);
              setCurrentUserId(1); // Fallback
          } finally {
              setIsLoadingUserId(false);
          }
      };

      getUserIdFromMain();
  }, [electron]);
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

  return (
    <ChatProvider USERID={currentUserId as number}>


    <LayoutContext.Provider
      value={{
        addContentToLeft,
        addContentToCenter,
        addContentToRight,
       clearContentFromLeft, // Exporta a nova função
        clearContentFromCenter, // Exporta a nova função
        clearContentFromRight,
        selectedTokens, // Passa o estado dos tokens selecionados
        setSelectedTokens, // Passa a função para atualizar os tokens selecionados
      }}
    >
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
        </ChatProvider>
  );
};