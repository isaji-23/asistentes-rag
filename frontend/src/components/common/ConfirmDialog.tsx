import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p style={{ color: 'var(--color-muted-slate)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)', lineHeight: 'var(--leading-normal)' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'solid'} type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
