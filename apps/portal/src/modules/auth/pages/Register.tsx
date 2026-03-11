import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Card } from '../../../shared/components/ui/Card';
import { formatCnpj, formatCpf, formatPhoneBR, parseDigits, isValidCpf, isValidCnpj } from '../../../shared/utils/masks';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pj');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseDigits(e.target.value);
    if (raw.length <= 14) setCnpj(raw);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseDigits(e.target.value);
    if (raw.length <= 11) setCpf(raw);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseDigits(e.target.value);
    if (raw.length <= 11) setPhone(formatPhoneBR(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cnpjDigits = parseDigits(cnpj);
    const cpfDigits = parseDigits(cpf);
    if (personType === 'pj') {
      if (cnpjDigits.length !== 14) {
        setError('CNPJ deve ter 14 dígitos.');
        setIsLoading(false);
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        setError('CNPJ inválido. Verifique os dígitos.');
        setIsLoading(false);
        return;
      }
    } else {
      if (cpfDigits.length !== 11) {
        setError('CPF deve ter 11 dígitos.');
        setIsLoading(false);
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        setError('CPF inválido. Verifique os dígitos.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const userNameValue = personType === 'pf' ? legalName.trim() : userName.trim();
      await register({
        company: {
          person_type: personType,
          legal_name: legalName.trim(),
          trade_name: tradeName.trim() || undefined,
          cnpj: personType === 'pj' ? parseDigits(cnpj) : undefined,
          cpf: personType === 'pf' ? parseDigits(cpf) : undefined,
          phone: parseDigits(phone) || undefined,
        },
        user: { name: userNameValue, email: email.trim(), password },
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cadastrar. Tente novamente.');
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
        <h1 className="text-3xl font-bold text-otium-black mb-2">
          {personType === 'pf' ? 'Criar conta' : 'Cadastrar escritório'}
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          {personType === 'pf'
            ? 'Cadastre-se e comece a usar a plataforma.'
            : 'Crie seu escritório de contabilidade e comece a usar a plataforma.'}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de pessoa</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="personType"
                  value="pj"
                  checked={personType === 'pj'}
                  onChange={() => { setPersonType('pj'); setCpf(''); }}
                  className="rounded border-slate-300"
                />
                <span>Pessoa Jurídica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="personType"
                  value="pf"
                  checked={personType === 'pf'}
                  onChange={() => { setPersonType('pf'); setCnpj(''); }}
                  className="rounded border-slate-300"
                />
                <span>Pessoa Física</span>
              </label>
            </div>
          </div>
          <Input
            label={personType === 'pj' ? 'Razão social' : 'Nome completo'}
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={personType === 'pj' ? 'Ex.: Contabilidade Silva Ltda' : 'Seu nome completo'}
            required
          />
          {personType === 'pj' && (
            <Input
              label="Nome fantasia"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              placeholder="Ex.: Silva Contabilidade (opcional)"
            />
          )}
          {personType === 'pj' ? (
            <Input
              label="CNPJ"
              value={formatCnpj(cnpj)}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0001-00"
              required
              maxLength={18}
            />
          ) : (
            <Input
              label="CPF"
              value={formatCpf(cpf)}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              required
              maxLength={14}
            />
          )}
          <Input
            label="Telefone"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
            maxLength={18}
          />
          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">
            {personType === 'pf' ? 'Dados de acesso' : 'Responsável pelo escritório'}
          </p>
          {personType === 'pj' && (
            <Input
              label="Nome do responsável"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nome completo do responsável"
              required
            />
          )}
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <PasswordInput
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-slate-700 hover:text-otium-black font-medium">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
