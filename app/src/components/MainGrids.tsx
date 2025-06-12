import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import initialMapImage from '../img/3.jpeg';
import token1 from '../img/0.png';
import token2 from '../img/15.png';
import { useLayout } from "./Layout";
import { Token as AppToken } from '../types';
import { Modal, Button,Form } from 'react-bootstrap';
import { AssetPool } from './AssetsPool';

import { ScenarioPool } from './ScenarioPool';

// --- INTERFACES E TIPOS ---
interface Position { x: number; y: number; }
interface GridToken extends AppToken { id: number; }
type ToolMode = 'cursor' | 'paint' | 'erase' | 'fog-area';

interface RPGGridProps {
  currentUserId: number | null;
}

// Estrutura do objeto de Cenário que centraliza o estado
interface Scenario {
  mapImageUrl: string;
  tokens: GridToken[];
  fogGrid: number[][];
}

// --- CONSTANTES ---
const GRID_SIZE = 50;
const GM_ID = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

// --- COMPONENTE PRINCIPAL ---
const RPGGrid: React.FC<RPGGridProps> = ({ currentUserId }) => {
  // --- REFS ---
  const [fogAreaStart, setFogAreaStart] = useState<Position | null>(null); // Posição em COORDENADAS DE GRID
const fogAreaPreviewEndRef = useRef<Position | null>(null); // Posição em COORDENADAS DE GRID
const [fogAreaMode, setFogAreaMode] = useState<'paint' | 'erase'>('paint');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<number, HTMLImageElement>>({});
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);

  // NOVO: Position agora é um useRef para updates diretos sem re-render do componente pai
  const position = useRef<Position>({ x: 0, y: 0 }); 
  const animationFrameId = useRef<number | null>(null); // ID para requestAnimationFrame

  // --- STATES ---
  const { setSelectedTokens } = useLayout();
  
  const [scenario, setScenario] = useState<Scenario>({
    mapImageUrl: initialMapImage,
    tokens: [
      { id: 1, x: 0, y: 0, image: token1, width: 1, height: 1, name: "Herói", portraitUrl: token1, currentHp: 20, maxHp: 20, ac: 18, damageDealt: "1d8+4" },
      { id: 2, x: 3, y: 3, image: token2, width: 1, height: 1, name: "Goblin", portraitUrl: token2, currentHp: 7, maxHp: 7, ac: 15, damageDealt: "1d6+2" },
    ],
    fogGrid: []
  });
  const [currentScenarioId, setCurrentScenarioId] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [showScenarioPool, setShowScenarioPool] = useState(false);
  const [addingToken, setAddingToken] = useState<GridToken | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>('cursor');
  const [isPainting, setIsPainting] = useState(false);
  const zoom = useRef<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [draggedToken, setDraggedToken] = useState<GridToken | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [selectedGridTokenIds, setSelectedGridTokenIds] = useState<number[]>([]);
  const [ghostToken, setGhostToken] = useState<{ token: GridToken | null; opacity: number; }>({ token: null, opacity: 0.5 });
  
  const [showTokenPool, setShowTokenPool] = useState(false);
  const [showMapPool, setShowMapPool] = useState(false);

  // --- FUNÇÕES DA BARRA DE FERRAMENTAS ---

  const handleAddMap = () => {
    setShowMapPool(true);
  };

  const handleAddToken = () => {
    setShowTokenPool(true);
  };
  
  const onMapSelected = (mapDataUrl: string) => {
    const img = new Image();
    img.src = mapDataUrl;
    
    img.onload = () => {
      const mapWidthInGrids = Math.ceil(img.width / GRID_SIZE);
      const mapHeightInGrids = Math.ceil(img.height / GRID_SIZE);
      
      const newFogGrid = Array.from({ length: mapHeightInGrids }, () => Array(mapWidthInGrids).fill(0));

      setScenario(prev => ({ 
        ...prev, 
        mapImageUrl: mapDataUrl,
        fogGrid: newFogGrid
      }));
    };
    
    setShowMapPool(false);
  };
