import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

const CONFIRM_TEXT = 'remover';

interface RemoveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function RemoveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar remoção',
  message = 'Este item contém dados preenchidos. Para remover, digite "remover" no campo abaixo.',
}: RemoveConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputValue.toLowerCase().trim() === CONFIRM_TEXT) {
      onConfirm();
      onClose();
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  const canConfirm = inputValue.toLowerCase().trim() === CONFIRM_TEXT;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-slate-700">{message}</p>
        <div>
          <label htmlFor="remove-confirm-input" className="block text-sm font-medium text-slate-700 mb-1">
            Digite &quot;remover&quot; para confirmar:
          </label>
          <input
            id="remove-confirm-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canConfirm && handleConfirm()}
            placeholder="remover"
            className="w-full border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remover
          </Button>
        </div>
      </div>
    </Modal>
  );
}
