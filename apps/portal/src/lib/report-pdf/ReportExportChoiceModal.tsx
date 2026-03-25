import { Modal } from '../../shared/components/ui/Modal';

export type ReportExportChoiceOption = {
  title: string;
  description: string;
  onSelect: () => void;
};

const docIcon = (
  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  optionA: ReportExportChoiceOption;
  optionB: ReportExportChoiceOption;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large';
};

/**
 * Modal com duas opções em cartões (resumida/completa ou resultado/parâmetros).
 */
export function ReportExportChoiceModal({
  isOpen,
  onClose,
  title,
  intro = 'Escolha o formato:',
  optionA,
  optionB,
  size = 'md',
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-4">
        {intro ? <p className="text-sm text-slate-600">{intro}</p> : null}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              optionA.onSelect();
              onClose();
            }}
            className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-brand hover:bg-brand/5 transition-colors text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">{docIcon}</div>
            <div>
              <h4 className="font-semibold text-slate-900">{optionA.title}</h4>
              <p className="text-sm text-slate-600 mt-0.5">{optionA.description}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              optionB.onSelect();
              onClose();
            }}
            className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-brand hover:bg-brand/5 transition-colors text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">{docIcon}</div>
            <div>
              <h4 className="font-semibold text-slate-900">{optionB.title}</h4>
              <p className="text-sm text-slate-600 mt-0.5">{optionB.description}</p>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