const onScenarioSelected = async (scenarioId: number) => {
  const electron = (window as any).electron;
  if (!electron?.invoke) return;

  const result = await electron.invoke('load-scenario', scenarioId);
  
  if (result.success) {
    setScenario(result.data);
    setCurrentScenarioId(scenarioId); // <-- GUARDA O ID AQUI
    
  } else {
    
    setCurrentScenarioId(null); // Limpa o ID em caso de falha
  }
  
  setShowScenarioPool(false);
};

const onTokenSelected = (tokenPath: string) => {
  const newToken: GridToken = {
    id: Date.now(), x: 0, y: 0, image: tokenPath, portraitUrl: tokenPath,
    width: 1, height: 1, name: "Novo Token", currentHp: 10, maxHp: 10, ac: 10, damageDealt: "1d4"
  };

  // NOVO: Pré-carregar a imagem do token e armazenar na referência
  const img = new Image();
  img.src = tokenPath;
  img.onload = () => {
    tokenImages.current[newToken.id] = img; // Armazena a imagem carregada
    setAddingToken(newToken); // Define o token para ser adicionado (fantasma) SOMENTE DEPOIS que a imagem carregou
    setShowTokenPool(false); // Fecha o modal
    setActiveTool('cursor'); // Opcional: Garante que a ferramenta de cursor esteja ativa para posicionamento
  };
  img.onerror = () => {
      console.error("Falha ao carregar a imagem do token:", tokenPath);
      // Lidar com o erro, talvez não definir addingToken
  };
};

  const moveToken = useCallback((id: number, newX: number, newY: number) => {
    setScenario(prev => ({
      ...prev,
      tokens: prev.tokens.map(token => token.id === id ? { ...token, x: newX, y: newY } : token)
    }));
  }, []);

  const paintFogOnCell = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor(((e.clientX - rect.left) - position.current.x) / zoom.current / GRID_SIZE); // Use position.current
    const gridY = Math.floor(((e.clientY - rect.top) - position.current.y) / zoom.current / GRID_SIZE); // Use position.current
    
    const paintValue = activeTool === 'paint' ? 1 : 0;

    setScenario(prev => {
      const newGrid = prev.fogGrid.map(row => [...row]);
      if (newGrid[gridY]?.[gridX] !== undefined) {
        newGrid[gridY][gridX] = paintValue;
      }
      return { ...prev, fogGrid: newGrid };
    });
  }, [zoom, activeTool, position]); // Dependência 'position' é do state, mas aqui é para o callback.

const handleSaveAsScenario = () => {
  setScenarioNameInput(''); 
  setShowSaveModal(true); // Esta função agora abre o modal "Salvar Como"
};
const handleUpdateScenario = async () => {
  if (!currentScenarioId) {
    
    return;
  }
  
  const electron = (window as any).electron;
  if (!electron?.invoke) return;

  // Chama o novo handler do backend
  const result = await electron.invoke('update-scenario', currentScenarioId, scenario);
  
  
};
const executeSaveScenario = async () => {
  if (!scenarioNameInput) { /* ... */ return; }

  const electron = (window as any).electron;
  if (!electron?.invoke) return;

  const result = await electron.invoke('save-scenario', scenario, scenarioNameInput);
  
  if (result.success) {
    
    setCurrentScenarioId(result.newId); // <-- ATUALIZA O ID para o cenário recém-criado
  } else {
    
  }
  
  setShowSaveModal(false);
};
  // --- LÓGICA DE DESENHO E EFEITOS ---

// Cole este código no lugar da sua função drawGrid existente

