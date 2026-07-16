import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
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

const emptyForm = (): CreateClientData => ({
  name: '',
  person_type: 'pj',
  cnpj: '',
  cpf: '',
  email: '',
});

export function ClientFormModal({ isOpen, onClose, onSuccess }: ClientFormModalProps) {
  const [formData, setFormData] = useState<CreateClientData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(emptyForm());
    setFormError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setFormData(emptyForm());
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const cnpjDigits = formData.cnpj ? parseDigits(formData.cnpj) : '';
    const cpfDigits = formData.cpf ? parseDigits(formData.cpf) : '';

    if (!formData.name.trim()) {
      setFormError('Informe o nome do cliente.');
      return;
    }
    if (formData.person_type === 'pj') {
      if (!cnpjDigits) {
        setFormError('Informe o CNPJ.');
        return;
      }
      if (cnpjDigits.length !== 14) {
        setFormError('CNPJ deve ter 14 dígitos.');
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        setFormError('CNPJ inválido. Verifique os dígitos.');
        return;
      }
    }
    if (formData.person_type === 'pf') {
      if (!cpfDigits) {
        setFormError('Informe o CPF.');
        return;
      }
      if (cpfDigits.length !== 11) {
        setFormError('CPF deve ter 11 dígitos.');
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        setFormError('CPF inválido. Verifique os dígitos.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        cnpj: formData.person_type === 'pj' ? cnpjDigits : undefined,
        cpf: formData.person_type === 'pf' ? cpfDigits : undefined,
        email: formData.email?.trim() || undefined,
      };
      const client = await clientService.create(payload);
      setFormData(emptyForm());
      setFormError(null);
      onClose();
      onSuccess(client);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cliente';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {formError}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de pessoa</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="personType"
                value="pj"
                checked={formData.person_type === 'pj'}
                disabled={isSubmitting}
                onChange={() => {
                  setFormError(null);
                  setFormData({ ...formData, person_type: 'pj', cpf: '' });
                }}
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
                disabled={isSubmitting}
                onChange={() => {
                  setFormError(null);
                  setFormData({ ...formData, person_type: 'pf', cnpj: '' });
                }}
                className="rounded border-slate-300"
              />
              <span>PF</span>
            </label>
          </div>
        </div>
        <Input
          label="Nome"
          value={formData.name}
          onChange={(e) => {
            setFormError(null);
            setFormData({ ...formData, name: e.target.value });
          }}
          required
          disabled={isSubmitting}
        />
        {formData.person_type === 'pj' ? (
          <Input
            label="CNPJ"
            value={formatCnpj(formData.cnpj ?? '')}
            onChange={(e) => {
              const raw = parseDigits(e.target.value);
              if (raw.length <= 14) {
                setFormError(null);
                setFormData({ ...formData, cnpj: raw });
              }
            }}
            placeholder="00.000.000/0001-00"
            required
            maxLength={18}
            disabled={isSubmitting}
          />
        ) : (
          <Input
            label="CPF"
            value={formatCpf(formData.cpf ?? '')}
            onChange={(e) => {
              const raw = parseDigits(e.target.value);
              if (raw.length <= 11) {
                setFormError(null);
                setFormData({ ...formData, cpf: raw });
              }
            }}
            placeholder="000.000.000-00"
            required
            maxLength={14}
            disabled={isSubmitting}
          />
        )}
        <Input
          label="Email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => {
            setFormError(null);
            setFormData({ ...formData, email: e.target.value });
          }}
          disabled={isSubmitting}
        />
        <div className="flex space-x-3 pt-4">
          <Button type="submit" variant="secondary" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar cliente'}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
