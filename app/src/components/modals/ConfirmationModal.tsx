// src/components/Common/ConfirmationModal.tsx
import React from 'react';
import ReactDOM from 'react-dom'; // Importe ReactDOM

interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm?: () => void; // Optional for simple alerts
  onCancel?: () => void;  // Optional, if only a "Confirm" button is needed
  onClose: () => void;    // For closing the modal (e.g., via X button or backdrop click)
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  showCancelButton = true, // Default to showing cancel button
}) => {
  if (!show) {
    return null;
  }

  const handleConfirmClick = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancelClick = () => {
    onCancel?.();
    onClose();
  };

  // Renderiza o modal usando createPortal
  // Ele será montado no elemento com id="modal-root" no seu index.html
  return ReactDOM.createPortal(
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content custom-card-base">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-highlight-warning">{title}</h5>
            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-light-base">
            {message}
          </div>
          <div className="modal-footer border-secondary">
            {showCancelButton && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelClick}>
                {cancelButtonText}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleConfirmClick}>
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement // Onde o modal será montado no DOM
  );
};

export default ConfirmationModal;