import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import initialMapImage from '../img/3.jpeg';
import token1 from '../img/0.png';
import token2 from '../img/15.png';
import { useLayout } from "./Layout";
import { Token as AppToken } from '../types';
import { Modal, Button, Form } from 'react-bootstrap';
import { AssetPool } from './AssetsPool';

import { ScenarioPool } from './ScenarioPool';
import '../css/MainGrid/MainGrid.css';

interface Position { x: number; y: number; }
interface GridToken extends AppToken { id: number; }
type ToolMode = 'cursor' | 'paint' | 'erase' | 'fog-area';

interface RPGGridProps {
  currentUserId: number | null;
}

interface Scenario {
  mapImageUrl: string;
  tokens: GridToken[];
  fogGrid: number[][];
}

const GRID_SIZE = 50;
const GM_ID = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const DRAG_THRESHOLD_PX = 5;

const RPGGrid: React.FC<RPGGridProps> = ({ currentUserId }) => {
  const [fogAreaStart, setFogAreaStart] = useState<Position | null>(null);
  const fogAreaPreviewEndRef = useRef<Position | null>(null);
  const [fogAreaMode, setFogAreaMode] = useState<'paint' | 'erase'>('paint');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // Initialize with null
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<number, HTMLImageElement>>({});
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownCoordsRef = useRef<Position | null>(null);

  const position = useRef<Position>({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

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

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; tokens: GridToken[] }>({
    visible: false,
    x: 0,
    y: 0,
    tokens: []
  });

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
      setCurrentScenarioId(scenarioId);

    } else {

      setCurrentScenarioId(null);
    }

    setShowScenarioPool(false);
  };

  const onTokenSelected = (tokenPath: string) => {
    let TokenID = Date.now()
    console.log("ADDING TOKEN ON ID: " + TokenID)

    const newToken: GridToken = {
      id: TokenID, x: 0, y: 0, image: tokenPath, portraitUrl: tokenPath,
      width: 1, height: 1, name: "Novo Token", currentHp: 10, maxHp: 10, ac: 10, damageDealt: "1d4"
    };

    const img = new Image();
    img.src = tokenPath;
    img.onload = () => {
      tokenImages.current[newToken.id] = img;
      setAddingToken(newToken);
      setShowTokenPool(false);
      setActiveTool('cursor');
    };
    img.onerror = () => {
      console.error("Falha ao carregar a imagem do token:", tokenPath);
    };
  };

  const moveToken = useCallback((id: number, newX: number, newY: number) => {
    setScenario(prev => ({
      ...prev,
      tokens: prev.tokens.map(token => token.id === id ? { ...token, x: newX, y: newY } : token)
    }));
  }, []);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron) {
      console.warn('Objeto electron não encontrado. Ignorando listeners.');
      return;
    }
    const handleSyncTokenPosition = (data: GridToken) => {
      moveToken(data.id, data.x, data.y);
    };
    electron.on("SyncTokenPosition", handleSyncTokenPosition);
    return () => {
      electron.removeListener("SyncTokenPosition", handleSyncTokenPosition);
    };
  }, [moveToken]);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron) {
      console.warn('Objeto electron não encontrado. Ignorando listeners.');
      return;
    }
    const handleExclusiveScenario = (data: Scenario) => {
      console.log("Recebido cenário exclusivo do servidor:", data);
      if (data && data.mapImageUrl) {
        console.log("Setting scenario")
        console.log(data)
        setScenario(data);
      }
    };
    electron.on("sendActiveScenarioToRequester", handleExclusiveScenario);
    console.log("Componente MainGrids montado. Solicitando cenário inicial exclusivo...");
    electron.invoke('request-initial-scenario');
    const handleSyncScenarioBroadcast = (data: Scenario) => {
      console.log("Recebido cenário ativo do servidor (broadcast):", data);
      if (data && data.mapImageUrl) {
        setScenario(data);
      }
    };
    electron.on("syncActiveScenario", handleSyncScenarioBroadcast);
    return () => {
      electron.removeListener("sendActiveScenarioToRequester", handleExclusiveScenario);
      electron.removeListener("syncActiveScenario", handleSyncScenarioBroadcast);
    };
  }, []);

  const paintFogOnCell = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const gridX = Math.floor(((e.clientX - rect.left) - position.current.x) / zoom.current / GRID_SIZE);
    const gridY = Math.floor(((e.clientY - rect.top) - position.current.y) / zoom.current / GRID_SIZE);
    const paintValue = activeTool === 'paint' ? 1 : 0;
    setScenario(prev => {
      const newGrid = prev.fogGrid.map(row => [...row]);
      if (newGrid[gridY]?.[gridX] !== undefined) {
        newGrid[gridY][gridX] = paintValue;
      }
      return { ...prev, fogGrid: newGrid };
    });
  }, [zoom, activeTool, position]);

  const handleSaveAsScenario = () => {
    setScenarioNameInput('');
    setShowSaveModal(true);
  };
  const handleUpdateScenario = async () => {
    if (!currentScenarioId) {
      return;
    }
    const electron = (window as any).electron;
    if (!electron?.invoke) return;
    const result = await electron.invoke('update-scenario', currentScenarioId, scenario);
  };

  const executeSaveScenario = async () => {
    if (!scenarioNameInput) { return; }
    const electron = (window as any).electron;
    if (!electron?.invoke) return;
    const result = await electron.invoke('save-scenario', scenario, scenarioNameInput);
    if (result.success) {
      setCurrentScenarioId(result.newId);
    } else {

    }
    setShowSaveModal(false);
  };

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
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
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(position.current.x, position.current.y);
    ctx.scale(zoom.current, zoom.current);
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
        ctx.drawImage(img, addingToken.x * GRID_SIZE, addingToken.y * GRID_SIZE, addingToken.width * GRID_SIZE, addingToken.y * GRID_SIZE); // Fixed typo here
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
      ctx.strokeStyle = fogAreaMode === 'paint' ? '#0dcaf0' : '#f8f9fa';
      ctx.lineWidth = 4 / zoom.current;
      ctx.strokeRect(startX * GRID_SIZE, startY * GRID_SIZE, width * GRID_SIZE, height * GRID_SIZE);
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
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
  }, [fogAreaMode]);
  const requestDraw = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(() => {
      drawGrid();
      animationFrameId.current = null;
    });
  }, [drawGrid]);

  useEffect(() => {
    requestDraw();
  }, [requestDraw]);

  useEffect(() => {
    if (!scenario.mapImageUrl) return;
    const mapImgElement = new Image();
    mapImgElement.src = scenario.mapImageUrl;
    mapImgElement.onload = () => {
      mapImageRef.current = mapImgElement;
      requestDraw();
    };
    mapImgElement.onerror = () => {
      console.error("Falha ao carregar a imagem do mapa:", scenario.mapImageUrl);
    };
  }, [scenario.mapImageUrl, requestDraw]);

  useEffect(() => {
    scenario.tokens.forEach((token) => {
      if (!tokenImages.current[token.id] || tokenImages.current[token.id].src !== token.image) {
        const img = new Image();
        img.src = token.image;
        img.onload = () => {
          tokenImages.current[token.id] = img;
          requestDraw();
        };
        img.onerror = () => {
          console.error("Falha ao carregar a imagem do token:", token.image);
        };
      }
    });
    if (addingToken && !tokenImages.current[addingToken.id]) {
      const img = new Image();
      img.src = addingToken.image;
      img.onload = () => {
        tokenImages.current[addingToken.id] = img;
        requestDraw();
      };
      img.onerror = () => {
        console.error("Falha ao carregar a imagem do addingToken:", addingToken.image);
      };
    }
  }, [scenario.tokens, requestDraw, addingToken]);

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
      const oldZoom = zoom.current;
      const delta = -event.deltaY / 500;
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
      zoom.current = newZoom;
      requestDraw();
    };
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = Math.floor(container.clientWidth);
        canvas.height = Math.floor(container.clientHeight);
        requestDraw();
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
  }, [zoom, requestDraw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseCanvasX = e.clientX - rect.left;
    const mouseCanvasY = e.clientY - rect.top;
    const mouseGridX = (mouseCanvasX - position.current.x) / zoom.current;
    const mouseGridY = (mouseCanvasY - position.current.y) / zoom.current;
    const gridX = Math.floor(mouseGridX / GRID_SIZE);
    const gridY = Math.floor(mouseGridY / GRID_SIZE);

    mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY };

    setContextMenu({ visible: false, x: 0, y: 0, tokens: [] });

    if (e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button === 0) { // Botão esquerdo
      if (activeTool === 'fog-area') {
        if (!fogAreaStart) {
          setFogAreaStart({ x: gridX, y: gridY });
          fogAreaPreviewEndRef.current = { x: gridX, y: gridY };
        } else {
          applyFogArea(fogAreaStart, { x: gridX, y: gridY });
          setFogAreaStart(null);
          fogAreaPreviewEndRef.current = null;
          requestDraw();
        }
        return;
      } else if (activeTool === 'paint' || activeTool === 'erase') {
        setIsPainting(true);
        paintFogOnCell(e);
        return;
      } else if (activeTool === 'cursor') {
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

        if (clickedToken) {
          if (e.ctrlKey) {
            setSelectedGridTokenIds(prev => prev.includes(clickedToken.id) ? prev.filter(id => id !== clickedToken.id) : [...prev, clickedToken.id]);
          } else {
            // AQUI É A MUDANÇA PRINCIPAL
            // Se o token clicado JÁ ESTÁ selecionado (e pode ser parte de uma seleção múltipla),
            // NÃO reseta a seleção. Apenas define o draggedToken para iniciar o arrasto.
            if (selectedGridTokenIds.includes(clickedToken.id)) {
                // A seleção já está correta, não a alteramos.
                // Apenas preparamos para arrastar o grupo ou o token individual se já selecionado.
            } else {
                // Se o token clicado NÃO está selecionado, aí sim, reseta para apenas ele.
                setSelectedGridTokenIds([clickedToken.id]);
            }
            setDraggedToken(clickedToken);
            setDragOffset({ x: mouseGridX - clickedToken.x * GRID_SIZE, y: mouseGridY - clickedToken.y * GRID_SIZE });
            setGhostToken({ token: { ...clickedToken }, opacity: 0.5 });
          }
        } else { // Clicou no vazio
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setSelectedGridTokenIds([]); // Desseleciona tudo ao clicar no vazio
        }
        requestDraw();
      }
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

    if (isPanning && panStart) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      position.current = {
        x: position.current.x + deltaX,
        y: position.current.y + deltaY,
      };
      setPanStart({ x: e.clientX, y: e.clientY });
      requestDraw();
      return;
    }

    if (activeTool !== 'cursor' && isPainting) {
      paintFogOnCell(e);
      return;
    }

    if (activeTool === 'fog-area' && fogAreaStart) {
      const gridX = Math.floor((mouseCanvasX - position.current.x) / zoom.current / GRID_SIZE);
      const gridY = Math.floor((mouseCanvasY - position.current.y) / zoom.current / GRID_SIZE);
      fogAreaPreviewEndRef.current = { x: gridX, y: gridY };
      requestDraw();
      return;
    }

    if (activeTool === 'cursor' && draggedToken && dragOffset) {
      const newDragX = Math.round(((mouseCanvasX - position.current.x) / zoom.current - dragOffset.x) / GRID_SIZE);
      const newDragY = Math.round(((mouseCanvasY - position.current.y) / zoom.current - dragOffset.y) / GRID_SIZE);
      dragPositionRef.current = { x: newDragX, y: newDragY };
      requestDraw();
    } else if (activeTool === 'cursor' && addingToken) {
      const gridX = Math.floor((mouseCanvasX - position.current.x) / zoom.current / GRID_SIZE);
      const gridY = Math.floor((mouseCanvasY - position.current.y) / zoom.current / GRID_SIZE);
      setAddingToken(prev => prev ? ({ ...prev, x: gridX, y: gridY }) : null);
      requestDraw();
    }
  }, [activeTool, isPainting, isPanning, panStart, draggedToken, dragOffset, zoom.current, paintFogOnCell, addingToken, requestDraw, fogAreaStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
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

    if (mouseDownCoordsRef.current && e.button === 0) {
      const deltaX = Math.abs(e.clientX - mouseDownCoordsRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownCoordsRef.current.y);
      if (deltaX < DRAG_THRESHOLD_PX && deltaY < DRAG_THRESHOLD_PX) {
        setDraggedToken(null);
        setDragOffset(null);
        setGhostToken({ token: null, opacity: 0.5 });
        requestDraw();
        mouseDownCoordsRef.current = null;
        return;
      }
    }

    if (draggedToken && dragPositionRef.current) {
      const electron = (window as any).electron;
      const originalDraggedToken = scenario.tokens.find(t => t.id === draggedToken.id);
      if (originalDraggedToken) {
        const deltaX = dragPositionRef.current.x - originalDraggedToken.x;
        const deltaY = dragPositionRef.current.y - originalDraggedToken.y;

        if (selectedGridTokenIds.length > 0) {
          const updatedTokens = scenario.tokens.map(token => {
            if (selectedGridTokenIds.includes(token.id)) {
              const newX = token.x + deltaX;
              const newY = token.y + deltaY;
              electron.requestTokenMove(token.id, newX, newY, 0);
              return { ...token, x: newX, y: newY };
            }
            return token;
          });
          setScenario(prev => ({ ...prev, tokens: updatedTokens }));
        } else {
          electron.requestTokenMove(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y, 0);
          moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);
        }
      }
    }
    setIsPanning(false);
    setPanStart(null);
    setDraggedToken(null);
    setDragOffset(null);
    setGhostToken({ token: null, opacity: 0.5 });
    requestDraw();
    mouseDownCoordsRef.current = null;
  }, [activeTool, draggedToken, moveToken, addingToken, requestDraw, scenario.tokens, selectedGridTokenIds]);


  // NEW: handleAddToInitiative function
  const handleAddToInitiative = useCallback(() => {
    const electron = (window as any).electron;
    if (!electron?.send) {
      console.warn('Electron IPC send not available.');
      return;
    }

    // Filter the scenario tokens to get the ones currently selected
    const tokensToAdd = scenario.tokens
      .filter(token => selectedGridTokenIds.includes(token.id))
      .map(token => ({
        id: token.id,
        name: token.name,
        portraitUrl: token.portraitUrl,
        initiative: 0,
        currentHp: token.currentHp,
        maxHp: token.maxHp,
        ac: token.ac,
        danoCausado: 0, // Default for new entry in tracker
        danoSofrido: 0, // Default for new entry in tracker
        type: 'ally' // You might want to determine this dynamically
      }));

    if (tokensToAdd.length > 0) {
      electron.send('add-tokens-to-initiative', tokensToAdd);
      setContextMenu({ visible: false, x: 0, y: 0, tokens: [] }); // Hide context menu
      setSelectedGridTokenIds([]); // Deselect tokens after adding to initiative
      requestDraw(); // Redraw to clear selection
    }
  }, [selectedGridTokenIds, scenario.tokens, requestDraw]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    if (activeTool !== 'cursor') {
      setContextMenu({ visible: false, x: 0, y: 0, tokens: [] });
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rectCanvas = canvas.getBoundingClientRect();
    const rectContainer = container.getBoundingClientRect();

    const menuX = e.clientX - rectContainer.left;
    const menuY = e.clientY - rectContainer.top;

    const mouseCanvasX = e.clientX - rectCanvas.left;
    const mouseCanvasY = e.clientY - rectCanvas.top;
    const mouseGridX = (mouseCanvasX - position.current.x) / zoom.current;
    const mouseGridY = (mouseCanvasY - position.current.y) / zoom.current;

    const clickedToken = scenario.tokens.find(t =>
      mouseGridX >= t.x * GRID_SIZE && mouseGridX < (t.x + t.width) * GRID_SIZE &&
      mouseGridY >= t.y * GRID_SIZE && mouseGridY < (t.y + t.height) * GRID_SIZE
    );

    if (clickedToken) {
      let tokensForMenu: GridToken[] = [];
      let newSelectedIds: number[] = [...selectedGridTokenIds];

      // Cenário 1: Clique direito em um token JÁ SELECIONADO e há MÚLTIPLOS selecionados (sem Ctrl)
      if (!e.ctrlKey && selectedGridTokenIds.includes(clickedToken.id) && selectedGridTokenIds.length > 1) {
          tokensForMenu = scenario.tokens.filter(t => selectedGridTokenIds.includes(t.id));
      }
      // Cenário 2: Clique direito com Ctrl OU token clicado não está na seleção múltipla
      else {
          if (e.ctrlKey) {
              if (selectedGridTokenIds.includes(clickedToken.id)) {
                  newSelectedIds = selectedGridTokenIds.filter(id => id !== clickedToken.id);
              } else {
                  newSelectedIds.push(clickedToken.id);
              }
          } else {
              newSelectedIds = [clickedToken.id];
          }
          setSelectedGridTokenIds(newSelectedIds);
          tokensForMenu = scenario.tokens.filter(t => newSelectedIds.includes(t.id));
      }

      if (newSelectedIds.length === 0) {
          setContextMenu({ visible: false, x: 0, y: 0, tokens: [] });
      } else {
          setContextMenu({
              visible: true,
              x: menuX,
              y: menuY,
              tokens: tokensForMenu
          });
      }
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, tokens: [] });
      setSelectedGridTokenIds([]);
    }
    requestDraw();
  }, [activeTool, scenario.tokens, zoom, position, selectedGridTokenIds]);

  const handleDocumentClick = useCallback((e: MouseEvent) => {
    const contextMenuElement = document.querySelector('.context-menu');
    if (contextMenu.visible && contextMenuElement && !contextMenuElement.contains(e.target as Node)) {
      setContextMenu({ visible: false, x: 0, y: 0, tokens: [] });
    }
  }, [contextMenu.visible]);

  useEffect(() => {
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [handleDocumentClick]);

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

          <div className="btn-group btn-group-sm" role="group" aria-label="Gerenciamento de Salvamento">
            <button
              className="btn btn-outline-warning"
              title="Salvar Alterações no Cenário Atual"
              onClick={handleUpdateScenario}
              disabled={!currentScenarioId}
            >
              <i className="bi bi-save"></i>
            </button>
            <button
              className="btn btn-outline-info"
              title="Salvar como um Novo Cenário"
              onClick={handleSaveAsScenario}
            >
              <i className="bi bi-save2"></i>
            </button>
            <button
              className="btn btn-outline-danger"
              title="Mover todos os jogadores para este cenário"
              onClick={async () => {
                if (!currentScenarioId) {
                  return;
                }
                const electron = (window as any).electron;
                if (electron && electron.invoke) {
                  const result = await electron.invoke('MovePlayersToScenario', currentScenarioId);
                  if (result.success) {


                  } else {
                    alert(`Erro ao mover jogadores: ${result.message}`);
                  }
                } else {
                  console.error('Electron API não disponível.');
                  alert('Funcionalidade de mover jogadores não disponível (Electron API ausente).');
                }
              }}
            >
              <i className="bi bi-people-fill"></i> Mover Jogadores
            </button>
          </div>

        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          setIsPainting(false);
          setIsPanning(false);
          if (draggedToken) {
            setDraggedToken(null);
            setGhostToken({ token: null, opacity: 0.5 });
          }
          if (addingToken) {
            setAddingToken(null);
          }
          requestDraw();
        }}
        onContextMenu={handleContextMenu}
        style={{ cursor: activeTool !== 'cursor' ? 'crosshair' : 'default' }}
        className="w-100 h-100"
      />
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
            backgroundColor: '#343a40',
            border: '1px solid #495057',
            borderRadius: '0.25rem',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.5)',
            padding: '0.5rem 0',
            color: '#f8f9fa'
          }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          {contextMenu.tokens.length === 1 ? (
            <>
              <div className="context-menu-item">
                Editar Token: {contextMenu.tokens[0].name}
              </div>
              <div className="context-menu-item">
                Remover Token: {contextMenu.tokens[0].name}
              </div>
              <hr style={{ margin: '0.5rem 0', borderColor: '#495057' }} />
              <div className="context-menu-item">
                Definir HP
              </div>
              <div className="context-menu-item">
                Mudar Posição
              </div>
              <div className="context-menu-item" onClick={handleAddToInitiative} style={{ cursor: 'pointer' }}> {/* NEW */}
                Adicionar à Iniciativa
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item">
                Mover Seleção
              </div>
              <div className="context-menu-item">
                Excluir Seleção ({contextMenu.tokens.length} tokens)
              </div>
              <hr style={{ margin: '0.5rem 0', borderColor: '#495057' }} />
              <div className="context-menu-item">
                Propriedades de Grupo
              </div>
              <div className="context-menu-item" onClick={handleAddToInitiative} style={{ cursor: 'pointer' }}> {/* NEW */}
                Adicionar Seleção à Iniciativa
              </div>
            </>
          )}
        </div>
      )}
      <Modal show={showMapPool} onHide={() => setShowMapPool(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Biblioteca de Mapas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AssetPool assetType="map" onSelectAsset={onMapSelected} />
        </Modal.Body>
      </Modal>

      <Modal show={showTokenPool} onHide={() => setShowTokenPool(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Biblioteca de Tokens</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AssetPool assetType="token" onSelectAsset={onTokenSelected} />
        </Modal.Body>
      </Modal>

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
              onKeyPress={(e) => { if (e.key === 'Enter') executeSaveScenario(); }}
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
          <ScenarioPool onSelectScenario={onScenarioSelected} />
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default RPGGrid;