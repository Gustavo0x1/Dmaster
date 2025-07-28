/* eslint-disable no-unused-expressions */
import React, { createContext, useContext, useEffect,useState, ReactNode, useCallback } from "react";
import Header from "./Header";
import { Outlet } from 'react-router-dom';
import { Token } from '../types'; // Importe o tipo Token
import { ChatProvider } from '../components/contexts/ChatContext';
import { AudioProvider} from "./AUDIO/MusicPlayer";
import { TurnProvider } from '../components/contexts/TurnContext'; // NEW: Import TurnProvider

// Context API para o layout
interface LayoutContextProps {
  addContentToLeft: (content: ReactNode) => void;
  addContentToCenter: (content: ReactNode) => void;
  addContentToRight: (content: ReactNode) => void;
  addContentToUpperLeft: (content: ReactNode) => void; // NOVO: Adiciona conteúdo à metade superior esquerda
  addContentToBottomLeft: (content: ReactNode) => void; // NOVO: Adiciona conteúdo à metade inferior esquerda


   clearContentFromLeft: () => void; // NOVO: Limpa apenas a coluna esquerda
  clearContentFromCenter: () => void; // NOVO: Limpa apenas a coluna central
  clearContentFromRight: () => void; // NOVO: Limpa apenas a coluna direita
  clearContentFromUpperLeft: () => void; // NOVO: Limpa o conteúdo da metade superior esquerda
  clearContentFromBottomLeft: () => void; // NOVO: Limpa o conteúdo da metade inferior esquerda
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
  const [upperLeftContent, setUpperLeftContent] = useState<React.ReactNode>(null); // NOVO
  const [bottomLeftContent, setBottomLeftContent] = useState<React.ReactNode>(null); // NOVO
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
    setUpperLeftContent(null); // Clear upper/bottom left if general left content is set
    setBottomLeftContent(null);
  }, []);

  const addContentToUpperLeft = useCallback((content: ReactNode) => {
    setUpperLeftContent(content);
    setLeftContent(null); // Clear general left content if upper/bottom left content is set
  }, []);

  const addContentToBottomLeft = useCallback((content: ReactNode) => {
    setBottomLeftContent(content);
    setLeftContent(null); // Clear general left content if upper/bottom left content is set
  }, []);

  const addContentToCenter = useCallback((content: ReactNode) => {
    setCenterContent(content);
  }, []);

  const addContentToRight = useCallback((content: ReactNode) => {
    setRightContent(content);
  }, []);

  const clearContentFromLeft = useCallback(() => {
    setLeftContent(null);
    setUpperLeftContent(null);
    setBottomLeftContent(null);
  }, []);

  const clearContentFromUpperLeft = useCallback(() => {
    setUpperLeftContent(null);
  }, []);

  const clearContentFromBottomLeft = useCallback(() => {
    setBottomLeftContent(null);
  }, []);

  const clearContentFromCenter = useCallback(() => {
    setCenterContent(null);
  }, []);

  const clearContentFromRight = useCallback(() => {
    setRightContent(null);
  }, []);

  return (
    <ChatProvider USERID={currentUserId as number}>
      <AudioProvider>
        <TurnProvider> {/* NEW: Wrap with TurnProvider */}
          <LayoutContext.Provider
            value={{
              addContentToLeft,
              addContentToCenter,
              addContentToRight,
              addContentToUpperLeft, // NOVO
              addContentToBottomLeft, // NOVO
              clearContentFromLeft,
              clearContentFromCenter,
              clearContentFromRight,
              clearContentFromUpperLeft, // NOVO
              clearContentFromBottomLeft, // NOVO
              selectedTokens,
              setSelectedTokens,
            }}
          >
            <header>
              <Header />
            </header>

            <div className="layout-container">

              <div className={`column left-column ${column === "left" ? "active" : ""}`}>
                {leftContent ? (
                  leftContent
                ) : (
                  <>
                    <div className="upper-left-content">
                      {upperLeftContent}
                    </div>
                    <div className="bottom-left-content">
                      {bottomLeftContent}
                    </div>
                  </>
                )}
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
        </TurnProvider> {/* NEW: Close TurnProvider */}
      </AudioProvider>
    </ChatProvider>
  );
};