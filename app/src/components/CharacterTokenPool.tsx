// src/components/CharacterTokenPool.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Token as AppToken } from '../types'; // Assuming your Token type is here

interface CharacterToken extends AppToken {
  playerId?: number | null;
}

interface CharacterTokenPoolProps {
  show: boolean;
  onHide: () => void;
  onSelectCharacters: (selectedTokens: CharacterToken[]) => void;
}

const CharacterTokenPool: React.FC<CharacterTokenPoolProps> = ({ show, onHide, onSelectCharacters }) => {
  const [characters, setCharacters] = useState<CharacterToken[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([]);

  useEffect(() => {
    if (show) {
      const electron = (window as any).electron;
      if (electron?.invoke) {
        electron.invoke('get-all-characters-for-tokens').then((result: { success: boolean; data?: CharacterToken[]; message?: string }) => {
          if (result.success && result.data) {
            setCharacters(result.data);
          } else {
            console.error("Failed to load characters:", result.message);
            setCharacters([]);
          }
        }).catch((error: any) => {
          console.error("Error invoking get-all-characters-for-tokens:", error);
          setCharacters([]);
        });
      }
    }
  }, [show]);

  const handleToggleSelect = (characterId: number) => {
    setSelectedCharacterIds(prev =>
      prev.includes(characterId) ? prev.filter(id => id !== characterId) : [...prev, characterId]
    );
  };

  const handleAddSelected = () => {
    const selected = characters.filter(char => selectedCharacterIds.includes(char.id));
    onSelectCharacters(selected);
    setSelectedCharacterIds([]); // Clear selection after adding
    onHide(); // Close modal
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Adicionar Personagens como Tokens</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {characters.length === 0 ? (
          <p>Nenhum personagem disponível para adicionar como token.</p>
        ) : (
          <div className="d-flex flex-wrap gap-3">
            {characters.map(char => (
              <div
                key={char.id}
                className={`card text-center ${selectedCharacterIds.includes(char.id) ? 'border border-primary border-3' : ''}`}
                style={{ width: '150px', cursor: 'pointer' }}
                onClick={() => handleToggleSelect(char.id)}
              >
                <img
                  src={char.image || 'path/to/default/token.png'} // Provide a default image if char.image is null
                  className="card-img-top"
                  alt={char.name}
                  style={{ height: '100px', objectFit: 'cover' }}
                />
                <div className="card-body p-2">
                  <h6 className="card-title text-truncate mb-0">{char.name}</h6>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleAddSelected} disabled={selectedCharacterIds.length === 0}>
          Adicionar Selecionados ({selectedCharacterIds.length})
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CharacterTokenPool;