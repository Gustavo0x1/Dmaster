import React from 'react';
import { InventoryItem } from './Inventory';
import Item from './Item';
import { ItemTypes } from './InventoryGrid';

interface ItemListTableProps {
  allItems: InventoryItem[]; // Todos os itens possíveis
  inventoryItems: InventoryItem[]; // Itens que já estão no inventário (para desabilitar na lista)
  placeItem: (item: InventoryItem, x: number, y: number) => void;
  sendChatMessage: ((message: string) => void) | null; // NEW: Receive sendChatMessage
}

const ItemListTable: React.FC<ItemListTableProps> = ({ allItems, inventoryItems, placeItem, sendChatMessage }) => {
  return (
    <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3>Itens Disponíveis</h3>
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>Item</th>
            <th>Tamanho</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item) => {
            const isInInventory = inventoryItems.some(invItem => invItem.id === item.id);
            return (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* RE-ADICIONADO: Renderiza a imagem do item na tabela */}
                    {item.image && <img src={item.image} alt={item.name} style={{ width: 30, height: 30, objectFit: 'contain' }} />}
                    <span>{item.name}</span> {/* Mostra o nome do item ao lado da imagem */}
                  </div>
                </td>
                <td>{item.width}x{item.height}</td>
                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                  {isInInventory ? (
                    <span className="badge bg-success">No Inventário</span>
                  ) : (
                    <Item
                      item={item}
                      type={ItemTypes.AVAILABLE_ITEM}
                      cellSize={50} // Cell size para definir o tamanho do Item na tabela
                      sendChatMessage={sendChatMessage} // NEW: Pass sendChatMessage to Item
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ItemListTable;