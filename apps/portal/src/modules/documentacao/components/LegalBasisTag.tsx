import type { LegalBasis } from '@shared/types/documentation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBalanceScale, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

interface LegalBasisTagProps {
  basis: LegalBasis;
  compact?: boolean;
}

export function LegalBasisTag({ basis, compact = false }: LegalBasisTagProps) {
  const fullReference = [
    basis.norma,
    basis.artigo,
    basis.paragrafo,
    basis.inciso,
  ]
    .filter(Boolean)
    .join(', ');

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 
                   text-blue-700 text-xs rounded-md border border-blue-200"
        title={basis.descricao ?? fullReference}
      >
        <FontAwesomeIcon icon={faBalanceScale} className="h-3 w-3" />
        {fullReference}
      </span>
    );
  }

  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r-lg">
      <div className="flex items-start gap-2">
        <FontAwesomeIcon
          icon={faBalanceScale}
          className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-blue-900">{fullReference}</p>
          {basis.descricao && (
            <p className="text-sm text-blue-700 mt-1">{basis.descricao}</p>
          )}
          {basis.url && (
            <a
              href={basis.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 
                         hover:underline mt-2"
            >
              Ver norma completa
              <FontAwesomeIcon icon={faExternalLinkAlt} className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface LegalBasisListProps {
  bases: LegalBasis[];
  compact?: boolean;
}

export function LegalBasisList({ bases, compact = false }: LegalBasisListProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {bases.map((basis, index) => (
          <LegalBasisTag key={index} basis={basis} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bases.map((basis, index) => (
        <LegalBasisTag key={index} basis={basis} />
      ))}
    </div>
  );
}
