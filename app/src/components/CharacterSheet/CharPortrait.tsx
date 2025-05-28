// src/components/CharPortrait/CharPortrait.tsx
import React, { useCallback } from 'react'; // Importe useCallback aqui
import { CharacterSheet, CharacterHealth } from '../../types';
import HealthController from './HealthController';
interface CharacterPortraitAndHealthProps {
  imageUrl: string;
  characterName: string;
  initialCurrentHealth: number;
  initialMaxHealth: number;
  updateCharacterSheet: (healthData: CharacterHealth) => void;
}

const CharacterPortraitAndHealth: React.FC<CharacterPortraitAndHealthProps> = ({
  imageUrl,
  characterName,
  initialCurrentHealth,
  initialMaxHealth,
  updateCharacterSheet
}) => {
  // Memoize handleHealthControllerChange using useCallback
  // A função só será recriada se 'updateCharacterSheet' mudar.
  // Como 'updateCharacterSheet' vem do CharacterSheetManager e usa setCharacters,
  // ela é estável.
  const handleHealthControllerChange = useCallback((healthData: CharacterHealth) => {
    updateCharacterSheet(healthData);
  }, [updateCharacterSheet]); // Dependência: updateCharacterSheet

  return (
    <div  className="d-flex flex-column align-items-center mb-3"> {/* Centraliza a imagem e a vida verticalmente */}
      {/* Imagem do Personagem */}
      <div className="character-portrait-container mb-2"> {/* mb-2 para espaçamento entre imagem e vida */}
        <img
          src={imageUrl}
          alt="Ícone do Personagem"
          className="img-fluid rounded-circle border border-warning" // Classes Bootstrap para responsividade, circular e borda
          style={{ width: '120px', height: '120px', objectFit: 'cover' }} // Tamanho fixo para o avatar
        />
      </div>
      <h4 className="text-warning mt-3">{characterName}</h4>

      <HealthController
        initialCurrentHealth={initialCurrentHealth}
        initialMaxHealth={initialMaxHealth}
        onHealthChange={handleHealthControllerChange} // Passe a função memoizada
      />
    </div>
  );
};

export default CharacterPortraitAndHealth;