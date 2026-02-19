import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Card } from '../../../shared/components/ui/Card';

/** Remove caracteres não numéricos do CNPJ */
function formatCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

/** Máscara de exibição: 00.000.000/0000-00 */
function displayCnpj(value: string): string {
  const d = formatCnpj(value);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = formatCnpj(e.target.value);
    if (raw.length <= 14) setCnpj(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register({
        company: {
          legal_name: legalName.trim(),
          trade_name: tradeName.trim() || undefined,
          cnpj: formatCnpj(cnpj),
          phone: phone.trim() || undefined,
        },
        user: { name: userName.trim(), email: email.trim(), password },
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar escritório. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar ao início
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-otium-black mb-2">Cadastrar escritório</h1>
        <p className="text-slate-600 text-sm mb-6">
          Crie seu escritório de contabilidade e comece a usar a plataforma.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Razão social"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Ex.: Contabilidade Silva Ltda"
            required
          />
          <Input
            label="Nome fantasia"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Ex.: Silva Contabilidade (opcional)"
          />
          <Input
            label="CNPJ"
            value={displayCnpj(cnpj)}
            onChange={handleCnpjChange}
            placeholder="00.000.000/0001-00"
            required
            maxLength={18}
          />
          <Input
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Responsável pelo escritório</p>
          <Input
            label="Nome do responsável"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Seu nome completo"
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Cadastrando escritório...' : 'Cadastrar escritório'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já tem um escritório cadastrado?{' '}
          <Link to="/login" className="text-slate-700 hover:text-otium-black font-medium">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
