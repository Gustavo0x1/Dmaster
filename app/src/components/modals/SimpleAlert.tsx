// src/components/Common/SimpleAlertModal.tsx
import React from 'react';

interface SimpleAlertModalProps {
  show: boolean;
  title: string;
  message: string | React.ReactNode;
  onClose: () => void;
}

const SimpleAlertModal: React.FC<SimpleAlertModalProps> = ({ show, title, message, onClose }) => {
  if (!show) {
    return null;
  }

  return (
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
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAlertModal;