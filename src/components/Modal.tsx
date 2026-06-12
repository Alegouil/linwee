import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  panelClassName?: string;
  contentClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, panelClassName = '', contentClassName = '' }: ModalProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-x-0 top-0 bottom-[4.75rem] z-50 flex items-end justify-center bg-black/50 pt-4 md:bottom-0 md:items-center md:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`${
          isDark ? 'bg-slate-800' : 'bg-white'
        } modal-enter max-h-[calc(100dvh-6.5rem)] w-full max-w-2xl overflow-hidden rounded-t-3xl shadow-2xl md:max-h-[92vh] md:rounded-2xl ${panelClassName}`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'} px-4 py-3 md:p-6`}>
          <h2 className={`text-xl font-semibold md:text-2xl ${isDark ? 'text-white' : 'text-surface'}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`max-h-[calc(100dvh-10.5rem)] overflow-y-auto px-4 pb-28 pt-4 md:max-h-[calc(92vh-88px)] md:p-6 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
