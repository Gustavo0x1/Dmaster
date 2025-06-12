// Em src/components/ScenarioPool.tsx

import React, { useState, useEffect } from 'react';
import { ListGroup, Spinner, Image } from 'react-bootstrap'; // Adicione 'Image' ao import

// Interface atualizada para incluir os dados do preview do mapa
interface ScenarioInfo {
  id: number;
  name: string;
  mapPreviewData: string | null; // O base64 da imagem
  mapMimeType: string | null;    // O tipo da imagem
}

interface ScenarioPoolProps {
  onSelectScenario: (scenarioId: number) => void;
}

export const ScenarioPool: React.FC<ScenarioPoolProps> = ({ onSelectScenario }) => {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScenarios = async () => {
      setLoading(true);
      const electron = (window as any).electron;
      if (electron) {
        const result = await electron.invoke('get-scenario-list');
        if (result.success) {
          setScenarios(result.data);
        } else {
          console.error("Falha ao buscar cenários:", result.message);
        }
      }
      setLoading(false);
    };

    fetchScenarios();
  }, []);

  if (loading) {
    return <div className="text-center"><Spinner animation="border" /></div>;
  }

  if (scenarios.length === 0) {
    return <p className="text-center text-muted">Nenhum cenário salvo encontrado.</p>;
  }

  return (
    // Usamos a ListGroup do react-bootstrap para a lista
    <ListGroup>
      {scenarios.map((scenario) => (
        <ListGroup.Item 
          key={scenario.id} 
          action 
          onClick={() => onSelectScenario(scenario.id)}
          // NOVO: Usando flexbox para alinhar a imagem e o texto
          className="d-flex align-items-center"
        >
          {/* Renderiza a miniatura do mapa se os dados existirem */}
          {scenario.mapPreviewData && (
            <Image
              // Constrói a URL de dados a partir do base64
              src={`data:${scenario.mapMimeType};base64,${scenario.mapPreviewData}`}
              alt={`Preview do mapa para ${scenario.name}`}
              // Estilo para a miniatura
              style={{
                width: '120px',
                height: '80px',
                objectFit: 'cover',
                marginRight: '15px',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem'
              }}
            />
          )}
          
          {/* Nome do cenário */}
          <span className="fw-bold">{scenario.name}</span>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};