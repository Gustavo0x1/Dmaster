// RollNotification.tsx
import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

interface RollNotificationProps {
  message: string;
  type: 'success' | 'danger' | 'info' | 'warning';
  onDismiss: () => void;
  duration?: number; // Duração em milissegundos
}

const RollNotification: React.FC<RollNotificationProps> = ({
  message,
  type,
  onDismiss,
  duration = 5000, // Padrão 5 segundos, como definido no Dice.tsx
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) return; // Não inicia o timer se já estiver invisível

    const timer = setTimeout(() => {
      setIsVisible(false); // Inicia o fade-out (se houver transição CSS)
      // Chama onDismiss APÓS a duração, ou um pouco depois para o fade-out
      const cleanupTimer = setTimeout(() => {
        onDismiss();
      }, 500); // Ex: 500ms para a transição CSS de opacidade
      return () => clearTimeout(cleanupTimer);
    }, duration);

    return () => clearTimeout(timer); // Limpa o timer na desmontagem ou re-renderização
  }, [duration, onDismiss, isVisible]); // Adicione isVisible como dependência para reiniciar o timer se a visibilidade mudar externamente

  if (!isVisible) {
    return null; // Não renderiza nada se não estiver visível
  }

  return (
    <div
      className={`alert alert-${type} fade ${isVisible ? 'show' : ''}`} // Adiciona 'show' para Bootstrap fade-in
      role="alert"
      style={{
        position: 'fixed', // ESSENCIAL para flutuar sobre todo o conteúdo
        top: '20px',
        right: '20px',
        zIndex: 1050, // ESSENCIAL para estar acima da maioria dos outros elementos
        padding: '10px 20px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        borderRadius: '0.25rem',
        minWidth: '200px',
        textAlign: 'center',
        opacity: isVisible ? 1 : 0, // Controla a opacidade para a transição
        transition: 'opacity 0.5s ease-in-out', // Transição suave para o fade-out
      }}
    >
      {message}
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={() => {
          setIsVisible(false); // Esconde imediatamente
          onDismiss(); // Dispara o dismiss no pai
        }}
        style={{ marginLeft: '10px' }}
      ></button>
    </div>
  );
};

export default RollNotification;