import { InputHTMLAttributes, forwardRef, useState, useEffect } from 'react';

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string; // Prefixo como "R$"
}

/**
 * Formata número para string monetária brasileira
 * Ex: 1000000 -> "1.000.000,00"
 */
function formatMoney(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Remove formatação e converte string monetária para número
 * Ex: "1.000.000,00" -> 1000000
 */
function parseMoney(value: string): number {
  if (!value) return 0;
  
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Se tem vírgula, assume formato brasileiro (1.000.000,00)
  if (cleaned.includes(',')) {
    // Remove pontos (separadores de milhar) e substitui vírgula por ponto
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  
  // Se não tem vírgula, assume número simples
  return parseFloat(cleaned) || 0;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, error, value, onChange, prefix = 'R$', className = '', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    // Atualizar display quando value mudar externamente
    useEffect(() => {
      setDisplayValue(formatMoney(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Se o campo está vazio, permitir limpar
      if (inputValue === '' || inputValue === prefix + ' ' || inputValue === prefix) {
        setDisplayValue('');
        onChange(0);
        return;
      }

      // Remove o prefixo se presente
      let cleanedValue = inputValue;
      if (prefix && cleanedValue.startsWith(prefix)) {
        cleanedValue = cleanedValue.replace(prefix, '').trim();
      }

      // Parse do valor
      const numericValue = parseMoney(cleanedValue);
      
      // Atualiza o display formatado (mas não atualiza o estado ainda para permitir digitação contínua)
      const formatted = formatMoney(numericValue);
      setDisplayValue(formatted);
      
      // Chama onChange com o valor numérico
      onChange(numericValue);
    };

    const handleBlur = () => {
      // Garante formatação completa ao sair do campo
      setDisplayValue(formatMoney(value));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Seleciona todo o texto ao focar para facilitar substituição
      e.target.select();
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue ? `${prefix ? prefix + ' ' : ''}${displayValue}` : ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={`
              w-full bg-white border border-slate-200 rounded-md px-4 py-2
              ${prefix ? 'pl-10' : ''}
              text-right font-mono
              focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            placeholder="0,00"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';
