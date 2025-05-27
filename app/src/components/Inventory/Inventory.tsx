// Inventory.tsx
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import InventoryGrid from './InventoryGrid';
import ItemListTable from './ItemListTable';
import ChatBox from '../ChatBox'; // Import ChatBox
import img from '../../img/29.png'
import imgSword from '../../img/29.png'; // Assuming you have image paths for viewing
import imgShield from '../../img/29.png';

// Tipagem para um item de inventário
export interface InventoryItem {
  id: string;
  name: string;
  width: number; // Largura em unidades de grid
  height: number; // Altura em unidades de grid
  image?: string; // RE-ADICIONADO: URL da imagem do item
  // Opcional: posição no grid
  x?: number;
  y?: number;
  // NEW: Função a ser executada ao usar o item (opcional)
  onUse?: () => void;
  // NEW: Tipo de ação especial (Dice ou View)
  actionType?: 'Dice' | 'View';
  // NEW: Array de URLs de imagens para ação 'View'
  viewImages?: string[];
}

// Defina o tamanho do grid da mochila
const GRID_COLS = 10; // Número de colunas no grid
const GRID_ROWS = 10; // Número de linhas no grid


export const Inventory: React.FC = () => {
  // ... (existing states and functions like usePotion, useSword, rollDice)
  // Estado para a função de enviar mensagem para o chat
  const [sendChatMessage, setSendChatMessage] = useState<((message: string) => void) | null>(null);

  // Função para usar a poção
  const usePotion = () => {
    alert('Você usou a Poção de Cura! Sua vida foi restaurada.');
    if (sendChatMessage) {
        sendChatMessage('Você usou a Poção de Cura e sentiu-se revitalizado!');
    }
  };

  // Função para usar a espada (agora lida pelo actionType 'Dice')
  const useSword = () => {
    alert('Você brandiu a Espada Longa! Prepare-se para a batalha.');
    if (sendChatMessage) {
        sendChatMessage('Você brandiu a Espada Longa, pronto para o combate!');
    }
  };

  // Função para rolar um dado (agora lida pelo actionType 'Dice')
  const rollDice = () => {
    // A lógica de rolar o dado será acionada via /roll no ChatBox
    if (sendChatMessage) {
        sendChatMessage('/roll'); // Envia o comando para o chat
    }
  };


  const initialItems: InventoryItem[] = [
    { id: 'sword', name: 'Espada Longa', width: 1, height: 2, image: img, onUse: useSword, actionType: 'Dice' },
    { id: 'shield', name: 'Escudo Redondo', width: 2, height: 2, image: img, actionType: 'View', viewImages: [imgShield, img, imgSword] }, // Exemplo de View
    { id: 'potion', name: 'Poção de Cura', width: 1, height: 1, image: img, onUse: usePotion },
    { id: 'armor', name: 'Armadura Peitoral', width: 2, height: 3, image: img },
    { id: 'gold', name: 'Saco de Ouro', width: 1, height: 1, image: img, onUse: rollDice, actionType: 'Dice' }, // Exemplo de uso para rolar dado
    { id: 'bow', name: 'Arco Curto', width: 1, height: 3, image: img },
    { id: 'quiver', name: 'Aljava de Flechas', width: 1, height: 2, image: img },
    { id: 'torch', name: 'Tocha', width: 1, height: 1, image: img },
    { id: 'rope', name: 'Corda (15m)', width: 1, height: 2, image: img },
    { id: 'rations', name: 'Rações de Viagem', width: 1, height: 1, image: img },
  ];


  // Estado dos itens que estão ATUALMENTE no inventário (na mochila)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Função para adicionar ou mover um item no grid
  const placeItem = (item: InventoryItem, x: number, y: number) => {
    // Verifica se o item já está no inventário para atualizar ou adicionar
    const existingItemIndex = inventoryItems.findIndex(i => i.id === item.id);

    // Valida se o item cabe na nova posição
    for (let row = y; row < y + item.height; row++) {
      for (let col = x; col < x + item.width; col++) {
        if (col >= GRID_COLS || row >= GRID_ROWS) {
          console.warn(`Item ${item.name} não cabe fora do grid na posição (${x}, ${y}).`);
          return; // Não permite colocar o item se ele exceder o grid
        }
        // Verifica colisão com outros itens (exceto ele mesmo se estiver movendo)
        const collidingItem = inventoryItems.find(
          (i) =>
            i.id !== item.id && // Não verifica colisão com ele mesmo ao mover
            i.x !== undefined && i.y !== undefined && // Garante que o item já tem posição
            col >= i.x && col < i.x + i.width &&
            row >= i.y && row < i.y + i.height
        );
        if (collidingItem) {
          console.warn(`Colisão detectada para ${item.name} na posição (${x}, ${y}) com ${collidingItem.name}.`);
          return; // Não permite colocar o item se houver colisão
        }
      }
    }

    if (existingItemIndex > -1) {
      // Se o item já existe, atualiza a posição
      const updatedItems = [...inventoryItems];
      updatedItems[existingItemIndex] = { ...item, x, y };
      setInventoryItems(updatedItems);
    } else {
      // Se é um novo item, adiciona ao inventário
      setInventoryItems(prevItems => [...prevItems, { ...item, x, y }]);
    }
  };

  // Função para remover um item do inventário
  const removeItem = (itemId: string) => {
    setInventoryItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };


  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', gap: '20px', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        {/* Mochila (Grid) */}
        <div style={{ border: '2px solid #333', padding: '10px', backgroundColor: '#555', borderRadius: '5px' }}>
          <h2>Mochila (Inventário)</h2>
          <InventoryGrid
            cols={GRID_COLS}
            rows={GRID_ROWS}
            inventoryItems={inventoryItems}
            placeItem={placeItem}
            removeItem={removeItem}
            sendChatMessage={sendChatMessage} // Pass sendChatMessage to InventoryGrid
          />
        </div>

        {/* Tabela de Itens Disponíveis */}
        <div style={{ flexGrow: 1 }}>
          <h2>Itens Disponíveis</h2>
          {/* NEW: Pass sendChatMessage to ItemListTable */}
          <ItemListTable allItems={initialItems} inventoryItems={inventoryItems} placeItem={placeItem} sendChatMessage={sendChatMessage} />
        </div>

        {/* Chat Box */}
        <div style={{ flexGrow: 1, maxWidth: '400px', border: '2px solid #333', borderRadius: '5px', overflow: 'hidden' }}>
          
        </div>
      </div>
    </DndProvider>
  );
};
