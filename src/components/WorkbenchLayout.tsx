import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Estimate } from '../circuit/analyze';
import { exampleLibrary } from '../circuit/library';
import {
  blankCircuit,
  board,
  circuitTitle,
  limits,
  paletteKinds,
  partLabels,
  presetCircuit,
  terminalId,
  terminalsFor,
  type Circuit,
  type Part,
  type PartKind,
} from '../circuit/model';
import { flags } from '../flags';
import { browserStorage } from '../storage';
import { loadTheme, saveTheme, type Theme } from '../theme';
import { loadGroundWiring, saveGroundWiring } from '../groundWiring';
import { Board, type Selection } from './Board';
import { groundPresentation } from './groundPresentation';
import { DiagramFiles } from './DiagramFiles';
import { PartControl } from './PartControl';
import { PickupOptions, pickupVariants } from './PickupOptions';
import { VaritoneCard } from './VaritoneCard';
import '../workbench.css';

interface WorkbenchLayoutProps {
  circuit: Circuit;
  estimate: Estimate;
  isEditing: boolean;
  selection: Selection;
  pending: string | null;
  notice: string;
  saveMessage: string;
  canUndo: boolean;
  onUndo: () => void;
  onMode: (editing: boolean) => void;
  onSelect: (selection: Selection) => void;
  onTerminal: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Part>) => void;
  onReplace: (next: Circuit, label: string) => void;
  onAdd: (
    kind: PartKind,
    variant?: { skin: NonNullable<Part['skin']>; label: string },
  ) => void;
  onDelete: () => void;
  onCancelConnection: () => void;
  onMetadata: (next: Circuit) => void;
}

function BenchDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="bench-dialog"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not([hidden]):not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.checkVisibility());
        const first = controls[0];
        const last = controls.at(-1);
        // Native modality blocks the page, but Tab can still escape to browser chrome.
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="bench-panel-heading">
        <h2>{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function WorkbenchLayout({
  circuit,
  estimate,
  isEditing,
  selection,
  pending,
  notice,
  saveMessage,
  canUndo,
  onUndo,
  onMode,
  onSelect,
  onTerminal,
  onUpdate,
  onReplace,
  onAdd,
  onDelete,
  onCancelConnection,
  onMetadata,
}: WorkbenchLayoutProps) {
  const [theme, setTheme] = useState(() => loadTheme(browserStorage()));
  const [themeMessage, setThemeMessage] = useState('');
  const [groundWiringShown, setGroundWiringShown] = useState(() =>
    loadGroundWiring(browserStorage()),
  );
  const [groundWiringMessage, setGroundWiringMessage] = useState('');
  const showGroundWiring = !flags.isCompactGroundEnabled || groundWiringShown;
  const groundView = useMemo(() => groundPresentation(circuit), [circuit]);
  const hiddenGroundParts = circuit.parts.filter(
    (part) => !showGroundWiring && groundView.hiddenParts.has(part.id),
  );
  const isSelectionHidden =
    selection?.kind === 'wire'
      ? !showGroundWiring && groundView.hiddenWires.has(selection.id)
      : hiddenGroundParts.some((part) => part.id === selection?.id);
  const isPendingHidden = hiddenGroundParts.some((part) =>
    terminalsFor(part).some(
      (terminal) => terminalId(part, terminal.name) === pending,
    ),
  );
  // Visibility changes clear only ephemeral authoring state, never circuit/history.
  useEffect(() => {
    if (isSelectionHidden) onSelect(null);
    if (isPendingHidden) onCancelConnection();
  }, [isSelectionHidden, isPendingHidden, onSelect, onCancelConnection]);
  const [operationMessage, setOperationMessage] = useState('');
  const [dialog, setDialog] = useState<
    'Open diagram' | 'Add part' | 'Diagram details' | 'Help' | null
  >(null);
  const [exampleId, setExampleId] = useState('standard-tele');
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [trace, setTrace] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDetailsElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const dialogTrigger = useRef<HTMLElement | SVGElement | null>(null);
  const selectedPart =
    !isSelectionHidden && selection?.kind === 'part'
      ? circuit.parts.find((part) => part.id === selection.id)
      : undefined;
  const hasInspector =
    !isSelectionHidden &&
    !pending &&
    (selectedPart || (isEditing && selection?.kind === 'wire'));
  useLayoutEffect(() => {
    const panel = inspector.current;
    const surface = root.current?.querySelector<HTMLElement>('.bench-surface');
    if (!panel || !surface) return;
    const place = () => {
      panel.style.removeProperty('top');
      panel.style.removeProperty('left');
      panel.style.removeProperty('right');
      panel.style.removeProperty('max-height');
      if (window.innerWidth <= 620) return;
      const bounds = surface.getBoundingClientRect();
      const width = panel.getBoundingClientRect().width;
      const desiredHeight = panel.scrollHeight + 2;
      const pins = Array.from(
        surface.querySelectorAll<SVGCircleElement>(
          '.terminal > circle:first-child',
        ),
      ).map((pin) => {
        const point = new DOMPoint(
          pin.cx.baseVal.value,
          pin.cy.baseVal.value,
        ).matrixTransform(pin.getScreenCTM()!);
        return { x: point.x - bounds.x, y: point.y - bounds.y };
      });
      const preferredLeft = selectedPart && selectedPart.x > board.width / 2;
      const sides = preferredLeft
        ? [18, bounds.width - width - 18]
        : [bounds.width - width - 18, 18];
      const candidates = sides.flatMap((left) => {
        const blocked = pins
          .filter((pin) => pin.x >= left - 18 && pin.x <= left + width + 18)
          .map((pin) => ({ start: pin.y - 18, end: pin.y + 18 }));
        if (selectedPart) {
          const target = Array.from(
            surface.querySelectorAll<SVGElement>('[data-testid]'),
          )
            .find(
              (element) => element.dataset.testid === `part-${selectedPart.id}`,
            )
            ?.getBoundingClientRect();
          if (
            target &&
            target.right > bounds.x + left &&
            target.left < bounds.x + left + width
          )
            blocked.push({
              start: target.top - bounds.y - 12,
              end: target.bottom - bounds.y + 12,
            });
        }
        blocked.sort((a, b) => a.start - b.start);
        let top = 18;
        const gaps: { left: number; top: number; height: number }[] = [];
        for (const interval of [
          ...blocked,
          { start: bounds.height - 18, end: bounds.height },
        ]) {
          const height = Math.min(
            desiredHeight,
            Math.min(interval.start, bounds.height - 18) - top,
          );
          if (height >= 160) gaps.push({ left, top, height });
          top = Math.max(top, interval.end);
        }
        return gaps;
      });
      const best = candidates.sort((a, b) => b.height - a.height)[0];
      // Prefer scrolling a short inspector in free space over covering a real wiring terminal.
      if (best) {
        panel.style.left = `${best.left}px`;
        panel.style.right = 'auto';
        panel.style.top = `${best.top}px`;
        panel.style.maxHeight = `${best.height}px`;
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [circuit, selectedPart, hasInspector]);
  const focusSelection = () => {
    const targets = root.current?.querySelectorAll<SVGElement>('[data-testid]');
    const part = Array.from(targets ?? []).find(
      (element) => element.dataset.testid === `part-${selection?.id}`,
    );
    const wire = Array.from(
      root.current?.querySelectorAll<SVGElement>('[data-wire-id]') ?? [],
    ).find((element) => element.dataset.wireId === selection?.id);
    (part?.querySelector<SVGElement>('.part-body') ?? wire)?.focus({
      preventScroll: true,
    });
  };
  const closeInspector = () => {
    focusSelection();
    onSelect(null);
  };
  const openDialog = (title: NonNullable<typeof dialog>) => {
    dialogTrigger.current =
      document.activeElement instanceof HTMLElement ||
      document.activeElement instanceof SVGElement
        ? document.activeElement
        : null;
    if (more.current?.open) {
      more.current.open = false;
      dialogTrigger.current = more.current.querySelector('summary');
    }
    setDialog(title);
  };
  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() =>
      dialogTrigger.current?.focus({ preventScroll: true }),
    );
  };
  const replaceDiagram = (next: Circuit, label: string) => {
    onReplace(next, label);
    closeDialog();
  };
  const focusControls = () =>
    requestAnimationFrame(() => {
      const control =
        inspector.current?.querySelector<HTMLElement>(
          'input, select, .selector-buttons button',
        ) ?? inspector.current?.querySelector<HTMLElement>('button');
      control?.focus({ preventScroll: true });
    });
  const contributors =
    estimate.activePickups
      .map((id) => circuit.parts.find((part) => part.id === id)!.label)
      .join(' + ') || 'None';
  const topology = estimate.pickupTopology
    ? {
        single: 'Single pickup',
        parallel: 'Parallel pickups',
        series: 'Series pickups',
        mixed: 'Mixed pickup network',
      }[estimate.pickupTopology]
    : '';
  const hasSaveError = /unavailable|could not|skipped/i.test(saveMessage);

  return (
    <div
      ref={root}
      className="workbench-ui"
      data-testid="workbench-ui"
      data-theme={theme}
      data-mode={isEditing ? 'edit' : 'explore'}
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape') return;
        // Resolve only the top layer. Do not let Board's window listener clear an underlying trace.
        if (dialog) {
          event.preventDefault();
          event.stopPropagation();
          closeDialog();
        } else if (more.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          more.current.open = false;
          more.current.querySelector('summary')?.focus();
        } else if (pending) {
          event.preventDefault();
          event.stopPropagation();
          onCancelConnection();
        } else if (hasInspector) {
          event.preventDefault();
          event.stopPropagation();
          closeInspector();
        } else if (selection?.kind === 'wire') {
          event.preventDefault();
          onSelect(null);
          // Let Board's window listener also clear hover/focus previews, even from the toolbar.
        }
      }}
    >
      <header className="bench-toolbar">
        <span className="bench-wordmark" aria-label="Pickup Lab">
          pickup lab
        </span>
        <button
          aria-label="Open diagram"
          onClick={() => openDialog('Open diagram')}
        >
          Open
        </button>
        {flags.isEditorEnabled && (
          <button
            aria-label={isEditing ? 'Finish editing' : 'Edit circuit'}
            aria-pressed={isEditing}
            onClick={() => {
              onMode(!isEditing);
              if (more.current) more.current.open = false;
            }}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
        <button disabled={!canUndo} onClick={onUndo}>
          Undo
        </button>
        {isEditing && (
          <button onClick={() => openDialog('Add part')}>Add part</button>
        )}
        <strong className="bench-title" data-testid="circuit-title">
          {circuitTitle(circuit)}
        </strong>
        <select
          aria-label="Theme"
          value={theme}
          onChange={(event) => {
            const next = event.target.value as Theme;
            setTheme(next);
            setThemeMessage(
              saveTheme(browserStorage(), next)
                ? ''
                : 'Theme could not be saved. Your circuit is unchanged.',
            );
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <details ref={more} className="bench-more">
          <summary role="button" aria-label="More options">
            More <span aria-hidden="true">⋯</span>
          </summary>
          <div className="bench-menu">
            <button onClick={() => openDialog('Diagram details')}>
              Diagram details
            </button>
            <button onClick={() => openDialog('Help')}>Help</button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showAllLabels}
                onChange={(event) => setShowAllLabels(event.target.checked)}
              />
              Show wiring labels
            </label>
            {flags.isCompactGroundEnabled && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showGroundWiring}
                  onChange={(event) => {
                    const isShown = event.target.checked;
                    setGroundWiringShown(isShown);
                    setGroundWiringMessage(
                      saveGroundWiring(browserStorage(), isShown)
                        ? ''
                        : 'Ground view could not be saved. Your circuit is unchanged.',
                    );
                  }}
                />
                Show ground wiring
              </label>
            )}
          </div>
        </details>
      </header>

      <main className="bench-surface" aria-label={circuitTitle(circuit)}>
        <div className="bench-canvas" data-testid="workbench-canvas">
          <Board
            circuit={circuit}
            estimate={estimate}
            isEditing={isEditing}
            selection={selection}
            pending={pending}
            onSelect={onSelect}
            onTerminal={onTerminal}
            onMove={(id, x, y) => onUpdate(id, { x, y })}
            onUpdate={onUpdate}
            compactAnnotations
            showAllLabels={showAllLabels}
            showGroundWiring={showGroundWiring}
            onTraceChange={setTrace}
            onKeyboardSelect={focusControls}
          />
        </div>
        <span className="bench-pan-hint">
          Swipe empty space to pan the diagram
        </span>
        {hasInspector && (
          <section
            ref={inspector}
            className="bench-inspector"
            aria-label="Part controls"
            data-side={
              selectedPart && selectedPart.x > board.width / 2
                ? 'left'
                : 'right'
            }
            data-vertical={
              selectedPart && selectedPart.y > board.height / 2
                ? 'top'
                : 'bottom'
            }
          >
            <header className="bench-panel-heading">
              <h2>{selectedPart?.label ?? 'Selected wire'}</h2>
            </header>
            {selectedPart && (
              <>
                <PartControl
                  part={selectedPart}
                  update={(updates) => onUpdate(selectedPart.id, updates)}
                />
                {isEditing ? (
                  <>
                    <label className="field-label">
                      Part label
                      <input
                        maxLength={40}
                        value={selectedPart.label}
                        onChange={(event) => {
                          if (event.target.value.trim())
                            onUpdate(selectedPart.id, {
                              label: event.target.value,
                            });
                        }}
                      />
                    </label>
                    {flags.isExtendedPartsEnabled && (
                      <PickupOptions
                        part={selectedPart}
                        update={(updates) => onUpdate(selectedPart.id, updates)}
                      />
                    )}
                    {selectedPart.kind === 'capacitor' && (
                      <label className="field-label">
                        Capacitance
                        <select
                          value={selectedPart.value}
                          onChange={(event) =>
                            onUpdate(selectedPart.id, {
                              value: Number(event.target.value),
                            })
                          }
                        >
                          <option value={22}>22 nF</option>
                          <option value={47}>47 nF</option>
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <p className="bench-part-summary">
                    {partLabels[selectedPart.kind]}
                    {selectedPart.kind === 'capacitor'
                      ? ` · ${selectedPart.value} nF`
                      : ''}
                    {selectedPart.resistanceKOhms
                      ? ` · ${selectedPart.resistanceKOhms} kΩ`
                      : ''}
                    {estimate.activePickups.includes(selectedPart.id)
                      ? ' · Contributing to output'
                      : ''}
                  </p>
                )}
              </>
            )}
            {isEditing && (
              <button
                className="delete-button"
                onClick={() => {
                  onDelete();
                  root.current
                    ?.querySelector<HTMLButtonElement>(
                      '[aria-label="Finish editing"]',
                    )
                    ?.focus();
                }}
              >
                Remove selected {selection?.kind}
              </button>
            )}
            <button
              className="bench-inspector-close"
              aria-label="Close part controls"
              onClick={closeInspector}
            >
              Close
            </button>
          </section>
        )}
      </main>

      <footer className="bench-status" data-testid="workbench-status">
        <div className="bench-status-line">
          <span>
            Output{' '}
            <strong data-testid="output-level">
              {estimate.output === null ? '—' : `${estimate.output}%`}
            </strong>
            {estimate.status !== 'live' && (
              <span className="bench-output-note">({estimate.message})</span>
            )}
            {estimate.notes.length > 0 && (
              <span className="bench-output-note">
                ({estimate.notes.join('; ')})
              </span>
            )}
          </span>
          <span className="bench-contributors">
            {contributors}
            {topology && (
              <>
                {' '}
                · <span data-testid="coil-topology">{topology}</span>
              </>
            )}
          </span>
          <span className="bench-guidance" role="status">
            {pending
              ? `Connecting from ${pending}`
              : trace ||
                (isEditing
                  ? showGroundWiring
                    ? 'Click two terminals to connect'
                    : 'Click two terminals to connect · More → Show ground wiring to edit ground connections'
                  : 'Select a part to adjust it')}
          </span>
          {pending && (
            <button onClick={onCancelConnection}>Cancel connection</button>
          )}
        </div>
        {hasSaveError && <p role="alert">{saveMessage}</p>}
        {themeMessage && <p role="alert">{themeMessage}</p>}
        {groundWiringMessage && <p role="alert">{groundWiringMessage}</p>}
        {operationMessage && (
          <p
            role={
              /failed|not saved/i.test(operationMessage) ? 'alert' : 'status'
            }
          >
            {operationMessage}
          </p>
        )}
        {notice && !pending && (
          <p className="bench-notice" role="status">
            {notice}
          </p>
        )}
      </footer>

      {dialog && (
        <BenchDialog title={dialog} onClose={closeDialog}>
          {dialog === 'Open diagram' && (
            <>
              {flags.isExtendedPartsEnabled ? (
                <div className="bench-library">
                  <label className="field-label">
                    Library
                    <select
                      aria-label="Library"
                      value={exampleId}
                      onChange={(event) => setExampleId(event.target.value)}
                    >
                      {exampleLibrary.map((example) => (
                        <option key={example.id} value={example.id}>
                          {example.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    {
                      exampleLibrary.find((example) => example.id === exampleId)
                        ?.description
                    }
                  </p>
                  <button
                    onClick={() => {
                      const example = exampleLibrary.find(
                        (item) => item.id === exampleId,
                      )!;
                      replaceDiagram(example.createCircuit(), example.title);
                    }}
                  >
                    Load example
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    replaceDiagram(presetCircuit(), 'Standard Tele')
                  }
                >
                  Load standard Tele
                </button>
              )}
              {flags.isEditorEnabled && (
                <button
                  onClick={() => {
                    onMode(true);
                    replaceDiagram(blankCircuit(), 'New circuit');
                  }}
                >
                  New circuit
                </button>
              )}
              {flags.isDiagramFilesEnabled && (
                <DiagramFiles
                  embedded
                  circuit={circuit}
                  canImport={flags.isEditorEnabled}
                  canEdit={flags.isEditorEnabled && isEditing}
                  onImport={(next) => replaceDiagram(next, 'Diagram')}
                  onMetadata={onMetadata}
                  onMessage={setOperationMessage}
                />
              )}
            </>
          )}
          {dialog === 'Add part' && (
            <div className="bench-palette">
              {paletteKinds
                .filter(
                  (kind) =>
                    flags.isExtendedPartsEnabled ||
                    ![
                      'blade4',
                      'push-pull-volume',
                      'push-pull-tone',
                      'varitone',
                    ].includes(kind),
                )
                .map((kind) => (
                  <button
                    key={kind}
                    disabled={circuit.parts.length >= limits.parts}
                    onClick={() => {
                      onAdd(kind);
                      closeDialog();
                    }}
                  >
                    ＋ {partLabels[kind]}
                  </button>
                ))}
              {flags.isExtendedPartsEnabled &&
                pickupVariants.map((variant) => (
                  <button
                    key={variant.skin}
                    disabled={circuit.parts.length >= limits.parts}
                    onClick={() => {
                      onAdd(variant.kind, {
                        skin: variant.skin,
                        label: variant.label,
                      });
                      closeDialog();
                    }}
                  >
                    ＋ {variant.label}
                  </button>
                ))}
            </div>
          )}
          {dialog === 'Diagram details' && (
            <div className="bench-details">
              <h3>{circuitTitle(circuit)}</h3>
              <p>{estimate.message}</p>
              <p>
                Contributing pickups: {contributors}.{' '}
                <span data-testid="coil-topology">{topology}</span>
              </p>
              <p>
                Treble character:{' '}
                <strong data-testid="treble-level">
                  {estimate.treble === null ? '—' : `${estimate.treble}%`}
                </strong>{' '}
                · Warm → Bright
              </p>
              <p>
                <strong data-testid="tone-diversion">
                  {estimate.toneDiversion === null
                    ? '—'
                    : `${estimate.toneDiversion}%`}
                </strong>{' '}
                illustrative treble diverted. Tone → capacitor → ground;
                separate from output level.
              </p>
              {estimate.varitone && (
                <VaritoneCard estimate={estimate.varitone} />
              )}
              {estimate.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              <div className="legend">
                <span>
                  <i className="legend-hot" />
                  {flags.isSignalFlowEnabled
                    ? 'Orange: HOT'
                    : 'Signal contribution'}
                </span>
                {flags.isSignalFlowEnabled && (
                  <span>Blue: switched / series RETURN</span>
                )}
                <span>
                  <i className="legend-ground" />
                  Grey: ground / connected return
                </span>
                <span>
                  <i className="legend-tone" />
                  Tone branch
                </span>
                <span className="bench-lc">Purple: LC branch</span>
              </div>
              {flags.isClearWiringEnabled && (
                <p>
                  Small gaps at crossings mean separate wires, not connections.
                  Only terminals connect. Hover or Tab to follow a continuous
                  trace.
                </p>
              )}
              <p>
                Educational approximation · linear volume, illustrative treble.
                Glow is contribution, not voltage or measured current. Ground
                connects only through wires to jack sleeve.
              </p>
              {flags.isSignalFlowEnabled && (
                <p>
                  Lead colors stay fixed as controls change. Moving highlights
                  follow contributing paths toward the output, not electrical
                  current. Ambiguous paths and reduced motion use static
                  highlights.
                </p>
              )}
              <p>
                {circuit.parts.length} parts · {circuit.wires.length} wires
              </p>
              <p>{saveMessage}</p>
            </div>
          )}
          {dialog === 'Help' && (
            <div className="bench-details">
              {flags.isCompactGroundEnabled && (
                <p>
                  Small grey ground symbols mark terminals connected to jack
                  sleeve. More → Show ground wiring reveals the wires and
                  connected ground junctions so you can inspect or edit them.
                  Floating grounds stay visible.
                </p>
              )}
              {flags.isClearWiringEnabled && (
                <p>
                  Small gaps at crossings mean separate wires. Connections
                  happen only at terminals; a highlighted trace stays
                  continuous.
                </p>
              )}
              <p>
                Select a part to adjust it with its controls. Hover or Tab to a
                wire to preview its endpoints; click or Enter pins the trace.
                Escape or empty-space click clears it.
              </p>
              {flags.isEditorEnabled && (
                <p>
                  Edit circuit to add parts, drag them, or connect two
                  terminals. Focus a part and use arrow keys to move it. Select
                  a part or wire to remove it. Undo restores up to 30 changes,
                  including diagram loads.
                </p>
              )}
              <p>
                Enter or Space selects a focused part and opens its controls.
                Close or Escape returns to the part. Escape closes the top panel
                first; while connecting, it cancels the connection.
              </p>
              <p>
                On small screens, swipe empty canvas space to pan. Circuit
                processing and saved work stay in this browser. Open contains
                examples
                {flags.isDiagramFilesEnabled
                  ? ', local JSON files, and attribution'
                  : ''}
                .
              </p>
            </div>
          )}
        </BenchDialog>
      )}
    </div>
  );
}
