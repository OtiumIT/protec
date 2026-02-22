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
 * Parse monetário:
 * - Sem vírgula: sequência de dígitos = valor em centavos (últimos 2 = centavos).
 *   Ex.: "235360291" → 2.353.602,91
 * - Com vírgula: parte inteira + até 2 decimais; excesso vira inteiro (9,000 → 90,00).
 */
function parseMoney(value: string): number {
  if (!value) return 0;

  const cleaned = value.replace(/[^\d,.-]/g, '');
  const hasComma = cleaned.includes(',');

  if (!hasComma) {
    const digits = cleaned.replace(/\D/g, '');
    if (!digits) return 0;
    // Dígitos = valor em centavos (2 últimos = centavos)
    const cents = parseInt(digits, 10);
    return Math.round(cents) / 100;
  }

  const [intStr, decStr] = cleaned.split(',');
  const intPart = parseInt((intStr || '0').replace(/\D/g, ''), 10) || 0;
  const decDigits = (decStr || '').replace(/\D/g, '');

  if (decDigits.length <= 2) {
    const decPart = parseInt(decDigits.padEnd(2, '0').slice(0, 2), 10) || 0;
    return intPart + decPart / 100;
  }

  // Mais de 2 decimais: excesso vira parte inteira
  const excess = decDigits.length - 2;
  const shift = Math.pow(10, excess);
  const newInt = intPart * shift + parseInt(decDigits.slice(0, excess), 10);
  const newDec = parseInt(decDigits.slice(-2), 10) || 0;
  return newInt + newDec / 100;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, error, value, onChange, prefix = 'R$', className = '', ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    // Sincronizar display com value quando o campo não está focado (ex.: valor mudou externamente)
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatMoney(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Se o campo está vazio, permitir limpar
      if (inputValue === '' || (prefix && (inputValue === prefix + ' ' || inputValue === prefix))) {
        setDisplayValue('');
        onChange(0);
        return;
      }

      // Remove o prefixo se o usuário colar "R$ 1.000,00"
      let cleanedValue = inputValue;
      if (prefix && cleanedValue.startsWith(prefix)) {
        cleanedValue = cleanedValue.replace(prefix, '').trim();
      }

      const numericValue = parseMoney(cleanedValue);
      const rounded = Math.round(numericValue * 100) / 100;
      setDisplayValue(formatMoney(rounded));
      onChange(rounded);
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Normaliza para 2 casas decimais ao sair do campo
      setDisplayValue(formatMoney(value));
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
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
            value={displayValue}
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
