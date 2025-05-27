// InventoryGrid.tsx
import React,{useEffect,useRef} from 'react';
import { useDrop } from 'react-dnd';
import { InventoryItem } from './Inventory'; // Importa a interface
import Item from './Item'; // Importa o componente Item

interface InventoryGridProps {
  cols: number;
  rows: number;
  inventoryItems: InventoryItem[];
  placeItem: (item: InventoryItem, x: number, y: number) => void;
  removeItem: (itemId: string) => void; // Para remover itens do grid
  sendChatMessage: ((message: string) => void) | null; // NEW: Pass the chat function
}

// Tipo de item arrastável
export const ItemTypes = {
  INVENTORY_ITEM: 'inventory_item',
  AVAILABLE_ITEM: 'available_item',
};

const InventoryGrid: React.FC<InventoryGridProps> = ({ cols, rows, inventoryItems, placeItem, removeItem, sendChatMessage }) => {
  const cellSize = 50; // Tamanho de cada célula em pixels

  // Helper para verificar se uma célula está ocupada por um item no inventário
  const isCellOccupied = (x: number, y: number, excludeItemId?: string): boolean => {
    return inventoryItems.some(item => {
      // Exclui o item que está sendo arrastado atualmente para não gerar colisão com ele mesmo
      if (excludeItemId && item.id === excludeItemId) return false;

      return (
        item.x !== undefined && item.y !== undefined &&
        x >= item.x && x < item.x + item.width &&
        y >= item.y && y < item.y + item.height
      );
    });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        border: '1px solid #777',
        backgroundColor: '#333',
        position: 'relative', // Importante para posicionamento absoluto dos itens
        width: cols * cellSize,
        height: rows * cellSize,
      }}
    >
      {/* Renderiza as células do grid (apenas para visualização, não são drop targets individuais) */}
      {Array.from({ length: cols * rows }).map((_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        return (
          <GridCell
            key={`${col}-${row}`}
            x={col}
            y={row}
            cellSize={cellSize}
            placeItem={placeItem}
            isOccupied={isCellOccupied}
            occupiedItems={inventoryItems} // Passa para a célula poder verificar ocupeção
          />
        );
      })}

      {/* Renderiza os itens que já estão no inventário */}
      {inventoryItems.map(item => (
        <Item
          key={item.id}
          item={item}
          type={ItemTypes.INVENTORY_ITEM} // Indica que este item já está no inventário
          cellSize={cellSize}
          onDropItem={placeItem} // Permite que o item seja arrastado dentro do grid
          onRemoveItem={removeItem} // Passa a função de remover para o item
          sendChatMessage={sendChatMessage} // NEW: Pass sendChatMessage to Item
        />
      ))}
    </div>
  );
};
interface GridCellProps {
  x: number;
  y: number;
  cellSize: number;
  placeItem: (item: InventoryItem, x: number, y: number) => void;
  isOccupied: (x: number, y: number, excludeItemId?: string) => boolean;
  occupiedItems: InventoryItem[];
}

const GridCell: React.FC<GridCellProps> = ({ x, y, cellSize, placeItem, isOccupied, occupiedItems }) => {
  const cellRef = useRef<HTMLDivElement>(null); // Crie um ref para o elemento DOM

  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: [ItemTypes.INVENTORY_ITEM, ItemTypes.AVAILABLE_ITEM],
    drop: (item: InventoryItem, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      placeItem(item, x, y);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem() as InventoryItem | null,
    }),
  }), [x, y, placeItem, isOccupied, occupiedItems]);

  // Conecte o ref do React ao ref do React DnD
  useEffect(() => {
    if (cellRef.current) {
      drop(cellRef.current);
    }
  }, [drop]); // Garanta que o efeito seja re-executado se 'drop' mudar (raro)


  const isActive = isOver && canDrop;
  let backgroundColor = '#444';

  if (isActive) {
      if (draggedItem) {
          const wouldCollide = isOccupied(x, y, draggedItem.id) ||
                              (x + draggedItem.width > 10 || y + draggedItem.height > 10);
          if (wouldCollide) {
              backgroundColor = 'rgba(255, 0, 0, 0.3)';
          } else {
              backgroundColor = 'rgba(0, 255, 0, 0.3)';
          }
      } else {
          backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Default se draggedItem ainda não estiver disponível
      }
  } else if (canDrop && draggedItem) {
      backgroundColor = 'rgba(255, 255, 0, 0.1)';
  }

  return (
    <div
      ref={cellRef} // Use seu ref aqui
      style={{
        width: cellSize,
        height: cellSize,
        border: '1px dotted #666',
        boxSizing: 'border-box',
        backgroundColor: backgroundColor,
      }}
    />
  );
};

export default InventoryGrid;