// src/pages/MyCharactersPage.tsx (ou onde você quiser que essa página esteja)
import React, { useState, useEffect, useCallback } from 'react';
import { useLayout } from '../components/Layout'; // Importa o hook useLayout
import FullCharSheet from '../components/CharacterSheet/FullCharSheet'; // Importa a ficha de personagem

// Interface para os dados básicos de cada personagem/ficha vindos do DB
interface CharacterListItem {
  id: number;
  CHARNAME: string; // Nome do personagem
  Token_image: string | null; // A imagem do token em Base64
}

const Fichas: React.FC = () => {
  const { addContentToLeft, addContentToCenter, clearContentFromRight,clearContentFromLeft,clearContentFromCenter } = useLayout();
  // Você também pode usar setSelectedTokens, etc., do useLayout se precisar

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true); // Para carregar o userId aqui
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [characterList, setCharacterList] = useState<CharacterListItem[]>([]);

  const electron = (window as any).electron;

  // Função para carregar a lista de personagens (agora nesta página)
  const loadCharactersForUser = useCallback(async (userId: number, initialLoad: boolean = false) => {
    if (electron && electron.invoke && userId !== null) {
      try {
        const response = await electron.invoke('get-characters-by-player-id', userId);
        if (response.success) {
          setCharacterList(response.data);
          if (initialLoad && response.data.length > 0 && selectedCharacterId === null) {
            setSelectedCharacterId(response.data[0].id);
          } else if (response.data.length === 0) {
            setSelectedCharacterId(null);
          }
        } else {
          console.error("Erro ao carregar lista de personagens:", response.message);
        }
      } catch (err) {
        console.error('Erro IPC ao carregar personagens:', err);
      }
    }
  }, [electron, selectedCharacterId]);

  // Callback para quando um novo personagem é criado na FullCharSheet
  const handleCharacterCreated = useCallback((newCharacterId: number) => {
    setSelectedCharacterId(newCharacterId);
    if (currentUserId !== null) {
      loadCharactersForUser(currentUserId, false); // Recarrega a lista sem ser uma "carga inicial"
    }
  }, [currentUserId, loadCharactersForUser]);

  // Efeito para carregar o userId nesta página
  useEffect(() => {
    const getUserIdPage = async () => {
      if (!electron) {
        setCurrentUserId(1); // Fallback
        setIsLoadingUser(false);
        return;
      }
      try {
        const userId = await electron.invoke('get-userid');
        setCurrentUserId(userId !== undefined && userId !== null ? userId : 1);
      } catch (error) {
        console.error('Erro ao buscar USERID na página MyCharacters:', error);
        setCurrentUserId(1); // Fallback
      } finally {
        setIsLoadingUser(false);
      }
    };
    getUserIdPage();
  }, [electron]);

  // Efeito para carregar personagens quando o userId desta página estiver pronto
  useEffect(() => {
    if (!isLoadingUser && currentUserId !== null) {
      loadCharactersForUser(currentUserId, true); // Chamar com initialLoad=true
    }
  }, [isLoadingUser, currentUserId, loadCharactersForUser]);


  // Efeito para injetar o conteúdo nas colunas do Layout
  useEffect(() => {
    if (!isLoadingUser && currentUserId !== null) {
      // Conteúdo da coluna da esquerda (Lista de Personagens)
      const characterListContent = (
          <div className="p-3 bg-dark text-white h-100 d-flex flex-column">
              <h4 className="text-highlight-warning mb-4">Meus Personagens</h4>
              
              <button
                  className="btn btn-info mb-3 w-100"
                  onClick={() => setSelectedCharacterId(null)}
              >
                  <i className="bi bi-plus-circle me-2"></i>Criar Novo Personagem
              </button>

              {characterList.length === 0 ? (
                  <p className="text-muted">Você ainda não tem personagens. Crie um!</p>
              ) : (
                  <ul className="list-group flex-grow-1 custom-scroll" style={{ overflowY: 'auto' }}>
                      {characterList.map((char) => (
                          <li
                              key={char.id}
                              className={`list-group-item bg-secondary border-secondary text-white-base d-flex align-items-center ${selectedCharacterId === char.id ? 'active fw-bold' : ''}`}
                              onClick={() => setSelectedCharacterId(char.id)}
                              style={{ cursor: 'pointer' }}
                          >
                              {char.Token_image ? (
                                  <img src={char.Token_image} alt="Token" className="rounded-circle me-2" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
                              ) : (
                                  <div className="rounded-circle me-2 bg-dark d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', border: '1px solid #6c757d' }}>
                                      <i className="bi bi-person-fill text-muted"></i>
                                  </div>
                              )}
                              {char.CHARNAME}
                          </li>
                      ))}
                  </ul>
              )}
          </div>
      );

      // Conteúdo da coluna central (Ficha do Personagem)
      const characterSheetContent = (
          <div className="flex-grow-1 h-100 p-3">
              {currentUserId !== null ? (
                  <FullCharSheet
                      characterId={selectedCharacterId} 
                      currentUserId={currentUserId}
                      onCharacterCreated={handleCharacterCreated}
                  />
              ) : (
                  <div className="p-4 text-white text-center">
                      <h3>Carregando dados do usuário...</h3>
                      <p>Se esta mensagem persistir, por favor, tente reiniciar a aplicação.</p>
                  </div>
              )}
          </div>
      );

      addContentToLeft(characterListContent);
      addContentToCenter(characterSheetContent);


    } else if (!isLoadingUser && currentUserId === null) {
      // Se não está carregando e o userId é nulo, mostra mensagem para login
      addContentToLeft(null);
      addContentToCenter(
          <div className="p-4 text-white text-center">
              <h3>Por favor, faça login para gerenciar personagens.</h3>
          </div>
      );

    }
    // Cleanup function para quando o componente for desmontado ou as dependências mudarem
    return () => {
        clearContentFromLeft();
        clearContentFromCenter();
 
    };
  }, [
      isLoadingUser, 
      currentUserId, 
      characterList, 
      selectedCharacterId, 
      addContentToLeft, 
      addContentToCenter, 
      clearContentFromRight, 
      handleCharacterCreated
  ]);


  // Não renderiza nada diretamente aqui, pois o conteúdo é injetado no Layout
  return null; 
};

export default Fichas;