const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // A função auxiliar interna não precisa de alterações
    const drawGridLines = (mapWidth: number, mapHeight: number) => {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1 / zoom.current;
      ctx.beginPath();

      for (let x = 0; x <= mapWidth; x += GRID_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
      }

      for (let y = 0; y <= mapHeight; y += GRID_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
      }

      ctx.stroke();
    };

    // --- INÍCIO DA CORREÇÃO APLICADA ---

    // 1. Salva o estado original do contexto (transformações, estilos, etc.)
   ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Aplicar transformações de zoom e pan
    ctx.translate(position.current.x, position.current.y);
       ctx.scale(zoom.current, zoom.current); // <--- MUDANÇA AQUI

    
    // 5. Todo o seu código de desenho original vem aqui, sem nenhuma alteração
    const mapImg = mapImageRef.current;
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height);
      drawGridLines(mapImg.width, mapImg.height);
    }
    
    scenario.tokens.forEach((token) => {
      const img = tokenImages.current[token.id];
      if (img && img.complete) {
        ctx.drawImage(img, token.x * GRID_SIZE, token.y * GRID_SIZE, token.width * GRID_SIZE, token.height * GRID_SIZE);
        if (selectedGridTokenIds.includes(token.id)) {
          ctx.strokeStyle = '#0dcaf0';
          ctx.lineWidth = 3 / zoom.current;
          ctx.strokeRect(token.x * GRID_SIZE, token.y * GRID_SIZE, token.width * GRID_SIZE, token.height * GRID_SIZE);
        }
      }
    });

    if (ghostToken.token && dragPositionRef.current) {
      const img = tokenImages.current[ghostToken.token.id];
      if (img && img.complete) {
        ctx.globalAlpha = ghostToken.opacity;
        ctx.drawImage(img, dragPositionRef.current.x * GRID_SIZE, dragPositionRef.current.y * GRID_SIZE, ghostToken.token.width * GRID_SIZE, ghostToken.token.height * GRID_SIZE);
        ctx.globalAlpha = 1.0;
      }
    }

    if (addingToken) {
        const img = tokenImages.current[addingToken.id];
        if (img && img.complete) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(img, addingToken.x * GRID_SIZE, addingToken.y * GRID_SIZE, addingToken.width * GRID_SIZE, addingToken.height * GRID_SIZE);
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'lightgray';
            ctx.fillRect(addingToken.x * GRID_SIZE, addingToken.y * GRID_SIZE, addingToken.width * GRID_SIZE, addingToken.height * GRID_SIZE);
            ctx.globalAlpha = 1.0;
        }
    }

    if (scenario.fogGrid.length > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      scenario.fogGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) {
             ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
          }
        });
      });
    }

    if (activeTool === 'fog-area' && fogAreaStart && fogAreaPreviewEndRef.current) {
        const startX = Math.min(fogAreaStart.x, fogAreaPreviewEndRef.current.x);
        const startY = Math.min(fogAreaStart.y, fogAreaPreviewEndRef.current.y);
        const width = Math.abs(fogAreaStart.x - fogAreaPreviewEndRef.current.x) + 1;
        const height = Math.abs(fogAreaStart.y - fogAreaPreviewEndRef.current.y) + 1;

        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = fogAreaMode === 'paint' ? '#0dcaf0' : '#f8f9fa'; // Azul para adicionar, branco para remover
        ctx.lineWidth = 4 / zoom.current;
        ctx.strokeRect(startX * GRID_SIZE, startY * GRID_SIZE, width * GRID_SIZE, height * GRID_SIZE);
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();

    // --- FIM DA CORREÇÃO APLICADA ---

}, [zoom, scenario, selectedGridTokenIds, ghostToken, addingToken, activeTool, fogAreaStart, fogAreaPreviewEndRef, fogAreaMode])

const applyFogArea = useCallback((start: Position, end: Position) => {
  const paintValue = fogAreaMode === 'paint' ? 1 : 0;
  
  const startX = Math.min(start.x, end.x);
  const startY = Math.min(start.y, end.y);
  const endX = Math.max(start.x, end.x);
  const endY = Math.max(start.y, end.y);

  setScenario(prev => {
    const newGrid = prev.fogGrid.map(row => [...row]);
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (newGrid[y]?.[x] !== undefined) {
          newGrid[y][x] = paintValue;
        }
      }
    }
    return { ...prev, fogGrid: newGrid };
  });

}, [fogAreaMode]); // Depende do modo (pintar ou apagar)
const requestDraw = useCallback(() => {
  if (animationFrameId.current) {
    cancelAnimationFrame(animationFrameId.current);
  }
  animationFrameId.current = requestAnimationFrame(() => {
    drawGrid();
    animationFrameId.current = null;
  });
}, [drawGrid]);

// UseEffect para chamar requestDraw no carregamento inicial e quando drawGrid muda
useEffect(() => {
  requestDraw();
}, [requestDraw]);

