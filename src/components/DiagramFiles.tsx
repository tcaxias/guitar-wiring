import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { circuitTitle, limits, type Circuit } from '../circuit/model';
import { parseCircuitText, serializeCircuit } from '../circuit/portable';

interface DiagramFilesProps {
  circuit: Circuit;
  canImport: boolean;
  canEdit: boolean;
  onImport: (circuit: Circuit) => void;
  onMetadata: (circuit: Circuit) => void;
  embedded?: boolean;
  onMessage?: (message: string) => void;
}

export function DiagramFiles({
  circuit,
  canImport,
  canEdit,
  onImport,
  onMetadata,
  embedded = false,
  onMessage,
}: DiagramFilesProps) {
  const [message, setLocalMessage] = useState('');
  const setMessage = (next: string) => {
    setLocalMessage(next);
    onMessage?.(next);
  };
  const input = useRef<HTMLInputElement>(null);
  const importSequence = useRef(0);
  const latestImport = useRef(onImport);
  useLayoutEffect(() => {
    // Invalidate before asynchronous reads can overwrite a committed edit or undo.
    importSequence.current += 1;
  }, [circuit]);
  useEffect(() => {
    latestImport.current = onImport;
  }, [onImport]);
  useEffect(
    () => () => {
      importSequence.current += 1;
    },
    [],
  );
  useEffect(() => {
    const element = input.current;
    const cancel = () => {
      importSequence.current += 1;
    };
    element?.addEventListener('cancel', cancel);
    return () => element?.removeEventListener('cancel', cancel);
  }, [canImport]);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const sequence = ++importSequence.current;
    const file = event.target.files?.[0];
    // Reset immediately so choosing the same file again still dispatches change.
    event.target.value = '';
    if (!file || !canImport) return;
    try {
      if (file.size > limits.text)
        throw new Error('Diagram file is too large.');
      const text = await file.text();
      if (sequence !== importSequence.current) return;
      const next = parseCircuitText(text);
      latestImport.current(next);
      setMessage('Diagram imported. Undo restores the previous diagram.');
    } catch (error) {
      if (sequence !== importSequence.current) return;
      setMessage(
        `Import failed: ${error instanceof Error ? error.message : 'Could not read file.'} Your diagram is unchanged.`,
      );
    }
  };

  const exportFile = () => {
    try {
      const text = serializeCircuit(circuit);
      const url = URL.createObjectURL(
        new Blob([text], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${
        circuitTitle(circuit)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 64) || 'pickup-lab-diagram'
      }.json`;
      anchor.click();
      // Allow the browser to start the download before releasing its backing blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Diagram exported with attribution.');
    } catch (error) {
      setMessage(
        `Export failed: ${error instanceof Error ? error.message : 'Invalid diagram.'}`,
      );
    }
  };

  const contents = (
    <>
      <div className="file-actions">
        <button onClick={exportFile}>Export JSON</button>
        {canImport && (
          <>
            <button
              onClick={() => {
                importSequence.current += 1;
                input.current?.click();
              }}
            >
              Import JSON
            </button>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              aria-label="Import diagram JSON"
              onChange={importFile}
              hidden
            />
          </>
        )}
        <small>
          Version 2 JSON · local files · attribution travels with your diagram
        </small>
      </div>
      {canEdit ? (
        <form
          key={JSON.stringify(circuit.metadata)}
          className="metadata-form"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const next = {
              ...circuit,
              metadata: {
                title: String(fields.get('title') ?? ''),
                creator: String(fields.get('creator') ?? ''),
                sourceUrl: String(fields.get('sourceUrl') ?? ''),
                permission: String(fields.get('permission') ?? ''),
              },
            };
            try {
              serializeCircuit(next);
              onMetadata(next);
              setMessage('Attribution saved.');
            } catch (error) {
              setMessage(
                `Attribution not saved: ${error instanceof Error ? error.message : 'Invalid fields.'}`,
              );
            }
          }}
        >
          <label className="field-label">
            Diagram title
            <input
              name="title"
              maxLength={80}
              defaultValue={circuitTitle(circuit)}
              required
            />
          </label>
          <label className="field-label">
            Creator
            <input
              name="creator"
              maxLength={120}
              defaultValue={circuit.metadata.creator}
            />
          </label>
          <label className="field-label">
            Source URL
            <input
              name="sourceUrl"
              maxLength={2048}
              type="url"
              placeholder="https://…"
              defaultValue={circuit.metadata.sourceUrl}
            />
          </label>
          <label className="field-label">
            Permission / license
            <input
              name="permission"
              maxLength={500}
              defaultValue={circuit.metadata.permission}
            />
          </label>
          <button type="submit">Save attribution</button>
        </form>
      ) : (
        <p className="attribution">
          {circuit.metadata.creator || 'Creator not specified'} ·{' '}
          {circuit.metadata.permission || 'Permission not specified'}
          {circuit.metadata.sourceUrl && (
            <>
              {' '}
              ·{' '}
              <a
                href={circuit.metadata.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </a>
            </>
          )}
          {canImport && <small> Switch to Edit to update attribution.</small>}
        </p>
      )}
      {message && (
        <p role="status" className="file-message">
          {message}
        </p>
      )}
    </>
  );
  return embedded ? (
    <div className="diagram-files">{contents}</div>
  ) : (
    <details className="diagram-files">
      <summary>
        Diagram & attribution <span>{circuitTitle(circuit)}</span>
      </summary>
      {contents}
    </details>
  );
}
