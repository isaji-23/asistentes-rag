import { useState, type FormEvent } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import type { CreateAssistantBody } from '../../api/assistants';

interface NewAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (body: CreateAssistantBody) => void;
  isPending: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px var(--space-5)',
  border: '1px solid var(--color-border-cool)',
  borderRadius: 'var(--radius-sharp)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-near-black)',
  background: 'var(--color-white)',
  outline: 'none',
  transition: 'border-color var(--transition-base)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-muted-slate)',
  marginBottom: 'var(--space-2)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export default function NewAssistantModal({ open, onClose, onCreate, isPending }: NewAssistantModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim() || undefined, instructions: instructions.trim() || undefined });
  }

  function handleClose() {
    setName(''); setDescription(''); setInstructions('');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo asistente">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <label htmlFor="asst-name" style={labelStyle}>Nombre *</label>
          <input
            id="asst-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi asistente"
            required
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-focus-purple)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-cool)'; }}
          />
        </div>

        <div>
          <label htmlFor="asst-desc" style={labelStyle}>Descripción</label>
          <input
            id="asst-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-focus-purple)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-cool)'; }}
          />
        </div>

        <div>
          <label htmlFor="asst-instr" style={labelStyle}>Instrucciones</label>
          <textarea
            id="asst-instr"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Responde siempre en español…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-focus-purple)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-cool)'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="solid" type="submit" disabled={!name.trim() || isPending}>
            {isPending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
