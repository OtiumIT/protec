import { useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  clientService,
  type ClientWithCreatedAt,
  type CreateClientData,
} from '../services/client.service';
import { formatCnpj, formatCpf, parseDigits, isValidCpf, isValidCnpj } from '../../../shared/utils/masks';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: ClientWithCreatedAt) => void;
}

export function ClientFormModal({ isOpen, onClose, onSuccess }: ClientFormModalProps) {
  const { error: showError } = useToast();
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    person_type: 'pj',
    cnpj: '',
    cpf: '',
    email: '',
  });

  const handleClose = () => {
    setFormData({ name: '', person_type: 'pj', cnpj: '', cpf: '', email: '' });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjDigits = formData.cnpj ? parseDigits(formData.cnpj) : '';
    const cpfDigits = formData.cpf ? parseDigits(formData.cpf) : '';
    if (formData.person_type === 'pj' && cnpjDigits) {
      if (cnpjDigits.length !== 14) {
        showError('CNPJ deve ter 14 dígitos.');
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        showError('CNPJ inválido. Verifique os dígitos.');
        return;
      }
    }
    if (formData.person_type === 'pf' && cpfDigits) {
      if (cpfDigits.length !== 11) {
        showError('CPF deve ter 11 dígitos.');
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        showError('CPF inválido. Verifique os dígitos.');
        return;
      }
    }
    try {
      const payload = {
        ...formData,
        cnpj: formData.cnpj ? parseDigits(formData.cnpj) : undefined,
        cpf: formData.cpf ? parseDigits(formData.cpf) : undefined,
      };
      const client = await clientService.create(payload);
      handleClose();
      onSuccess(client);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar cliente');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de pessoa</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="personType"
                value="pj"
                checked={formData.person_type === 'pj'}
                onChange={() => setFormData({ ...formData, person_type: 'pj', cpf: '' })}
                className="rounded border-slate-300"
              />
              <span>PJ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="personType"
                value="pf"
                checked={formData.person_type === 'pf'}
                onChange={() => setFormData({ ...formData, person_type: 'pf', cnpj: '' })}
                className="rounded border-slate-300"
              />
              <span>PF</span>
            </label>
          </div>
        </div>
        <Input
          label="Nome"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        {formData.person_type === 'pj' ? (
          <Input
            label="CNPJ"
            value={formatCnpj(formData.cnpj ?? '')}
            onChange={(e) => {
              const raw = parseDigits(e.target.value);
              if (raw.length <= 14) setFormData({ ...formData, cnpj: raw });
            }}
            placeholder="00.000.000/0001-00"
            required
            maxLength={18}
          />
        ) : (
          <Input
            label="CPF"
            value={formatCpf(formData.cpf ?? '')}
            onChange={(e) => {
              const raw = parseDigits(e.target.value);
              if (raw.length <= 11) setFormData({ ...formData, cpf: raw });
            }}
            placeholder="000.000.000-00"
            required
            maxLength={14}
          />
        )}
        <Input
          label="Email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <div className="flex space-x-3 pt-4">
          <Button type="submit" variant="secondary" className="flex-1">
            Criar cliente
          </Button>
          <Button type="button" variant="tertiary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
