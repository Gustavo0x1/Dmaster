// Item.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { InventoryItem } from './Inventory';
import { ItemTypes } from './InventoryGrid';
import '../../css/Inventory/item.css'; // Import the CSS file

interface ItemProps {
  item: InventoryItem;
  type: typeof ItemTypes.INVENTORY_ITEM | typeof ItemTypes.AVAILABLE_ITEM;
  cellSize: number;
  onDropItem?: (item: InventoryItem, x: number, y: number) => void;
  onRemoveItem?: (itemId: string) => void;
  sendChatMessage: ((message: string) => void) | null; // NEW: Receive chat function
}

const Item: React.FC<ItemProps> = ({ item, type, cellSize, onDropItem, onRemoveItem, sendChatMessage }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showImageViewer, setShowImageViewer] = useState(false); // NEW: State for image viewer
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // NEW: State for current image index

  const [{ isDragging }, drag] = useDrag(() => ({
    type: type,
    item: item,
    end: (draggedItem, monitor) => {
      const dropResult = monitor.getDropResult();
      // Opcional: Se o item foi solto fora de qualquer drop target válido, remova-o do inventário
      // if (!dropResult && type === ItemTypes.INVENTORY_ITEM && onRemoveItem) {
      //   onRemoveItem(draggedItem.id);
      //   console.log(`Item ${draggedItem.name} foi removido por ter sido solto fora de um drop target válido.`);
      // }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item, type, onDropItem, onRemoveItem]);

  useEffect(() => {
    if (itemRef.current) {
      drag(itemRef.current);
    }
  }, [drag]);

  // Close context menu and image viewer if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
      // Close image viewer if click outside of it (or add a close button)
      // For simplicity, we'll just close it here. You might want a dedicated close button.
      if (showImageViewer && !(event.target as HTMLElement).closest('.image-viewer-modal')) {
        setShowImageViewer(false);
        setCurrentImageIndex(0); // Reset index when closing
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [itemRef, showImageViewer]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default right-click menu
    // Only show context menu if the item is in the inventory
    if (type === ItemTypes.INVENTORY_ITEM) {
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    }
  };

  const handleUseOption = () => {
    if (item.actionType === 'Dice') {
      if (sendChatMessage) {
        sendChatMessage('/roll'); // Envia o comando para o chat
      }
    } else if (item.actionType === 'View' && item.viewImages && item.viewImages.length > 0) {
      setShowImageViewer(true);
      setCurrentImageIndex(0); // Start with the first image
    } else if (item.onUse) { // Fallback to generic onUse if no specific actionType
      item.onUse();
    } else {
        if (sendChatMessage) {
            sendChatMessage(`O item ${item.name} não possui uma ação de 'Usar' definida.`);
        }
    }
    setShowContextMenu(false); // Close context menu after action
  };

  const handleExamineOption = () => {
    if (sendChatMessage) {
      sendChatMessage(`Você examinou o item: ${item.name}. É um(a) ${item.width}x${item.height}.`);
    }
    setShowContextMenu(false); // Close context menu after action
  };

  const isGridItem = type === ItemTypes.INVENTORY_ITEM;

  const itemStyle: React.CSSProperties = {
    width: isGridItem ? item.width * cellSize : 50, // Largura fixa para itens na tabela (ex: 50px)
    height: isGridItem ? item.height * cellSize : 50, // Altura fixa para itens na tabela (ex: 50px)
    border: '1px solid #888',
    backgroundColor: '#999',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: isGridItem ? '0.75em' : '0.6em', // Fonte menor para itens da tabela
    textAlign: 'center',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    position: isGridItem ? 'absolute' : 'relative',
    left: isGridItem && item.x !== undefined ? item.x * cellSize : 'auto',
    top: isGridItem && item.y !== undefined ? item.y * cellSize : 'auto',
    zIndex: isDragging ? 100 : 1,
    boxSizing: 'border-box',
    lineHeight: '1.2em',
    wordBreak: 'break-word',
    padding: isGridItem ? '2px' : '0px', // Menos padding para itens menores na tabela

    // RE-ADICIONADO: Estilos para imagem de fundo
    backgroundImage: item.image ? `url(${item.image})` : 'none',
    backgroundSize: 'contain', // Ajusta a imagem dentro do quadrado sem cortar
    backgroundRepeat: 'no-repeat', // Não repete a imagem
    backgroundPosition: 'center', // Centraliza a imagem
  };

  const handleNextImage = () => {
    if (item.viewImages) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % item.viewImages!.length);
    }
  };

  const handlePrevImage = () => {
    if (item.viewImages) {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex - 1 + item.viewImages!.length) % item.viewImages!.length
      );
    }
  };

  return (
    <div ref={itemRef} style={itemStyle} onContextMenu={handleContextMenu}>
      {(!item.image || isGridItem) && (
        <span style={{
          backgroundColor: item.image && isGridItem ? 'rgba(0,0,0,0.5)' : 'transparent',
          padding: '2px 4px',
          borderRadius: '3px',
          color: 'white',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          {item.name}
        </span>
      )}

      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
            zIndex: 101, // Above the item's zIndex
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {/* "Usar" option is conditional based on onUse or actionType */}
            {(item.onUse || item.actionType) && (
              <li
                className="context-menu-item"
                onClick={handleUseOption}
              >
                Usar
              </li>
            )}
            {/* "Examine" option */}
            <li
              className="context-menu-item"
              onClick={handleExamineOption}
            >
              Examinar
            </li>
            {/* Add more options here if needed, e.g., "Descartar" */}
          </ul>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && item.viewImages && item.viewImages.length > 0 && (
        <div className="image-viewer-modal" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 102,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>
          <img
            src={item.viewImages[currentImageIndex]}
            alt={`${item.name} - ${currentImageIndex + 1}`}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handlePrevImage}>&larr; Anterior</button>
            <span style={{ color: 'white', alignSelf: 'center' }}>{currentImageIndex + 1} / {item.viewImages.length}</span>
            <button className="btn btn-secondary" onClick={handleNextImage}>Próximo &rarr;</button>
          </div>
          <button className="btn btn-danger" onClick={() => setShowImageViewer(false)} style={{ marginTop: '10px' }}>Fechar</button>
        </div>
      )}
    </div>
  );
};

export default Item;