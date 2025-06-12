// src/components/AssetPool.tsx
import React, { useState, useEffect } from 'react';

// 1. Interface HÍBRIDA: Propriedades são opcionais
interface Asset {
  id: number;
  // Para Tokens (Base64)
  name?: string;
  type?: string;
  data?: string;
  // Para Mapas (Caminho de Arquivo)
  path?: string;
}

interface AssetPoolProps {
  assetType: 'token' | 'map';
  onSelectAsset: (url: string) => void;
}

export const AssetPool: React.FC<AssetPoolProps> = ({ assetType, onSelectAsset }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  // ... (o resto do seu useEffect e handleAddNew não precisa mudar)
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const electron = (window as any).electron;
    if (electron?.invoke) {
      electron.invoke('manage-assets:get-pool', assetType).then((fetchedAssets: Asset[]) => {
        setAssets(fetchedAssets);
        setIsLoading(false);
      });
    }
  }, [assetType]);
  const handleAddNew = async () => {
    const electron = (window as any).electron;
    if (electron?.invoke) {
      const updatedAssets = await electron.invoke('manage-assets:add-image', assetType);
      if (updatedAssets) {
        setAssets(updatedAssets);
      }
    }
  };
  if (isLoading) {
    return <div>Carregando...</div>;
  }
  return (
    <div className="d-flex flex-wrap gap-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
       <div 
        className="card text-center bg-dark text-white border-secondary" 
        style={{ width: '120px', height: '120px', cursor: 'pointer' }}
        onClick={handleAddNew}
      >
        <div className="card-body d-flex flex-column align-items-center justify-content-center">
          <i className="bi bi-plus-lg" style={{ fontSize: '2rem' }}></i>
          <p className="card-text small mt-2">Adicionar</p>
        </div>
      </div>
      {assets.map(asset => {
        // 2. LÓGICA CONDICIONAL: Gera a URL correta dependendo do tipo de asset
        const imageUrl = asset.data 
          ? `data:${asset.type};base64,${asset.data}` // Para Tokens
          : `asset://${asset.path}`;                  // Para Mapas

        return (
          <div 
            key={asset.id} 
            className="card bg-dark border-secondary"
            style={{ width: '120px', cursor: 'pointer' }}
            onClick={() => onSelectAsset(imageUrl)}
          >
            <img 
              src={imageUrl}
              className="card-img-top" 
              alt={asset.name || asset.path}
              style={{ height: '120px', objectFit: 'cover' }}
            />
          </div>
        );
      })}
    </div>
  );
};