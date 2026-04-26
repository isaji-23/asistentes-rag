import { useRef, type ChangeEvent } from 'react';
import type { Assistant } from '../../types/api';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../../hooks/useDocuments';
import TopBar from '../layout/TopBar';
import Spinner from '../common/Spinner';
import DocumentDropzone from './DocumentDropzone';
import DocumentListItem from './DocumentListItem';
import EmptyDocuments from './EmptyDocuments';

const ACCEPTED = '.pdf,.txt,.docx,.md';

interface DocumentsSidebarProps {
  assistant: Assistant;
}

export default function DocumentsSidebar({ assistant }: DocumentsSidebarProps) {
  const { data: documents, isLoading } = useDocuments(assistant.id);
  const uploadMutation = useUploadDocument(assistant.id);
  const deleteMutation = useDeleteDocument(assistant.id);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: File[]) {
    files.forEach((file) => uploadMutation.mutate(file));
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
    e.target.value = '';
  }

  const hasDocs = (documents?.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--color-surface-sidebar)' }}>
      <TopBar>
        <span style={{
          flex: 1, fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          fontWeight: 400, color: 'var(--color-black)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          Documentos
        </span>
        {hasDocs && (
          <span style={{ fontSize: 11, color: 'var(--color-muted-slate)', fontFamily: 'var(--font-mono)' }}>
            {documents!.length}
          </span>
        )}
      </TopBar>

      {/* Hidden input for EmptyDocuments button */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={uploadMutation.isPending}
      />

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size="md" />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: hasDocs ? 'auto' : 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DocumentDropzone onFiles={handleFiles} isUploading={uploadMutation.isPending} />

          {!hasDocs ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyDocuments onUploadClick={() => inputRef.current?.click()} />
            </div>
          ) : (
            <div style={{ padding: '0 var(--space-2)' }}>
              {documents!.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  doc={doc}
                  onDelete={() => deleteMutation.mutate(doc.id)}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === doc.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
