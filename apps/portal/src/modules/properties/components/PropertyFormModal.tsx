import { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { propertyService } from '../services/property.service';
import type { PropertyWithClient } from '../services/property.service';
import type { ClientWithCreatedAt } from '../../clients/services/client.service';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (property: PropertyWithClient) => void;
  clients: ClientWithCreatedAt[];
  defaultClientId?: string;
}

export function PropertyFormModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  defaultClientId = '',
}: PropertyFormModalProps) {
  const { error: showError } = useToast();
  const [formData, setFormData] = useState({
    client_id: defaultClientId,
    tipo_locacao: 'fixa' as 'fixa' | 'flexivel',
    identificador: '',
    modo_entrada: 'reduzido' as 'detalhado' | 'reduzido',
  });

  useEffect(() => {
    if (isOpen && defaultClientId) {
      setFormData((prev) => ({ ...prev, client_id: defaultClientId }));
    }
  }, [isOpen, defaultClientId]);

  const handleClose = () => {
    setFormData({
      client_id: defaultClientId,
      tipo_locacao: 'fixa',
      identificador: '',
      modo_entrada: 'reduzido',
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const property = await propertyService.create({
        client_id: formData.client_id,
        tipo_locacao: formData.tipo_locacao,
        identificador: formData.identificador,
        modo_entrada: formData.modo_entrada,
      });
      handleClose();
      onSuccess(property as PropertyWithClient);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar imóvel');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo imóvel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
          <select
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
            value={formData.client_id}
            onChange={(e) =>
              setFormData({ ...formData, client_id: e.target.value })
            }
            required
          >
            <option value="">Selecione...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Identificador (endereço ou nome)"
          value={formData.identificador}
          onChange={(e) =>
            setFormData({ ...formData, identificador: e.target.value })
          }
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tipo de Locação
          </label>
          <select
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
            value={formData.tipo_locacao}
            onChange={(e) =>
              setFormData({
                ...formData,
                tipo_locacao: e.target.value as 'fixa' | 'flexivel',
              })
            }
          >
            <option value="fixa">Fixa (Mensal)</option>
            <option value="flexivel">Flexível (Airbnb)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Modo de cadastro
          </label>
          <select
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2"
            value={formData.modo_entrada}
            onChange={(e) =>
              setFormData({
                ...formData,
                modo_entrada: e.target.value as 'detalhado' | 'reduzido',
              })
            }
          >
            <option value="reduzido">Reduzido (totais mensais: longa + short)</option>
            <option value="detalhado">Detalhado (lançamentos por categoria)</option>
          </select>
        </div>
        <div className="flex space-x-3 pt-4">
          <Button type="submit" variant="secondary" className="flex-1">
            Criar
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={handleClose}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
