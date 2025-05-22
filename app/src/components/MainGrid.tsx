import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import mapImage from '../img/3.jpeg';
import token1 from '../img/0.png';
import token2 from '../img/15.png';
import { useLayout } from "./Layout";
import TokenInfo from './TokenInfo';
import Chat from './ChatBox';


interface Position {
  x: number;
  y: number;
}

interface Token {
  id: number;
  x: number;
  y: number;
  image: string;
  width: number;
  height: number;
}

const GRID_SIZE = 50;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const RPGGrid: React.FC = () => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<number, HTMLImageElement>>({});
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);

  // State
const [ghostToken, setGhostToken] = useState<{
  token: Token | null,
  opacity: number
}>({
  token: null,
  opacity: 0.5
});
  const { addContentToLeft, addContentToRight } = useLayout();
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, x: 0, y: 0, image: token1, width: 1, height: 1 },
    { id: 2, x: 3, y: 3, image: token2, width: 1, height: 1 },
  ]);
  const [draggedToken, setDraggedToken] = useState<Token | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);

// MOVE TOKEN
  const moveToken = useCallback((id: number, newX: number, newY: number) => {
    setTokens(prevTokens =>
      prevTokens.map(token =>
        token.id === id ? { ...token, x: newX, y: newY } : token
      )
    );
  }, []);


  // ELECTRON ---------
const electron = (window as any).electron;
useEffect(() => {
  const handleSyncTokenPosition = (data: Token) => {

    moveToken(data.id, data.x, data.y); // Atualiza a posição do token diretamente
  };

  electron.on("SyncTokenPosition", handleSyncTokenPosition);

  return () => {
  electron.DoremoveListener("SyncTokenPosition", handleSyncTokenPosition);
  };
}, [moveToken]);
useEffect(() => {
  const handleSyncTokenPosition = (data: Token) => {
    // Atualiza diretamente o estado sem chamar moveToken
    setTokens(prevTokens =>
      prevTokens.map(token =>
        token.id === data.id ? { ...token, x: data.x, y: data.y } : token
      )
    );
  };

  electron.on("SyncTokenPosition", handleSyncTokenPosition);

  return () => {
    electron.DoremoveListener("SyncTokenPosition", handleSyncTokenPosition);
  };
}, []); // ← Array de dependências vazio


// ------ ELECTRON



  // Carrega a imagem do mapa
  useEffect(() => {
    addContentToRight(<Chat />);
    const img = new Image();
    img.src = mapImage;
    img.onload = () => {
      mapImageRef.current = img;
      drawGrid();
    };
    img.onerror = () => {
      console.error('Failed to load map image:', mapImage);
      mapImageRef.current = null;
      drawGrid();
    };
  }, []);

  // Carrega as imagens dos tokens
  useEffect(() => {
    tokens.forEach((token) => {
      if (!tokenImages.current[token.id]) {
        const img = new Image();
        img.src = token.image;
        img.onload = () => {
          tokenImages.current[token.id] = img;
          drawGrid();
        };
        img.onerror = () => {
          console.error(`Failed to load image for token: ${token.id}`);
        };
      }
    });
  }, [tokens]);

  // Redimensiona o canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawGrid();
    }
  }, []);

  // Desenha o grid e os tokens
const drawGrid = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.scale(zoom, zoom);

  // Desenha o mapa de fundo
  const mapImg = mapImageRef.current;
  if (mapImg) {
    ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height);
  } else {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Desenha todos os tokens normais (com opacidade total)
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

      if (selectedTokens.some(t => t.id === token.id)) {
        ctx.strokeStyle = 'blue';
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
},  [position, zoom, tokens, selectedTokens, ghostToken]);
  // Move um token para nova posição


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

  if (isSelectionMode) {
    if (clickedToken) {
      setSelectedTokens(prev => 
        prev.some(t => t.id === clickedToken.id) 
          ? prev.filter(t => t.id !== clickedToken.id)
          : [...prev, clickedToken]
      );
    }
  } else if (clickedToken) {
    const offsetX = mouseX - clickedToken.x * GRID_SIZE;
    const offsetY = mouseY - clickedToken.y * GRID_SIZE;
    setDraggedToken(clickedToken);
    setDragOffset({ x: offsetX, y: offsetY });
    
    // Cria o token fantasma
setGhostToken({
  token: {...clickedToken},
  opacity: 0.5 // Você pode ajustar esta opacidade
});
  } else {
    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }
};
useEffect(() => {
  drawGrid();
}, [position, zoom, tokens, selectedTokens]); // Inclua apenas dependências necessárias

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
      drawGrid(); // Apenas desenha se a posição mudou
    }
  }
}, [isPanning, panStart, draggedToken, dragOffset, position, zoom, drawGrid]);
const handleMouseUp = useCallback(
  (e: React.MouseEvent) => {
    if (draggedToken && dragPositionRef.current) {
      // Atualiza a posição localmente
      moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);

      // Envia os dados para o servidor
      electron.requestTokenMove(
        draggedToken.id,
        dragPositionRef.current.x,
        dragPositionRef.current.y,
        0 // Aqui, você pode ajustar conforme a necessidade (ex.: camada do token)
      );

      dragPositionRef.current = null;
    }

    setIsPanning(false);
    setDraggedToken(null);
    setDragOffset(null);
    setGhostToken({ token: null, opacity: 0.5 });
  },
  [draggedToken, moveToken]
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

  // Efeitos
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('wheel', handleZoom, { passive: false });
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('wheel', handleZoom);
    };
  }, [resizeCanvas, handleZoom]);

useEffect(() => {
  addContentToLeft(
    selectedTokens.map((token) => (
      <TokenInfo key={token.id} id={token.id} src={token.image} posx={token.x} posy={token.y} />
    ))
  );
}, [selectedTokens]);

  return (
    <div
      ref={containerRef}
      className=" overflow-hidden position-relative w-100 h-100"
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
      <div className="selected-tokens mt-2">
        <h5>Tokens Selecionados:</h5>
      </div>
    </div>
  );
};

export default RPGGrid;