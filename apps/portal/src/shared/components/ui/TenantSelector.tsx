import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import apiRequest from '../../services/api';
import type { Company } from '@shared/core';

interface TenantSelectorProps {
  selectedTenantId: string | null;
  onSelect: (tenantId: string) => void;
  label?: string;
}

export function TenantSelector({ selectedTenantId, onSelect, label = 'Selecionar Tenant' }: TenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState<Company[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  useEffect(() => {
    if (isOpen) {
      loadTenants();
    }
  }, [isOpen, page]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tenants.filter(t => 
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cnpj?.includes(searchTerm)
      );
      setFilteredTenants(filtered);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    } else {
      setFilteredTenants(tenants);
      setTotalPages(Math.ceil(tenants.length / itemsPerPage));
    }
  }, [searchTerm, tenants]);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      // Super admin lista companies, não clients
      const response = await apiRequest<{ data: { companies: Company[]; total: number } }>('/api/v1/companies', {
        method: 'GET',
        token: token || undefined,
      });
      setTenants(response.data.companies || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (tenantId: string) => {
    onSelect(tenantId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const paginatedTenants = filteredTenants.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-left focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 flex items-center justify-between"
        >
          <span className={selectedTenant ? 'text-slate-900' : 'text-slate-500'}>
            {selectedTenant ? selectedTenant.name : 'Selecione um tenant...'}
          </span>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchTerm('');
          setPage(1);
        }}
        title="Selecionar Tenant"
        size="large"
      >
        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Buscar tenant por nome, email ou CNPJ..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          {/* Tenants List */}
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : paginatedTenants.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? 'Nenhum tenant encontrado' : 'Nenhum tenant cadastrado'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {paginatedTenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => handleSelect(tenant.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                      selectedTenantId === tenant.id ? 'bg-brand/10 border-l-4 border-brand' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{tenant.name}</p>
                        {tenant.email && (
                          <p className="text-sm text-slate-500">{tenant.email}</p>
                        )}
                        {tenant.cnpj && (
                          <p className="text-xs text-slate-400">CNPJ: {tenant.cnpj}</p>
                        )}
                      </div>
                      {selectedTenantId === tenant.id && (
                        <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Página {page} de {totalPages} ({filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''})
              </p>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