// UseEffect para carregar o mapa
useEffect(() => {
  if (!scenario.mapImageUrl) return;

  const mapImgElement = new Image();
  mapImgElement.src = scenario.mapImageUrl;

  mapImgElement.onload = () => {
    mapImageRef.current = mapImgElement;
    requestDraw(); // Chame requestDraw
  };

  mapImgElement.onerror = () => {
    console.error("Falha ao carregar a imagem do mapa:", scenario.mapImageUrl);
  }
}, [scenario.mapImageUrl, requestDraw]);

// UseEffect para carregar os tokens
useEffect(() => {
  scenario.tokens.forEach((token) => {
    if (!tokenImages.current[token.id] || tokenImages.current[token.id].src !== token.image) {
      const img = new Image();
      img.src = token.image;
      img.onload = () => { 
        tokenImages.current[token.id] = img; 
        requestDraw(); // Chame requestDraw
      };
      img.onerror = () => {
          console.error("Falha ao carregar a imagem do token:", token.image);
      };
    }
  });
  // Adicione addingToken aqui para que, se ele mudar (e não for nulo), 
  // o useEffect possa tentar pré-carregar sua imagem se ainda não estiver lá
  if (addingToken && !tokenImages.current[addingToken.id]) {
      const img = new Image();
      img.src = addingToken.image;
      img.onload = () => {
          tokenImages.current[addingToken.id] = img;
          requestDraw(); // Chame requestDraw
      };
      img.onerror = () => {
          console.error("Falha ao carregar a imagem do addingToken:", addingToken.image);
      };
  }
}, [scenario.tokens, requestDraw, addingToken]);

useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.on) return;
    const handleGridUpdate = (payload: Partial<Scenario>) => setScenario(prev => ({ ...prev, ...payload }));
    const channel = 'update-grid-state';
    electron.on(channel, handleGridUpdate);
    return () => { if (electron.removeListener) electron.removeListener(channel, handleGridUpdate); };
  }, []);

  const convertGridTokenToAppToken = useCallback((gridToken: GridToken): AppToken => ({ ...gridToken }), []);
  useEffect(() => {
    const appTokens = selectedGridTokenIds
      .map(id => scenario.tokens.find(t => t.id === id)).filter((t): t is GridToken => !!t)
      .map(convertGridTokenToAppToken);
    setSelectedTokens(appTokens);
  }, [selectedGridTokenIds, scenario.tokens, convertGridTokenToAppToken, setSelectedTokens]);

  useEffect(() => {
    const canvas = canvasRef.current;
const handleZoom = (event: WheelEvent) => {
  event.preventDefault();

  const oldZoom = zoom.current; // <--- MUDANÇA AQUI
  const delta = -event.deltaY / 500;
  // A linha abaixo usa Math.min/max, o que está correto
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + delta));

  if (newZoom === oldZoom) {
    return;
  }

  const canvasRect = canvas?.getBoundingClientRect();
  if (!canvasRect) return;

  const mouseCanvasX = event.clientX - canvasRect.left;
  const mouseCanvasY = event.clientY - canvasRect.top;

  const mouseGridX = (mouseCanvasX - position.current.x) / oldZoom;
  const mouseGridY = (mouseCanvasY - position.current.y) / oldZoom;

  const newPosX = mouseCanvasX - mouseGridX * newZoom;
  const newPosY = mouseCanvasY - mouseGridY * newZoom;

  position.current = { x: newPosX, y: newPosY };
  zoom.current = newZoom; // <--- MUDANÇA PRINCIPAL AQUI
  requestDraw();
};

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (canvas && container) {
      
        canvas.width = Math.floor(container.clientWidth);
        canvas.height = Math.floor(container.clientHeight);
        requestDraw(); // Redesenha após redimensionar para limpar e renderizar com novas dimensões
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas?.addEventListener('wheel', handleZoom, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas?.removeEventListener('wheel', handleZoom);
      if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [zoom, requestDraw]); // Adicione requestDraw

  // --- HANDLERS DE EVENTOS COMPLETOS ---
// src/components/MainGrids.tsx

const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();

  // Calcula as coordenadas do mouse no grid
  const mouseCanvasX = e.clientX - rect.left;
  const mouseCanvasY = e.clientY - rect.top;
  const mouseGridX = (mouseCanvasX - position.current.x) / zoom.current;
  const mouseGridY = (mouseCanvasY - position.current.y) / zoom.current;
  const gridX = Math.floor(mouseGridX / GRID_SIZE);
  const gridY = Math.floor(mouseGridY / GRID_SIZE);

  // NOVO: Lógica para Pan com Botão do Meio (sempre ativo)
  if (e.button === 1) { // Botão do meio (middle mouse button)
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    return; // Sai da função para não interferir com outras lógicas
  }

  // --- LÓGICA AGORA ESPECÍFICA PARA O BOTÃO ESQUERDO (e.button === 0) ---

  // 1. Lógica para a ferramenta de Área de Névoa (botão esquerdo)
  if (activeTool === 'fog-area') {
    if (!fogAreaStart) {
      // Primeiro clique: define o ponto de início
      setFogAreaStart({ x: gridX, y: gridY });
      fogAreaPreviewEndRef.current = { x: gridX, y: gridY };
    } else {
      // Segundo clique: finaliza a seleção e aplica a névoa
      applyFogArea(fogAreaStart, { x: gridX, y: gridY });

      // Reseta o estado da seleção
      setFogAreaStart(null);
      fogAreaPreviewEndRef.current = null;
      requestDraw();
    }
    return; // Sai para não executar outras lógicas para fog-area
  }
  // 2. Lógica para as ferramentas de Pincel e Borracha individuais (botão esquerdo)
  else if (activeTool === 'paint' || activeTool === 'erase') {
    setIsPainting(true);
    paintFogOnCell(e); // Sua função de pintar célula individual
    return; // Sai para não executar outras lógicas para paint/erase
  }
  // 3. Lógica para a ferramenta de Cursor (apenas com botão esquerdo)
  else if (activeTool === 'cursor') {
    if (addingToken) {
      setScenario(prev => ({
          ...prev,
          tokens: [...prev.tokens, { ...addingToken, x: gridX, y: gridY }]
      }));
      setAddingToken(null);
      requestDraw();
      return;
    }

    const clickedToken = scenario.tokens.find(t =>
        mouseGridX >= t.x * GRID_SIZE && mouseGridX < (t.x + t.width) * GRID_SIZE &&
        mouseGridY >= t.y * GRID_SIZE && mouseGridY < (t.y + t.height) * GRID_SIZE
    );

    if (e.ctrlKey && clickedToken) {
      setSelectedGridTokenIds(prev => prev.includes(clickedToken.id) ? prev.filter(id => id !== clickedToken.id) : [...prev, clickedToken.id]);
    } else if (clickedToken) {
      setDraggedToken(clickedToken);
      setDragOffset({ x: mouseGridX - clickedToken.x * GRID_SIZE, y: mouseGridY - clickedToken.y * GRID_SIZE });
      setGhostToken({ token: { ...clickedToken }, opacity: 0.5 });
      if (!selectedGridTokenIds.includes(clickedToken.id)) {
        setSelectedGridTokenIds([]);
      }
    } else { // Inicia pan SOMENTE se não houver token clicado e a ferramenta for cursor (botão esquerdo)
      setIsPanning(true); // O pan será feito com o botão esquerdo APENAS na ferramenta cursor se não clicar em token
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedGridTokenIds([]);
    }
    requestDraw();
  }

}, [
  activeTool,
  zoom,
  position,
  scenario,
  addingToken,
  draggedToken,
  selectedGridTokenIds,
  fogAreaStart,
  fogAreaMode,
  paintFogOnCell,
  applyFogArea,
  requestDraw
]);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mouseCanvasX = (e.clientX - rect.left);
  const mouseCanvasY = (e.clientY - rect.top);

  // Lógica de Pan (ativada pelo botão do meio ou pelo botão esquerdo na ferramenta cursor)
  if (isPanning && panStart) {
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;

    position.current = {
      x: position.current.x + deltaX,
      y: position.current.y + deltaY,
    };

    setPanStart({ x: e.clientX, y: e.clientY });
    requestDraw();
    return; // Importante: Sai da função se estiver fazendo pan
  }

  // Prioriza a pintura/borracha de névoa com o botão esquerdo
  if (activeTool !== 'cursor' && isPainting) {
    paintFogOnCell(e);
    return;
  }

  // Lógica da Área de Névoa (botão esquerdo)
  if (activeTool === 'fog-area' && fogAreaStart) {
    const gridX = Math.floor((mouseCanvasX - position.current.x) / zoom.current / GRID_SIZE);
    const gridY = Math.floor((mouseCanvasY - position.current.y) / zoom.current / GRID_SIZE);

    fogAreaPreviewEndRef.current = { x: gridX, y: gridY };
    requestDraw(); // Solicita um redesenho para mostrar o preview
    return; // Para a execução para não interferir com outras lógicas
  }

  // Lógica de arrasto de token (somente se a ferramenta for cursor e um token estiver sendo arrastado)
  if (activeTool === 'cursor' && draggedToken && dragOffset) {
    const newDragX = Math.round(((mouseCanvasX - position.current.x) / zoom.current - dragOffset.x) / GRID_SIZE);
    const newDragY = Math.round(((mouseCanvasY - position.current.y) / zoom.current - dragOffset.y) / GRID_SIZE);
    dragPositionRef.current = { x: newDragX, y: newDragY };
    requestDraw();
  }
  // Lógica de adição de token (somente se a ferramenta for cursor e estiver adicionando um token)
  else if (activeTool === 'cursor' && addingToken) {
      const gridX = Math.floor((mouseCanvasX - position.current.x) / zoom.current/ GRID_SIZE);
      const gridY = Math.floor((mouseCanvasY - position.current.y) / zoom.current / GRID_SIZE);
      setAddingToken(prev => prev ? ({...prev, x: gridX, y: gridY}) : null);
      requestDraw();
  }
}, [activeTool, isPainting, isPanning, panStart, draggedToken, dragOffset, zoom.current, paintFogOnCell, addingToken, requestDraw, fogAreaStart]);
 const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  setPanStart(null);
  if (activeTool !== 'cursor') {
    setIsPainting(false);
    return;
  }
  if (addingToken) {
      setAddingToken(null);
      requestDraw();
      return;
  }
  if (draggedToken && dragPositionRef.current) {
    moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);
  }
  setIsPanning(false);
  setPanStart(null); // Limpa panStart ao terminar o arrasto
  setDraggedToken(null);
  setDragOffset(null);
  setGhostToken({ token: null, opacity: 0.5 });
  requestDraw();
}, [activeTool, draggedToken, moveToken, addingToken, requestDraw]);
  
  // --- JSX ---
  return (
    <div ref={containerRef} className="overflow-hidden position-relative w-100 h-100" tabIndex={0}>
      
     {currentUserId === GM_ID && (
  <div 
    className="p-2 rounded shadow-lg d-flex align-items-center"
    style={{ 
      position: 'absolute', top: 15, left: 15, zIndex: 10, 
      backgroundColor: 'rgba(33, 37, 41, 0.8)', backdropFilter: 'blur(4px)',
      gap: '10px' // Espaçamento entre os grupos de botões
    }}
  >
    {/* Grupo 1: Ferramentas de Edição (Cursor, Pincel, Borracha) */}
    <div className="btn-group btn-group-sm" role="group" aria-label="Ferramentas de Edição">
      <button type="button" className={`btn ${activeTool === 'cursor' ? 'btn-light' : 'btn-outline-light'}`} title="Cursor" onClick={() => setActiveTool('cursor')}>
        <i className="bi bi-cursor-fill"></i>
      </button>
      <button type="button" className={`btn ${activeTool === 'paint' ? 'btn-light' : 'btn-outline-light'}`} title="Pincel de Névoa" onClick={() => setActiveTool('paint')}>
        <i className="bi bi-paint-bucket"></i>
      </button>
      
      <button type="button" className={`btn ${activeTool === 'erase' ? 'btn-light' : 'btn-outline-light'}`} title="Borracha de Névoa" onClick={() => setActiveTool('erase')}>
        <i className="bi bi-eraser-fill"></i>
        
      </button>
          <button type="button" className={`btn ${activeTool === 'fog-area' ? 'btn-light' : 'btn-outline-light'}`} title="Área de Névoa" onClick={() => setActiveTool('fog-area')}>
        <i className="bi bi-bounding-box"></i>
      </button>
    </div>
 {activeTool === 'fog-area' && (
      <div className="btn-group btn-group-sm" role="group" aria-label="Modo da Área de Névoa">
        <button type="button" className={`btn ${fogAreaMode === 'paint' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setFogAreaMode('paint')}>
          <i className="bi bi-plus-lg"></i> Adicionar
        </button>
        <button type="button" className={`btn ${fogAreaMode === 'erase' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setFogAreaMode('erase')}>
          <i className="bi bi-dash-lg"></i> Remover
        </button>
      </div>
    )}
    {/* Grupo 2: Gerenciamento de Assets (Cenário, Mapa, Token) */}
    <div className="btn-group btn-group-sm" role="group" aria-label="Gerenciamento de Cenário">
      <button className="btn btn-outline-primary" title="Selecionar Cenário" onClick={() => setShowScenarioPool(true)}>
        <i className="bi bi-folder2-open"></i>
      </button>
      <button className="btn btn-outline-success" title="Adicionar Mapa" onClick={handleAddMap}>
        <i className="bi bi-map"></i>
      </button>
      <button className="btn btn-outline-success" title="Adicionar Token" onClick={handleAddToken}>
        <i className="bi bi-plus-circle"></i>
      </button>
    </div>

    {/* Grupo 3: Ações de Salvamento (Salvar e Salvar Como...) */}
    <div className="btn-group btn-group-sm" role="group" aria-label="Gerenciamento de Salvamento">
      {/* Botão SALVAR - só fica ativo se um cenário estiver carregado */}
      <button 
        className="btn btn-outline-warning" 
        title="Salvar Alterações no Cenário Atual" 
        onClick={handleUpdateScenario}
        disabled={!currentScenarioId}
      >
        <i className="bi bi-save"></i>
      </button>
      {/* Botão SALVAR COMO... - sempre ativo */}
      <button 
        className="btn btn-outline-info" 
        title="Salvar como um Novo Cenário" 
        onClick={handleSaveAsScenario}
      >
        <i className="bi bi-save2"></i>
      </button>
    </div>

  </div>
)}
    <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPainting(false);
          setIsPanning(false);
          // Limpar estados de arrasto/adição e solicitar um redesenho final
          if(draggedToken) {
            setDraggedToken(null);
            setGhostToken({token:null, opacity: 0.5});
          }
          if(addingToken) { // NOVO: Limpa o addingToken se o mouse sair enquanto ele está ativo
            setAddingToken(null);
          }
          requestDraw(); // Garante que o canvas seja limpo do ghost/adding token
        }}
        style={{ cursor: activeTool !== 'cursor' ? 'crosshair' : 'default' }}
        className="w-100 h-100"
      />
     {/* NOVO: Modal para o Pool de Mapas */}
      <Modal show={showMapPool} onHide={() => setShowMapPool(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Biblioteca de Mapas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AssetPool assetType="map" onSelectAsset={onMapSelected} />
        </Modal.Body>
      </Modal>

      {/* NOVO: Modal para o Pool de Tokens */}
      <Modal show={showTokenPool} onHide={() => setShowTokenPool(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Biblioteca de Tokens</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AssetPool assetType="token" onSelectAsset={onTokenSelected} />
        </Modal.Body>
      </Modal>
{/* NOVO: Modal para Salvar Cenário */}
<Modal show={showSaveModal} onHide={() => setShowSaveModal(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Salvar Cenário</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group>
      <Form.Label>Nome do Cenário</Form.Label>
      <Form.Control
        type="text"
        placeholder="Ex: Templo Antigo, Nível 1"
        value={scenarioNameInput}
        onChange={(e) => setScenarioNameInput(e.target.value)}
        onKeyPress={(e) => { if (e.key === 'Enter') executeSaveScenario(); }} // Opcional: Salvar com Enter
      />
    </Form.Group>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowSaveModal(false)}>
      Cancelar
    </Button>
    <Button variant="primary" onClick={executeSaveScenario}>
      Salvar
    </Button>
  </Modal.Footer>
</Modal>
<Modal show={showScenarioPool} onHide={() => setShowScenarioPool(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Selecionar Cenário</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {/* O componente que lista os cenários é chamado aqui */}
    <ScenarioPool onSelectScenario={onScenarioSelected} />
  </Modal.Body>
</Modal>

    </div>
  );
};

export default RPGGrid;