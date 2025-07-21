import React, { useState, useEffect } from 'react';
import FullCharSheet from './FullCharSheet'; // Importa o componente da ficha completa

// Defina uma interface para os dados básicos de cada personagem/ficha
// Esta interface deve corresponder ao que 'get-characters-by-player-id' retorna
interface CharacterListItem {
  id: number;
  CHARNAME: string; // Nome do personagem
}

const CharacterSheetManager: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // selectedCharacterId será null para criar um novo, ou o ID de um personagem existente para editar
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  // characterList é a lista de personagens do usuário logado, vinda do DB
  const [characterList, setCharacterList] = useState<CharacterListItem[]>([]);

  const electron = (window as any).electron;

  // Função para carregar a lista de personagens do usuário logado
  const loadCharactersForUser = async (userId: number) => {
    if (electron && electron.invoke) {
      try {
        const response = await electron.invoke('get-characters-by-player-id', userId);
        if (response.success) {
          setCharacterList(response.data);
          // Se não houver nenhum personagem selecionado e existirem personagens, selecione o primeiro
          if (response.data.length > 0 && selectedCharacterId === null) {
            setSelectedCharacterId(response.data[0].id);
          } else if (response.data.length === 0) {
            // Se não houver personagens, deselecione qualquer um e prepare para criação
            setSelectedCharacterId(null); 
          }
        } else {
          console.error("Erro ao carregar lista de personagens:", response.message);
          // Opcional: exibir um alerta para o usuário
        }
      } catch (err) {
        console.error('Erro IPC ao carregar personagens:', err);
        // Opcional: exibir um alerta para o usuário
      }
    }
  };

  useEffect(() => {
    // Obter o ID do usuário logado ao iniciar
    if (electron && electron.invoke) {
      electron.invoke('get-userid').then((id: number | null) => {
        setCurrentUserId(id);
        if (id !== null) {
          loadCharactersForUser(id); // Carrega personagens para o usuário logado
        }
      });
    }
  }, []); // Executa apenas uma vez ao montar

  // Callback para quando um novo personagem é criado na FullCharSheet
  const handleCharacterCreated = (newCharacterId: number) => {
    // Após a criação, selecione o novo personagem e recarregue a lista
    setSelectedCharacterId(newCharacterId); 
    if (currentUserId !== null) {
      loadCharactersForUser(currentUserId);
    }
  };

  // Se o usuário não estiver logado
  if (currentUserId === null) {
    return (
      <div className="p-4 text-white text-center">
        <h3>Por favor, faça login para gerenciar personagens.</h3>
        {/* Aqui você pode adicionar um botão para ir para a tela de login, se tiver uma */}
      </div>
    );
  }

  // Se o usuário está logado, mas não há personagens ou nenhum selecionado
  // Renderiza a FullCharSheet com characterId=null para criar um novo
  // OU, se tiver personagens, exibe a lista e a ficha selecionada
  return (
    <div className="d-flex h-100 w-100">
      {/* Coluna de navegação e lista de personagens */}
      <div className="p-3 bg-dark text-white border-end border-secondary" style={{ minWidth: '250px', flexShrink: 0 }}>
        <h4 className="text-highlight-warning mb-4">Meus Personagens</h4>
        
        {/* Botão para Criar Novo Personagem */}
        <button
          className="btn btn-info mb-3 w-100" // Cor de destaque para "Novo"
          onClick={() => setSelectedCharacterId(null)} // Define null para entrar no modo de criação na FullCharSheet
        >
          <i className="bi bi-plus-circle me-2"></i>Criar Novo Personagem
        </button>

        {/* Lista de personagens */}
        {characterList.length === 0 ? (
          <p className="text-muted">Você ainda não tem personagens. Crie um!</p>
        ) : (
          <ul className="list-group custom-scroll" style={{ maxHeight: 'calc(100% - 120px)', overflowY: 'auto' }}>
            {characterList.map((char) => (
              <li
                key={char.id}
                // Adiciona 'active' e 'text-white' para o item selecionado
                className={`list-group-item bg-secondary border-secondary text-white-base ${selectedCharacterId === char.id ? 'active fw-bold' : ''}`}
                onClick={() => setSelectedCharacterId(char.id)}
                style={{ cursor: 'pointer' }}
              >
                {char.CHARNAME}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Área da Ficha de Personagem (sempre uma única instância) */}
      <div className="flex-grow-1 h-100 p-3">
        {/* Renderiza FullCharSheet, passando o ID do personagem selecionado (ou null para novo) */}
        <FullCharSheet
          characterId={selectedCharacterId} 
          currentUserId={currentUserId}
          onCharacterCreated={handleCharacterCreated}
        />
      </div>
    </div>
  );
};

export default CharacterSheetManager;