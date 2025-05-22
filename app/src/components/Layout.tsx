// Layout.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import Header from "./Header";
import Grid from './MainGrid';
import ScreenCoverBanner from "./ScreenCoverBanner";
import DiceApp from "./DiceRoller";
// Context API para o layout
interface LayoutContextProps {
  addContentToLeft: (content: ReactNode) => void;
  addContentToCenter: (content: ReactNode) => void;
  addContentToRight: (content: ReactNode) => void;
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

 const addContentToLeft = (content: ReactNode) => setLeftContent(content);
  const addContentToCenter = (content: ReactNode) => setCenterContent(content);
  const addContentToRight = (content: ReactNode) => setRightContent(content);
  return (
    <LayoutContext.Provider
      value={{
        addContentToLeft,
        addContentToCenter,
        addContentToRight,
      }}
    >
      
        <Header />
        <div className="layout-container " >
          
          <div className={`column  left-column ${column === "left" ? "active" : ""}`}>
         
            {leftContent}
       
          </div>

          {/* Coluna central */}
          <div className={`column tavern center-column ${column === "center" ? "active" : ""}`}>

                {children || <Grid />}
          
            {centerContent}
          </div>

          {/* Coluna direita */}
          <div className={`column right-column ${column === "right" ? "active" : ""}`}>

            {rightContent}
          </div>
        </div>
    
    </LayoutContext.Provider>
  );
};
