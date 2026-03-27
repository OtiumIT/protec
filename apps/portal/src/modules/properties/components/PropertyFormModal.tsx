import { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
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
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formData, setFormData] = useState({
    client_id: defaultClientId,
    tipo_locacao: 'fixa' as 'fixa' | 'flexivel',
    identificador: '',
    modo_entrada: 'reduzido' as 'detalhado' | 'reduzido',
    matricula_imovel: '',
    inscricao_iptu: '',
    cartorio_registro: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    iptu_mensal_padrao: 0,
    condominio_mensal_padrao: 0,
    seguro_mensal_padrao: 0,
    camareira_mensal_padrao: 0,
    seguranca_mensal_padrao: 0,
    material_limpeza_mensal_padrao: 0,
    lavanderia_enxoval_mensal_padrao: 0,
    checkin_checkout_mensal_padrao: 0,
    taxas_pagamento_mensal_padrao: 0,
    tarifas_bancarias_mensal_padrao: 0,
    vacancia_mensal_padrao: 0,
    inadimplencia_mensal_padrao: 0,
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
      matricula_imovel: '',
      inscricao_iptu: '',
      cartorio_registro: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      iptu_mensal_padrao: 0,
      condominio_mensal_padrao: 0,
      seguro_mensal_padrao: 0,
      camareira_mensal_padrao: 0,
      seguranca_mensal_padrao: 0,
      material_limpeza_mensal_padrao: 0,
      lavanderia_enxoval_mensal_padrao: 0,
      checkin_checkout_mensal_padrao: 0,
      taxas_pagamento_mensal_padrao: 0,
      tarifas_bancarias_mensal_padrao: 0,
      vacancia_mensal_padrao: 0,
      inadimplencia_mensal_padrao: 0,
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
        matricula_imovel: formData.matricula_imovel || undefined,
        inscricao_iptu: formData.inscricao_iptu || undefined,
        cartorio_registro: formData.cartorio_registro || undefined,
        cep: formData.cep || undefined,
        logradouro: formData.logradouro || undefined,
        numero: formData.numero || undefined,
        complemento: formData.complemento || undefined,
        bairro: formData.bairro || undefined,
        cidade: formData.cidade || undefined,
        uf: formData.uf || undefined,
        iptu_mensal_padrao: formData.iptu_mensal_padrao || undefined,
        condominio_mensal_padrao: formData.condominio_mensal_padrao || undefined,
        seguro_mensal_padrao: formData.seguro_mensal_padrao || undefined,
        camareira_mensal_padrao: formData.camareira_mensal_padrao || undefined,
        seguranca_mensal_padrao: formData.seguranca_mensal_padrao || undefined,
        material_limpeza_mensal_padrao: formData.material_limpeza_mensal_padrao || undefined,
        lavanderia_enxoval_mensal_padrao: formData.lavanderia_enxoval_mensal_padrao || undefined,
        checkin_checkout_mensal_padrao: formData.checkin_checkout_mensal_padrao || undefined,
        taxas_pagamento_mensal_padrao: formData.taxas_pagamento_mensal_padrao || undefined,
        tarifas_bancarias_mensal_padrao: formData.tarifas_bancarias_mensal_padrao || undefined,
        vacancia_mensal_padrao: formData.vacancia_mensal_padrao || undefined,
        inadimplencia_mensal_padrao: formData.inadimplencia_mensal_padrao || undefined,
      });
      handleClose();
      onSuccess(property as PropertyWithClient);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar imóvel');
    }
  };

  const handleCepChange = async (rawValue: string) => {
    const onlyDigits = rawValue.replace(/\D/g, '').slice(0, 8);
    const formatted = onlyDigits.length > 5
      ? `${onlyDigits.slice(0, 5)}-${onlyDigits.slice(5)}`
      : onlyDigits;
    setFormData((prev) => ({ ...prev, cep: formatted }));

    if (onlyDigits.length !== 8) return;
    try {
      setIsLoadingCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
      const data = await res.json() as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) return;
      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    } catch {
      // silencioso: usuário ainda pode preencher manualmente
    } finally {
      setIsLoadingCep(false);
    }
  };

  const isFixa = formData.tipo_locacao === 'fixa';
  const isFlexivel = formData.tipo_locacao === 'flexivel';
  const recomendadosFixaVazios = [
    formData.iptu_mensal_padrao,
    formData.condominio_mensal_padrao,
    formData.seguro_mensal_padrao,
  ].filter((x) => !x || x <= 0).length;
  const recomendadosFlexVazios = [
    formData.camareira_mensal_padrao,
    formData.material_limpeza_mensal_padrao,
    formData.lavanderia_enxoval_mensal_padrao,
    formData.checkin_checkout_mensal_padrao,
    formData.taxas_pagamento_mensal_padrao,
  ].filter((x) => !x || x <= 0).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo imóvel" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Informações gerais</p>
            <Input label="Descrição" value={formData.identificador} onChange={(e) => setFormData({ ...formData, identificador: e.target.value })} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de locação</label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2" value={formData.tipo_locacao} onChange={(e) => setFormData({ ...formData, tipo_locacao: e.target.value as 'fixa' | 'flexivel' })}>
                  <option value="fixa">Fixa (Mensal)</option>
                  <option value="flexivel">Flexível (Airbnb)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Modo de cadastro</label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2" value={formData.modo_entrada} onChange={(e) => setFormData({ ...formData, modo_entrada: e.target.value as 'detalhado' | 'reduzido' })}>
                  <option value="reduzido">Reduzido (totais mensais: longa + short)</option>
                  <option value="detalhado">Detalhado (lançamentos por categoria)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Dados do imóvel</p>
              {!formData.client_id && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Selecione o cliente na tela anterior para cadastrar o imóvel.
                </div>
              )}
              <Input label="Matrícula do imóvel" value={formData.matricula_imovel} onChange={(e) => setFormData({ ...formData, matricula_imovel: e.target.value })} />
              <Input label="Inscrição IPTU" value={formData.inscricao_iptu} onChange={(e) => setFormData({ ...formData, inscricao_iptu: e.target.value })} />
              <Input label="Cartório de registro" value={formData.cartorio_registro} onChange={(e) => setFormData({ ...formData, cartorio_registro: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={`CEP${isLoadingCep ? ' (carregando endereço...)' : ''}`} value={formData.cep} onChange={(e) => { void handleCepChange(e.target.value); }} />
                <Input label="UF" value={formData.uf} onChange={(e) => setFormData({ ...formData, uf: e.target.value })} />
                <Input label="Cidade" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
                <Input label="Bairro" value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
                <Input label="Logradouro" value={formData.logradouro} onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })} />
                <Input label="Número" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
              </div>
              <Input label="Complemento" value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Custos padrão mensais</p>
              {isFixa && recomendadosFixaVazios > 0 && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Recomendação para locação fixa: preencher IPTU, condomínio e seguro mensal para melhorar a simulação.</div>}
              {isFlexivel && recomendadosFlexVazios > 0 && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Recomendação para Airbnb/short stay: preencher camareira, limpeza, lavanderia, check-in/out e taxas de pagamento.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MoneyInput label="IPTU mensal" value={formData.iptu_mensal_padrao} onChange={(value) => setFormData({ ...formData, iptu_mensal_padrao: value })} />
                <MoneyInput label="Condomínio mensal" value={formData.condominio_mensal_padrao} onChange={(value) => setFormData({ ...formData, condominio_mensal_padrao: value })} />
                <MoneyInput label="Seguro mensal" value={formData.seguro_mensal_padrao} onChange={(value) => setFormData({ ...formData, seguro_mensal_padrao: value })} />
                <MoneyInput label="Camareira mensal" value={formData.camareira_mensal_padrao} onChange={(value) => setFormData({ ...formData, camareira_mensal_padrao: value })} />
                <MoneyInput label="Segurança mensal" value={formData.seguranca_mensal_padrao} onChange={(value) => setFormData({ ...formData, seguranca_mensal_padrao: value })} />
                <MoneyInput label="Material de limpeza" value={formData.material_limpeza_mensal_padrao} onChange={(value) => setFormData({ ...formData, material_limpeza_mensal_padrao: value })} />
                <MoneyInput label="Lavanderia/enxoval" value={formData.lavanderia_enxoval_mensal_padrao} onChange={(value) => setFormData({ ...formData, lavanderia_enxoval_mensal_padrao: value })} />
                <MoneyInput label="Check-in/out" value={formData.checkin_checkout_mensal_padrao} onChange={(value) => setFormData({ ...formData, checkin_checkout_mensal_padrao: value })} />
                <MoneyInput label="Taxas pagamento" value={formData.taxas_pagamento_mensal_padrao} onChange={(value) => setFormData({ ...formData, taxas_pagamento_mensal_padrao: value })} />
                <MoneyInput label="Tarifas bancárias" value={formData.tarifas_bancarias_mensal_padrao} onChange={(value) => setFormData({ ...formData, tarifas_bancarias_mensal_padrao: value })} />
                <MoneyInput label="Vacância mensal" value={formData.vacancia_mensal_padrao} onChange={(value) => setFormData({ ...formData, vacancia_mensal_padrao: value })} />
                <MoneyInput label="Inadimplência mensal" value={formData.inadimplencia_mensal_padrao} onChange={(value) => setFormData({ ...formData, inadimplencia_mensal_padrao: value })} />
              </div>
            </div>
          </div>
        </section>

        <div className="flex space-x-3 pt-2">
          <Button type="submit" variant="secondary" className="flex-1" disabled={!formData.client_id}>Criar</Button>
          <Button type="button" variant="tertiary" onClick={handleClose} className="flex-1">Cancelar</Button>
        </div>
      </form>
    </Modal>
  );
}
