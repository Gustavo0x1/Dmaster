import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import mapImage from '../img/3.jpeg';
import token1 from '../img/0.png';
import token2 from '../img/15.png';
import { useLayout } from "./Layout";
import TokenInfo from './TokenInfo';

import { Token as AppToken } from '../types'; // Importa o tipo Token do types.ts como AppToken

interface Position {
  x: number;
  y: number;
}

// Tipo local para o token no contexto do grid (id: number)
interface GridToken extends AppToken { // Estende AppToken (do types.ts)
  id: number; // Mantém o ID como number para operações internas do grid
  // Adicione outras propriedades específicas do GridToken que não estão em AppToken, se houver.
  // As propriedades x, y, image, width, height já estão em AppToken, então não precisam ser repetidas aqui.
}

const GRID_SIZE = 50;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const RPGGrid: React.FC = () => {
  // Refs]


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<number, HTMLImageElement>>({});
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);

  // State
  const [ghostToken, setGhostToken] = useState<{
    token: GridToken | null;
    opacity: number;
  }>({
    token: null,
    opacity: 0.5,
  });
  const {  addContentToRight, setSelectedTokens } = useLayout(); // NOVO: setSelectedTokens do Layout
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [tokens, setTokens] = useState<GridToken[]>([
    { id: 1, x: 0, y: 0, image: token1, width: 1, height: 1, name: "Herói", portraitUrl: token1, currentHp: 20, maxHp: 20, ac: 18, damageDealt: "1d8+4" },
    { id: 2, x: 3, y: 3, image: token2, width: 1, height: 1, name: "Goblin", portraitUrl: token2, currentHp: 7, maxHp: 7, ac: 15, damageDealt: "1d6+2" },
  ]);
  const [draggedToken, setDraggedToken] = useState<GridToken | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedGridTokenIds, setSelectedGridTokenIds] = useState<number[]>([]); // Usar IDs numéricos para seleção interna do grid

    
  // Converter GridToken para AppToken para o Contexto
  const convertGridTokenToAppToken = useCallback((gridToken: GridToken): AppToken => {
    return {
      id: gridToken.id, // ID já é number no AppToken e GridToken
      name: gridToken.name,
      portraitUrl: gridToken.portraitUrl,
      currentHp: gridToken.currentHp,
      maxHp: gridToken.maxHp,
      ac: gridToken.ac,
      damageDealt: gridToken.damageDealt,
      x: gridToken.x,
      y: gridToken.y,
      image: gridToken.image,
      width: gridToken.width,
      height: gridToken.height,
    };
  }, []);

  // MOVE TOKEN (otimizado com useCallback para estabilidade)
  const moveToken = useCallback((id: number, newX: number, newY: number) => {
    setTokens(prevTokens =>
      prevTokens.map(token =>
        token.id === id ? { ...token, x: newX, y: newY } : token
      )
    );
  }, []);

  // ELECTRON ---------
  const electron = (window as any).electron;

  // CORREÇÃO: Apenas um useEffect para o listener do Electron
  useEffect(() => {
    if (!electron) {
        console.warn('Objeto electron não encontrado. Ignorando listeners.');
        return;
    }
    const handleSyncTokenPosition = (data: GridToken) => { // data deve ser do tipo esperado
      moveToken(data.id, data.x, data.y);
    };

    electron.on("SyncTokenPosition", handleSyncTokenPosition);

    return () => {
      electron.DoremoveListener("SyncTokenPosition", handleSyncTokenPosition); // CORREÇÃO: removeListener
    };
  }, [electron, moveToken]);

  // ------ ELECTRON

  // Desenha o grid e os tokens (memoizado, com todas as dependências que afetam o desenho)
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(zoom, zoom);

    const mapImg = mapImageRef.current;
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height);
    } else {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Desenha todos os tokens
    tokens.forEach((token) => {
      const img = tokenImages.current[token.id];
      if (img) {
        ctx.drawImage(
          img,
          token.x * GRID_SIZE,
          token.y * GRID_SIZE,
          token.width * GRID_SIZE,
          token.height * GRID_SIZE
        );

        // Desenha borda de seleção para tokens selecionados
        if (selectedGridTokenIds.includes(token.id)) { // Usar selectedGridTokenIds aqui
          ctx.strokeStyle = '#0dcaf0'; // Cor da borda para seleção (ex: info blue)
          ctx.lineWidth = 3 / zoom;
          ctx.strokeRect(
            token.x * GRID_SIZE,
            token.y * GRID_SIZE,
            token.width * GRID_SIZE,
            token.height * GRID_SIZE
          );
        }
      }
    });

    // Desenha o token fantasma se existir
    if (ghostToken.token && dragPositionRef.current) {
      const img = tokenImages.current[ghostToken.token.id];
      if (img) {
        ctx.globalAlpha = ghostToken.opacity;
        ctx.drawImage(
          img,
          dragPositionRef.current.x * GRID_SIZE,
          dragPositionRef.current.y * GRID_SIZE,
          ghostToken.token.width * GRID_SIZE,
          ghostToken.token.height * GRID_SIZE
        );
        ctx.globalAlpha = 1.0; // Restaura a opacidade
      }
    }

    ctx.restore();
  }, [position, zoom, tokens, selectedGridTokenIds, ghostToken]); // TODAS AS DEPENDÊNCIAS QUE AFETAM O DESENHO

  // Carrega a imagem do mapa e as imagens dos tokens (apenas uma vez na montagem inicial)
  useEffect(() => {
     
    
    // Carrega imagem do mapa
    const mapImgElement = new Image();
    mapImgElement.src = mapImage;
    mapImgElement.onload = () => {
      mapImageRef.current = mapImgElement;
      drawGrid(); // Desenha após carregar mapa
    };
    mapImgElement.onerror = () => {
      console.error('Failed to load map image:', mapImage);
      mapImageRef.current = null;
      drawGrid();
    };

    // Pré-carrega imagens dos tokens iniciais
    tokens.forEach((token) => {
      const img = new Image();
      img.src = token.image;
      img.onload = () => {
        tokenImages.current[token.id] = img;
        drawGrid(); // Desenha após carregar imagem do token
      };
      img.onerror = () => {
        console.error(`Failed to load image for token: ${token.id}`);
      };
    });

  }, [drawGrid, addContentToRight]); // Depende de drawGrid e addContentToRight (ambas estáveis)

  // Efeito para redesenhar quando position, zoom, tokens, selectedGridTokenIds ou ghostToken mudam
  useEffect(() => {
    drawGrid();
  }, [position, zoom, tokens, selectedGridTokenIds, ghostToken, drawGrid]);


  // Redimensiona o canvas (memoizado)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawGrid();
    }
  }, [drawGrid]);

  // Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - position.x) / zoom;
    const mouseY = (e.clientY - rect.top - position.y) / zoom;

    const clickedToken = tokens.find(
      (token) =>
        mouseX >= token.x * GRID_SIZE &&
        mouseX <= (token.x + token.width) * GRID_SIZE &&
        mouseY >= token.y * GRID_SIZE &&
        mouseY <= (token.y + token.height) * GRID_SIZE
    );

    // Seleção de token com CTRL + CLICK
    if (e.ctrlKey) {
      setIsSelectionMode(true);
      if (clickedToken) {
        setSelectedGridTokenIds(prev =>
          prev.includes(clickedToken.id)
            ? prev.filter(id => id !== clickedToken.id)
            : [...prev, clickedToken.id]
        );
      } else {
        setSelectedGridTokenIds([]); // Limpa a seleção se clicar no fundo
      }
    } else if (clickedToken) { // Inicia arrasto de token se não estiver em modo seleção
      const offsetX = mouseX - clickedToken.x * GRID_SIZE;
      const offsetY = mouseY - clickedToken.y * GRID_SIZE;
      setDraggedToken(clickedToken);
      setDragOffset({ x: offsetX, y: offsetY });
      
      setGhostToken({
        token: { ...clickedToken },
        opacity: 0.5
      });
      // Remove o token clicado da seleção se ele for arrastado e não estiver em modo CTRL
      setSelectedGridTokenIds(prev => prev.filter(id => id !== clickedToken.id));

    } else { // Inicia o pan da tela
      setIsPanning(true);
      setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      setSelectedGridTokenIds([]); // Limpa a seleção se iniciar pan sem CTRL
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedToken && dragOffset) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - position.x) / zoom;
      const mouseY = (e.clientY - rect.top - position.y) / zoom;

      const newDragPosition = {
        x: Math.round((mouseX - dragOffset.x) / GRID_SIZE),
        y: Math.round((mouseY - dragOffset.y) / GRID_SIZE),
      };

      if (
        !dragPositionRef.current ||
        newDragPosition.x !== dragPositionRef.current.x ||
        newDragPosition.y !== dragPositionRef.current.y
      ) {
        dragPositionRef.current = newDragPosition;
        // ATUALIZA O ESTADO DO GHOSTTOKEN AQUI para redesenhar
        setGhostToken(prev => ({ ...prev, token: prev.token ? { ...prev.token, x: newDragPosition.x, y: newDragPosition.y } : null }));
      }
    }
  }, [isPanning, panStart, draggedToken, dragOffset, position, zoom]); // Removido drawGrid

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (draggedToken && dragPositionRef.current) {
        moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);

        if (electron && electron.requestTokenMove) {
          electron.requestTokenMove(
            draggedToken.id,
            dragPositionRef.current.x,
            dragPositionRef.current.y,
            0
          );
        }
        
        dragPositionRef.current = null;
      }

      setIsPanning(false);
      setDraggedToken(null);
      setDragOffset(null);
      setGhostToken({ token: null, opacity: 0.5 });
    },
    [draggedToken, moveToken, electron]
  );

  const handleZoom = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const delta = -event.deltaY / 500;
    setZoom((prevZoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta)));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Control') {
      setIsSelectionMode(true);
    }
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Control') {
      setIsSelectionMode(false);
    }
  }, []);


  // NOVO: Efeito para sincronizar selectedGridTokenIds com selectedTokens do Layout
  useEffect(() => {
    const appTokens = selectedGridTokenIds
      .map(id => tokens.find(t => t.id === id))
      .filter((token): token is GridToken => token !== undefined) // Filtra undefineds e garante tipo
      .map(gridToken => convertGridTokenToAppToken(gridToken)); // Converte para AppToken

    setSelectedTokens(appTokens); // Envia os AppTokens selecionados para o Layout

    // Limpeza: Ao desmontar o RPGGrid, limpa os tokens selecionados no Layout
    return () => {
      setSelectedTokens([]);
      
    };
  }, [selectedGridTokenIds, tokens, convertGridTokenToAppToken, setSelectedTokens]);


  // Event Listeners globais (resize, wheel)
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener('wheel', handleZoom, { passive: false });
    }
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('wheel', handleZoom);
      }
    };
  }, [resizeCanvas, handleZoom]);


  return (
    <div
      ref={containerRef}
      className="overflow-hidden position-relative w-100 h-100"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-100 h-100"
      />
    </div>
  );
};

export default RPGGrid;