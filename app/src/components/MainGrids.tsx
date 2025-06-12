import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import initialMapImage from '../img/3.jpeg';
import token1 from '../img/0.png';
import token2 from '../img/15.png';
import { useLayout } from "./Layout";
import { Token as AppToken } from '../types';
import { Modal, Button } from 'react-bootstrap';
import { AssetPool } from './AssetsPool'; // Importa o novo componente
// --- INTERFACES E TIPOS ---
interface Position { x: number; y: number; }
interface GridToken extends AppToken { id: number; }
type ToolMode = 'cursor' | 'paint' | 'erase';

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
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// --- COMPONENTE PRINCIPAL ---
const RPGGrid: React.FC<RPGGridProps> = ({ currentUserId }) => {
  // --- REFS ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<number, HTMLImageElement>>({});
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);

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
  
  const [activeTool, setActiveTool] = useState<ToolMode>('cursor');
  const [isPainting, setIsPainting] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [draggedToken, setDraggedToken] = useState<GridToken | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [selectedGridTokenIds, setSelectedGridTokenIds] = useState<number[]>([]);
  const [ghostToken, setGhostToken] = useState<{ token: GridToken | null; opacity: number; }>({ token: null, opacity: 0.5 });
  
  
  // NOVO: Estados para controlar a visibilidade dos modais
  const [showTokenPool, setShowTokenPool] = useState(false);
  const [showMapPool, setShowMapPool] = useState(false);

  // --- FUNÇÕES DA BARRA DE FERRAMENTAS ---

  // ALTERAÇÃO: A função agora abre o modal
  const handleAddMap = () => {
    setShowMapPool(true);
  };

  // ALTERAÇÃO: A função agora abre o modal
  const handleAddToken = () => {
    setShowTokenPool(true);
  };
  
  // NOVO: Funções de callback para quando um asset é selecionado no pool
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
  const onTokenSelected = (tokenPath: string) => {
    const newToken: GridToken = {
      id: Date.now(), x: 0, y: 0, image: tokenPath, portraitUrl: tokenPath,
      width: 1, height: 1, name: "Novo Token", currentHp: 10, maxHp: 10, ac: 10, damageDealt: "1d4"
    };
    setScenario(prev => ({ ...prev, tokens: [...prev.tokens, newToken] }));
    setShowTokenPool(false); // Fecha o modal
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
    const gridX = Math.floor(((e.clientX - rect.left) - position.x) / zoom / GRID_SIZE);
    const gridY = Math.floor(((e.clientY - rect.top) - position.y) / zoom / GRID_SIZE);
    
    // A CORREÇÃO ESTÁ AQUI: Invertemos os valores
    // 'paint' agora escreve 1 (esconde), e 'erase' escreve 0 (revela).
    const paintValue = activeTool === 'paint' ? 1 : 0;

    setScenario(prev => {
      const newGrid = prev.fogGrid.map(row => [...row]);
      if (newGrid[gridY]?.[gridX] !== undefined) {
        newGrid[gridY][gridX] = paintValue;
      }
      return { ...prev, fogGrid: newGrid };
    });
  }, [position, zoom, activeTool]);
  // --- FUNÇÕES DA BARRA DE FERRAMENTAS ---



  const handleSaveScenario = async () => {
    const electron = (window as any).electron;
    if (!electron?.invoke) return alert("Electron API não disponível.");
    const result = await electron.invoke('save-scenario', scenario);
    if (result.success) alert(result.message);
    else alert(`Falha ao salvar: ${result.message}`);
  };

  // --- LÓGICA DE DESENHO E EFEITOS ---
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Função auxiliar para desenhar as linhas do grid
    const drawGridLines = (mapWidth: number, mapHeight: number) => {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Cor das linhas: preto semitransparente. Funciona bem em mapas claros e escuros.
      ctx.lineWidth = 1 / zoom; // Ajusta a espessura da linha com base no zoom para que não fique grossa demais.
      ctx.beginPath();

      // Linhas verticais
      for (let x = 0; x <= mapWidth; x += GRID_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
      }

      // Linhas horizontais
      for (let y = 0; y <= mapHeight; y += GRID_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
      }

      ctx.stroke(); // Desenha todas as linhas de uma vez
    };

    // Início da renderização principal
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(zoom, zoom);

    // 1. Desenha o mapa PRIMEIRO
    const mapImg = mapImageRef.current;
    if (mapImg) {
      ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height);
      
      // 2. CHAMA A FUNÇÃO PARA DESENHAR AS LINHAS DO GRID (LOGO APÓS O MAPA)
      drawGridLines(mapImg.width, mapImg.height);
    }
    
    // 3. Desenha os tokens sobre o mapa e o grid
    scenario.tokens.forEach((token) => {
      const img = tokenImages.current[token.id];
      if (img) {
        ctx.drawImage(img, token.x * GRID_SIZE, token.y * GRID_SIZE, token.width * GRID_SIZE, token.height * GRID_SIZE);
        if (selectedGridTokenIds.includes(token.id)) {
          ctx.strokeStyle = '#0dcaf0';
          ctx.lineWidth = 3 / zoom;
          ctx.strokeRect(token.x * GRID_SIZE, token.y * GRID_SIZE, token.width * GRID_SIZE, token.height * GRID_SIZE);
        }
      }
    });

    // 4. Desenha o ghost token, se houver
    if (ghostToken.token && dragPositionRef.current) {
        const img = tokenImages.current[ghostToken.token.id];
        if (img) {
            ctx.globalAlpha = ghostToken.opacity;
            ctx.drawImage(img, dragPositionRef.current.x * GRID_SIZE, dragPositionRef.current.y * GRID_SIZE, ghostToken.token.width * GRID_SIZE, ghostToken.token.height * GRID_SIZE);
            ctx.globalAlpha = 1.0;
        }
    }

    // 5. Desenha a NÉVOA DE GUERRA por cima de tudo
    if (scenario.fogGrid.length > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'; // Cor da névoa (levemente transparente para um efeito melhor)
      scenario.fogGrid.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) { // Supondo que 1 = escondido, 0 = visível
             ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
          }
        });
      });
    }

    ctx.restore();
  }, [position, zoom, scenario, selectedGridTokenIds, ghostToken]);
