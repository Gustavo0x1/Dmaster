import React, { useState } from 'react';
import '../css/MasterRequestManager/MasterRequestManager.css'; // Usaremos este arquivo CSS para ambos os componentes

// Interface para a requisição
interface PlayerRequest {
  id: string;
  playerName: string;
  actionName: string;
  damage?: string;
  targets?: string;
  status: 'pending' | 'accepted' | 'rejected';
  description?: string;
}

const MasterRequestManager: React.FC = () => {
  const [requests, setRequests] = useState<PlayerRequest[]>([
    {
      id: 'req-1',
      playerName: 'Aragorn',
      actionName: 'Ataque com Espada',
      damage: '1d8+4',
      targets: 'Orc Líder',
      status: 'pending',
      description: 'Aragorn tenta um ataque poderoso contra o Orc Líder, visando seu ponto fraco na armadura.',
    },
    {
      id: 'req-2',
      playerName: 'Legolas',
      actionName: 'Disparo Preciso',
      damage: '1d6+3',
      targets: 'Esqueleto',
      status: 'pending',
      description: 'Legolas mira no olho do Esqueleto Arqueiro com sua flecha élfica.',
    },
    {
      id: 'req-3',
      playerName: 'Gandalf',
      actionName: 'Bola de Fogo',
      damage: '8d6',
      targets: 'Goblins',
      status: 'pending',
      description: 'Gandalf invoca uma bola de fogo explosiva para incinerar o aglomerado de Goblins.',
    },
    {
      id: 'req-4',
      playerName: 'Gimli',
      actionName: 'Arremessar Machado',
      damage: '1d10+5',
      targets: 'Troll',
      status: 'pending',
      description: 'Gimli lança seu machado pesado na cabeça do Troll das Cavernas, esperando atordoá-lo.',
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PlayerRequest | null>(null);

  const handleOpenModal = (request: PlayerRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleAccept = (id: string) => {
    console.log(`Requisição ${id} Aceita!`);
    setRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === id ? { ...req, status: 'accepted' } : req
      )
    );
    if (selectedRequest && selectedRequest.id === id) {
        handleCloseModal();
    }
  };

  const handleReject = (id: string) => {
    console.log(`Requisição ${id} Recusada!`);
    setRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === id ? { ...req, status: 'rejected' } : req
      )
    );
    if (selectedRequest && selectedRequest.id === id) {
        handleCloseModal();
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');

  return (
    <div className="master-request-manager-container ultra-compact"> {/* NOVA CLASSE */}
      <h2>Reqs. Pendentes</h2> {/* Título ainda mais curto */}

      {pendingRequests.length === 0 ? (
        <p>Nenhuma pendente.</p>
      ) : (
        <table className="requests-table ultra-compact"> {/* NOVA CLASSE */}
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Ação</th>
              <th className="action-column">Ações</th> {/* Coluna de ação combinada */}
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.playerName}</td>
                <td>{request.actionName}</td>
                <td className="actions-cell compact-actions"> {/* NOVA CLASSE */}
                  <button
                    className="details-button ultra-mini-button" // NOVO ESTILO
                    onClick={() => handleOpenModal(request)}
                    title="Ver Detalhes" // Dica de ferramenta
                  >
                    ⓘ {/* Ícone de Informação */}
                  </button>
                  <button
                    className="accept-button ultra-mini-button" // NOVO ESTILO
                    onClick={(e) => { e.stopPropagation(); handleAccept(request.id); }}
                    title="Aceitar"
                  >
                    ✔
                  </button>
                  <button
                    className="reject-button ultra-mini-button" // NOVO ESTILO
                    onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                    title="Recusar"
                  >
                    ✖
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Integrado - Sem mudanças aqui, o CSS fará o trabalho de centralização */}
      {isModalOpen && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
                <h3 className="modal-title-custom">Detalhes da Requisição</h3>
                <button className="modal-close-button-custom" onClick={handleCloseModal}>✖</button>
            </div>
            <div className="modal-body-custom">
              <div className="request-details-custom">
                <p><strong>Jogador:</strong> {selectedRequest.playerName}</p>
                <p><strong>Ação:</strong> {selectedRequest.actionName}</p>
                {selectedRequest.damage && <p><strong>Dano:</strong> {selectedRequest.damage}</p>}
                {selectedRequest.targets && <p><strong>Alvo(s):</strong> {selectedRequest.targets}</p>}
                {selectedRequest.description && <p><strong>Descrição:</strong> {selectedRequest.description}</p>}
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="accept-button" onClick={() => handleAccept(selectedRequest.id)}>Aceitar</button>
              <button className="reject-button" onClick={() => handleReject(selectedRequest.id)}>Recusar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterRequestManager;