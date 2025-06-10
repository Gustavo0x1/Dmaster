import React, { useRef, useState, ChangeEvent, useEffect } from 'react';
import HealthController from './HealthController'; // Ajuste o caminho se necessário

// Definir uma chave para o localStorage
import LOCAL_STORAGE_IMAGE_KEY from '../../img/localplayer/PlayerImage.png';

interface CharacterPortraitAndHealthProps {
  currentHealth?: number;
  maxHealth?: number;
}

const CharacterPortraitAndHealth: React.FC<CharacterPortraitAndHealthProps> = ({
  currentHealth,
  maxHealth,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega a imagem do localStorage ao montar o componente
  useEffect(() => {
    const storedImage = localStorage.getItem(LOCAL_STORAGE_IMAGE_KEY);
    if (storedImage) {
      setSelectedImage(storedImage);
    }
  }, []); // O array vazio garante que isso rode apenas uma vez ao montar

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataURL = reader.result as string;
        setSelectedImage(imageDataURL);
        // Salva a imagem no localStorage
        localStorage.setItem(LOCAL_STORAGE_IMAGE_KEY, imageDataURL);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center mb-3">
      <div
        className="character-portrait-container mb-2"
        onClick={handleImageClick}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={selectedImage || LOCAL_STORAGE_IMAGE_KEY} // Placeholder se não houver imagem selecionada/armazenada
          alt="Ícone do Personagem"
          className="img-fluid rounded-circle border border-warning"
          style={{ width: '120px', height: '120px', objectFit: 'cover' }}
        />
      </div>

      <input
        type="file"
        accept="image/png, image/jpeg"
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