// src/components/MainGrids.tsx

// ANTES
useEffect(() => {
  const mapImgElement = new Image();
  mapImgElement.src = scenario.mapImageUrl;
  mapImgElement.onload = () => {
    mapImageRef.current = mapImgElement;
    const mapWidthInGrids = Math.ceil(mapImgElement.width / GRID_SIZE);
    const mapHeightInGrids = Math.ceil(mapImgElement.height / GRID_SIZE);
    setScenario(prev => ({
      ...prev,
      fogGrid: Array.from({ length: mapHeightInGrids }, () => Array(mapWidthInGrids).fill(0))
    }));
  };
}, [scenario.mapImageUrl]);

 useEffect(() => {
    if (!scenario.mapImageUrl) return;

    const mapImgElement = new Image();
    mapImgElement.src = scenario.mapImageUrl;

    mapImgElement.onload = () => {
      // A única responsabilidade agora é atualizar a referência da imagem...
      mapImageRef.current = mapImgElement;
      // ...e comandar um redesenho do canvas.
      drawGrid();
    };

    mapImgElement.onerror = () => {
      console.error("Falha ao carregar a imagem do mapa:", scenario.mapImageUrl);
    }
  }, [scenario.mapImageUrl, drawGrid]); // Mantenha drawGrid nas dependências
