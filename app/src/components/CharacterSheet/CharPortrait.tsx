import React from 'react';
import HealthController from './HealthController'; // Ajuste o caminho se necessário

interface CharacterPortraitAndHealthProps {
  imageUrl: string; // URL da imagem do personagem
  currentHealth?: number;
  maxHealth?: number;
}

const CharacterPortraitAndHealth: React.FC<CharacterPortraitAndHealthProps> = ({
  imageUrl,
  currentHealth,
  maxHealth,
}) => {
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

      {/* Controlador de Pontos de Vida (HealthController) */}
      {/* O HealthController já é autocontido, apenas repassamos as props iniciais se existirem */}
      <HealthController
        initialCurrentHealth={currentHealth}
        initialMaxHealth={maxHealth}
      />
    </div>
  );
};

export default CharacterPortraitAndHealth;