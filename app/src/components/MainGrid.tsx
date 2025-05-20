import React, { useState, useRef, useEffect } from 'react';
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
  id: string;
  x: number; // Posição no grid
  y: number; // Posição no grid
  image: string; // Caminho da imagem
  width: number;
  height: number;
}

const GRID_SIZE = 50;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const RPGGrid: React.FC = () => {
  const electron = (window as any).electron;
  const { addContentToLeft, addContentToCenter, addContentToRight } = useLayout();
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [tokens, setTokens] = useState<Token[]>([
    { id: '1', x: 0, y: 0, image: token1, width: 1, height: 1 },
    { id: '2', x: 3, y: 3, image: token2, width: 1, height: 1 },
  ]);
  const [draggedToken, setDraggedToken] = useState<Token | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImages = useRef<Record<string, HTMLImageElement>>({});


  const moveToken = (id: string, newX: number, newY: number) => {

    console.log(electron.requestTokenMove(parseInt(id), newX, newY,0));
    setTokens(prevTokens =>
      prevTokens.map(token =>
        token.id === id ? { ...token, x: newX, y: newY } : token
      )
    );
  };
  useEffect(() => {
 addContentToRight(<Chat/>)
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

  // Carregar as imagens dos tokens
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

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawGrid();
    }
  };

  const drawGrid = () => {
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

    // Desenho do grid omitido para brevidade...

    tokens.forEach((token) => {
      let drawX = token.x;
      let drawY = token.y;

      // Se estiver arrastando esse token, usa a posição temporária da ref
      if (draggedToken && dragPositionRef.current && token.id === draggedToken.id) {
        drawX = dragPositionRef.current.x;
        drawY = dragPositionRef.current.y;
      }

      const img = tokenImages.current[token.id];
      if (img) {
        ctx.drawImage(
          img,
          drawX * GRID_SIZE,
          drawY * GRID_SIZE,
          token.width * GRID_SIZE,
          token.height * GRID_SIZE
        );
      }

      // Contorno para tokens selecionados (se quiser)
      if (selectedTokens.some(t => t.id === token.id)) {
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 3 / zoom;
        ctx.strokeRect(
          drawX * GRID_SIZE,
          drawY * GRID_SIZE,
          token.width * GRID_SIZE,
          token.height * GRID_SIZE
        );
      }
    });

    // Desenho das linhas do grid omitido para brevidade...

    ctx.restore();
  };

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
    // No modo seleção, ao clicar no token, alterna a seleção
    if (clickedToken) {
      const alreadySelected = selectedTokens.some(t => t.id === clickedToken.id);
      if (alreadySelected) {
        setSelectedTokens(prev => prev.filter(t => t.id !== clickedToken.id));
      } else {
        setSelectedTokens(prev => [...prev, clickedToken]);
      }
    }
  } else if (clickedToken) {
    // No modo normal, apenas iniciar o drag, sem selecionar
    const offsetX = mouseX - clickedToken.x * GRID_SIZE;
    const offsetY = mouseY - clickedToken.y * GRID_SIZE;
    setDraggedToken(clickedToken);
    setDragOffset({ x: offsetX, y: offsetY });
  } else {
    setIsPanning(true);
    setPanStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }
};


  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (draggedToken && dragOffset) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - position.x) / zoom;
      const mouseY = (e.clientY - rect.top - position.y) / zoom;

      // Atualiza a posição temporária em ref, não o estado
      dragPositionRef.current = {
        x: Math.round((mouseX - dragOffset.x) / GRID_SIZE),
        y: Math.round((mouseY - dragOffset.y) / GRID_SIZE),
      };

      // Opcional: pode redesenhar o grid para refletir o token sendo arrastado
      drawGrid();
    }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggedToken && dragPositionRef.current) {
      moveToken(draggedToken.id, dragPositionRef.current.x, dragPositionRef.current.y);
      dragPositionRef.current = null;
    }

    setIsPanning(false);
    setDraggedToken(null);
    setDragOffset(null);
  };
  const handleZoom = (event: WheelEvent) => {
    event.preventDefault();
    const delta = -event.deltaY / 500;
    setZoom((prevZoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Control') {
      setIsSelectionMode(true);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Control') {
      setIsSelectionMode(false);
   
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('wheel', handleZoom, { passive: false });
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('wheel', handleZoom);
    };
  }, []);

  useEffect(() => {
    
   
      
    const dynamicContent = selectedTokens.map((token: any) => (
      <TokenInfo key={token.id} id={parseInt(token.id)} src={token.image} posx={token.x} posy={token.y} />
    ));
       addContentToLeft(dynamicContent)
    drawGrid();
  }, [position, zoom, tokens, selectedTokens]);

  return (
    <div
      ref={containerRef}
      className="border border-dark overflow-hidden position-relative w-100 h-100"
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
