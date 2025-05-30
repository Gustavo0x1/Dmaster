import React, { useState } from 'react';
import FullCharSheet from './FullCharSheet'; // Importa o componente da ficha completa

// Defina uma interface para os dados básicos de cada personagem/ficha
interface CharacterData {
  id: number; // Um ID único para a ficha (ex: "ficha-guerreira", "ficha-mago")
  name: string; // Nome do personagem para o rótulo da aba
  // No futuro, aqui você adicionaria todos os dados reais que o FullCharSheet precisaria
  // Ex: attributes: BasicAttribute[]; skills: Skill[]; health: { current: number, max: number };
}

const CharacterSheetManager: React.FC = () => {
  // Dados mockados de múltiplas fichas de personagem.
  // No futuro, isso viria de um banco de dados ou de um estado global.
  const [characters, setCharacters] = useState<CharacterData[]>([
    { id: 1, name: 'Aella (Guerreira)' },
    { id: 2, name: 'Elara (Maga)' },
    { id: 3, name: 'Grom (Bárbaro)' },
    // Adicione mais personagens conforme necessário
  ]);

  // Estado para controlar qual ficha (personagem) está ativa.
  // Inicializa com o ID do primeiro personagem, se houver.
  const [activeCharacterId, setActiveCharacterId] = useState<number>(characters[0]?.id || 0);

  // Mensagem caso não haja personagens
  if (characters.length === 0) {
    return (
      <div className="p-4 text-white text-center">
        <h3>Nenhum personagem disponível.</h3>
        <p>Crie um novo personagem para começar!</p>
        <button className="btn btn-warning mt-3" onClick={() => alert('Abrir modal de criação de personagem!')}>
          Criar Novo Personagem
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100 w-100 p-3"> {/* Use h-100 para ocupar a altura total disponível */}
      <h3 className="text-warning text-center mb-3">Fichas de Personagem</h3>

      {/* Navegação por Abas (similar ao ActionManager) */}
      <ul className="nav nav-tabs nav-justified mb-3 w-100 justify-content-center" role="tablist">
        {characters.map((char) => (
          <li className="nav-item" key={char.id}>
            <button
              className={`nav-link ${activeCharacterId === char.id ? 'active' : ''} text-white`}
              onClick={() => setActiveCharacterId(char.id)}
              type="button"
              role="tab"
              aria-controls={`${char.id}-tab-pane`}
              aria-selected={activeCharacterId === char.id}
            >
              {char.name}
            </button>
          </li>
        ))}
        {/* Botão para adicionar nova ficha, similar ao "Criar Ação" */}
        <li className="nav-item">
          <button
            className="nav-link text-info" // Usando text-info para contraste
            onClick={() => alert('Funcionalidade para adicionar nova ficha!')}
            type="button"
          >
            + Nova Ficha
          </button>
        </li>
      </ul>

      {/* Conteúdo das Abas (cada aba renderiza uma FullCharSheet) */}
      <div className="tab-content flex-grow-1 h-100">
        {characters.map((char) => (
          activeCharacterId === char.id && (
            <div
              key={char.id} // Key aqui novamente é importante
              className="tab-pane fade show active h-100"
              id={`${char.id}-tab-pane`}
              role="tabpanel"
              aria-labelledby={`${char.id}-tab`}
            >
              {/*
                IMPORTANTE: Atualmente, seu FullCharSheet usa dados mockados internamente.
                Para que cada ficha seja de fato diferente, você precisaria modificar FullCharSheet
                para aceitar props (ex: characterData: CharacterData) e então passar os dados
                específicos da ficha selecionada para ele.
                Ex: <FullCharSheet characterData={char.fullData} />
              */}
              <FullCharSheet characterId={char.id} />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default CharacterSheetManager;