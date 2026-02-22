import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import {
  propertyService,
  type PropertyWithClient,
} from '../services/property.service';

export function PropertyDashboard() {
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await propertyService.list({ limit: 50 });
      setProperties(data.properties);
    } catch {
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Dashboard Imobiliário
        </h1>
        <p className="text-slate-600 mb-6">
          Acesse cada imóvel para lançar receitas e despesas, e simular a carga
          tributária (PF vs PJ vs Reforma 2027).
        </p>

        <Card>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Imóveis cadastrados
          </h2>
          {isLoading ? (
            <p className="text-slate-500 py-4">Carregando...</p>
          ) : properties.length === 0 ? (
            <p className="text-slate-500 py-4">
              Nenhum imóvel cadastrado.{' '}
              <Link to="/properties" className="text-brand hover:underline">
                Cadastrar imóvel
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {properties.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/properties/${p.id}`}
                    className="flex justify-between items-center py-2 px-3 rounded hover:bg-slate-50"
                  >
                    <span className="font-medium">{p.identificador}</span>
                    <span className="text-sm text-slate-600">
                      {p.client_name} • {p.tipo_locacao === 'fixa' ? 'Fixa' : 'Flexível'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6">
          <Link
            to="/properties"
            className="text-brand hover:text-brand-dark font-medium"
          >
            Ver todos os imóveis →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
