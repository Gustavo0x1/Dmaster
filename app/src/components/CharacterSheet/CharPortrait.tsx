import React, { useRef, useState, ChangeEvent, useEffect } from 'react';
import HealthController from './HealthController'; // Ajuste o caminho se necessário
import DefaultToken from '../../img/user.png' 
interface CharacterPortraitAndHealthProps {
  currentHealth?: number;
  maxHealth?: number;
  tokenImage: string | null; // NOVO: Recebe a imagem do token como Base64
  onTokenImageChange: (imageDataURL: string | null) => void; // NOVO: Callback para notificar o pai
}

const CharacterPortraitAndHealth: React.FC<CharacterPortraitAndHealthProps> = ({
  currentHealth,
  maxHealth,
  tokenImage, // Recebe a imagem do token via props
  onTokenImageChange, // Callback para enviar a imagem alterada para o pai
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Não há useEffect para carregar do localStorage aqui, pois a imagem vem via props.
  // O estado 'selectedImage' não é mais necessário aqui, usamos 'tokenImage' diretamente.

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      // Opcional: Adicione validação de tamanho/tipo de arquivo aqui se desejar
      // (embora FullCharSheet já faça uma validação de tamanho)
      if (file.size > 5 * 1024 * 1024) { // Exemplo: 5MB
        alert("A imagem é muito grande (máx: 5MB)."); // Use um modal de alerta adequado se tiver
        event.target.value = ''; // Limpa o input
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataURL = reader.result as string;
        onTokenImageChange(imageDataURL); // Notifica o componente pai sobre a mudança
        event.target.value = ''; // Limpa o input file para que o mesmo arquivo possa ser selecionado novamente
      };
      reader.readAsDataURL(file);
    } else {
      onTokenImageChange(null); // Se o arquivo for cancelado/limpo, envie null para o pai
    }
  };

  // Define um placeholder padrão se não houver imagem do token
  // Use uma imagem padrão genérica ou deixe como está, dependendo do design.
  // Você pode importar uma imagem estática para isso:
  // import defaultPlayerImage from '../../img/localplayer/PlayerImage.png'; 
  

  return (
    <div className="d-flex flex-column align-items-center mb-3">
      <div
        className="character-portrait-container mb-2"
        onClick={handleImageClick}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={tokenImage || DefaultToken} // Usa tokenImage da prop, ou placeholder
          alt="Ícone do Personagem"
          className="img-fluid rounded-circle border border-warning"
          style={{ width: '120px', height: '120px', objectFit: 'cover' }}
        />
      </div>

      <input
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif" // Aceita mais tipos de imagem
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <HealthController
        initialCurrentHealth={currentHealth}
        initialMaxHealth={maxHealth}
      />
    </div>
  );
};

export default CharacterPortraitAndHealth;