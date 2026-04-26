import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

interface DocumentDropzoneProps {
  onFiles: (files: File[]) => void;
  isUploading: boolean;
}

const ACCEPTED = '.pdf,.txt,.docx,.md';

export default function DocumentDropzone({ onFiles, isUploading }: DocumentDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.size > 0);
    if (files.length) onFiles(files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  const active = dragging || (hovered && !isUploading);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isUploading && inputRef.current?.click()}
      style={{
        margin: 'var(--space-5)',
        border: `1.5px dashed ${active ? 'var(--color-interaction-blue)' : 'var(--color-border-cool)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-2)', cursor: isUploading ? 'not-allowed' : 'pointer',
        background: dragging ? 'var(--color-blue-tint)' : hovered && !isUploading ? 'var(--color-snow)' : 'transparent',
        transition: 'border-color var(--transition-base), background var(--transition-base)',
        textAlign: 'center',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-interaction-blue)' : 'var(--color-muted-slate)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke var(--transition-base)' }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span style={{ fontSize: 'var(--text-xs)', color: active ? 'var(--color-interaction-blue)' : 'var(--color-muted-slate)', transition: 'color var(--transition-base)' }}>
        {isUploading ? 'Subiendo…' : 'Arrastra archivos o haz clic'}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-muted-slate)', opacity: 0.7 }}>
        PDF, TXT, DOCX, MD
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={isUploading}
      />
    </div>
  );
}