useEffect(() => {
  scenario.tokens.forEach((token) => {
    if (!tokenImages.current[token.id] || tokenImages.current[token.id].src !== token.image) {
      const img = new Image();
      img.src = token.image;
      img.onload = () => { 
        tokenImages.current[token.id] = img; 
        drawGrid(); // A chamada que faz a mágica acontecer!
      };
    }
  });
}, [scenario.tokens, drawGrid]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);
  
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
      const delta = -event.deltaY / 500;
      setZoom((prevZoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta)));
    };
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas?.addEventListener('wheel', handleZoom, { passive: false });
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas?.removeEventListener('wheel', handleZoom);
    };
  }, []);

  // --- HANDLERS DE EVENTOS COMPLETOS ---

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'cursor') {
      setIsPainting(true);
      paintFogOnCell(e);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - position.x) / zoom;
    const mouseY = (e.clientY - rect.top - position.y) / zoom;
    const clickedToken = scenario.tokens.find(t => mouseX >= t.x * GRID_SIZE && mouseX < (t.x + t.width) * GRID_SIZE && mouseY >= t.y * GRID_SIZE && mouseY < (t.y + t.height) * GRID_SIZE);

    if (e.ctrlKey && clickedToken) {
      setSelectedGridTokenIds(prev => prev.includes(clickedToken.id) ? prev.filter(id => id !== clickedToken.id) : [...prev, clickedToken.id]);
    } else if (clickedToken) {
      setDraggedToken(clickedToken);
      setDragOffset({ x: mouseX - clickedToken.x * GRID_SIZE, y: mouseY - clickedToken.y * GRID_SIZE });
      setGhostToken({ token: { ...clickedToken }, opacity: 0.5 });
      if (!selectedGridTokenIds.includes(clickedToken.id)) {
        setSelectedGridTokenIds([]);
      }
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      setSelectedGridTokenIds([]);
    }
  }, [activeTool, paintFogOnCell, position, zoom, scenario.tokens, selectedGridTokenIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'cursor' && isPainting) {
      paintFogOnCell(e);
      return;
    }
    if (isPanning && panStart) {
      setPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedToken && dragOffset) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - position.x) / zoom;
      const mouseY = (e.clientY - rect.top - position.y) / zoom;
      const newDragX = Math.round((mouseX - dragOffset.x) / GRID_SIZE);
      const newDragY = Math.round((mouseY - dragOffset.y) / GRID_SIZE);
      dragPositionRef.current = { x: newDragX, y: newDragY };
      setGhostToken(prev => ({ ...prev, token: prev.token ? { ...prev.token, x: newDragX, y: newDragY } : null }));
    }
  }, [activeTool, isPainting, isPanning, panStart, draggedToken, dragOffset, position, zoom, paintFogOnCell]);

  const handleMouseUp = useCallback(() => {
    if (activeTool !== 'cursor') {
      setIsPainting(false);
      return;
    }
    if (draggedToken && dragPositionRef.current) {
      moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);
    }
    setIsPanning(false);
    setDraggedToken(null);
    setDragOffset(null);
    setGhostToken({ token: null, opacity: 0.5 });
  }, [activeTool, draggedToken, moveToken]);
  
  // --- JSX ---
  return (
    <div ref={containerRef} className="overflow-hidden position-relative w-100 h-100" tabIndex={0}>
      
      {currentUserId === GM_ID && (
        <div 
          className="p-2 rounded shadow-lg d-flex align-items-center"
          style={{ 
            position: 'absolute', top: 15, left: 15, zIndex: 10, 
            backgroundColor: 'rgba(33, 37, 41, 0.8)', backdropFilter: 'blur(4px)',
            gap: '10px'
          }}
        >
          <div className="btn-group btn-group-sm" role="group" aria-label="Ferramentas de Edição">
            <button type="button" className={`btn ${activeTool === 'cursor' ? 'btn-light' : 'btn-outline-light'}`} title="Cursor" onClick={() => setActiveTool('cursor')}><i className="bi bi-cursor-fill"></i></button>
            <button type="button" className={`btn ${activeTool === 'paint' ? 'btn-light' : 'btn-outline-light'}`} title="Pincel de Névoa" onClick={() => setActiveTool('paint')}><i className="bi bi-paint-bucket"></i></button>
            <button type="button" className={`btn ${activeTool === 'erase' ? 'btn-light' : 'btn-outline-light'}`} title="Borracha de Névoa" onClick={() => setActiveTool('erase')}><i className="bi bi-eraser-fill"></i></button>
          </div>
          <div className="btn-group btn-group-sm" role="group" aria-label="Gerenciamento de Cenário">
            <button className="btn btn-outline-success" title="Adicionar Mapa" onClick={handleAddMap}><i className="bi bi-map"></i></button>
            <button className="btn btn-outline-success" title="Adicionar Token" onClick={handleAddToken}><i className="bi bi-plus-circle"></i></button>
          </div>
          <div className="btn-group btn-group-sm" role="group">
             <button className="btn btn-outline-warning" title="Salvar Cenário" onClick={handleSaveScenario}><i className="bi bi-save"></i></button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {setIsPainting(false); setIsPanning(false);}} // Garante que pare as ações se o mouse sair
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
    </div>
  );
};

export default RPGGrid;