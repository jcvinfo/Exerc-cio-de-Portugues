import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { ConfirmDialogState } from '../types/quiz';

interface ConfirmModalProps {
  dialog: ConfirmDialogState;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  dialog,
  onClose,
}) => {
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!dialog.isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialog.isOpen, isBusy, onClose]);

  if (!dialog.isOpen) return null;

  const isDanger = dialog.variant === 'danger';

  const handleConfirm = async () => {
    setIsBusy(true);
    try {
      await dialog.onConfirm();
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isDanger
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-[#2457a6]'
              }`}
            >
              {isDanger ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                {dialog.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {dialog.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar janela de confirmação"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {dialog.details && dialog.details.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-700">
            {dialog.details.map((item, idx) => (
              <li key={idx} className="truncate font-medium">
                • {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {dialog.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
              isDanger
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-[#2457a6] hover:bg-[#1d4687]'
            }`}
          >
            {isBusy ? 'Processando...' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
