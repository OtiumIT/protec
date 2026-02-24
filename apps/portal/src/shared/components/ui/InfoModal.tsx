import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large';
}

/**
 * Modal leve para exibir textos informativos.
 * Usa o Modal existente com botão "Fechar" no footer.
 */
export function InfoModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-4">
        <div className="text-sm text-slate-700 prose prose-slate max-w-none">{children}</div>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
