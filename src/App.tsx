import { useMemo, useState } from 'react';
import { analyze } from './circuit/analyze';
import {
  blankCircuit,
  circuitTitle,
  connect,
  createPart,
  isBladePart,
  potRole,
  limits,
  paletteKinds,
  partLabels,
  presetCircuit,
  removePart,
  type Circuit,
  type Part,
  type PartKind,
} from './circuit/model';
import { Board, type Selection } from './components/Board';
import { exampleLibrary } from './circuit/library';
import { PickupOptions, pickupVariants } from './components/PickupOptions';
import { mergePartUpdates } from './components/partUpdates';
import { VaritoneCard } from './components/VaritoneCard';
import { DiagramFiles } from './components/DiagramFiles';
import { PartControl } from './components/PartControl';
import { WorkbenchLayout } from './components/WorkbenchLayout';
import { flags } from './flags';
import { browserStorage, loadCircuit, saveCircuit } from './storage';
import { loadTheme, saveTheme, type Theme } from './theme';

export function App() {
  return flags.isPlaygroundEnabled ? (
    <Workbench />
  ) : (
    <main className="disabled-page">
      <div className="brand-icon">⌁</div>
      <h1>Pickup Lab</h1>
      <p>The playground is disabled in this build.</p>
      <code>VITE_ENABLE_PLAYGROUND=false</code>
    </main>
  );
}

function Workbench() {
  const [initial] = useState(() => loadCircuit(browserStorage()));
  const [circuit, setCircuit] = useState(initial.circuit);
  const [history, setHistory] = useState<Circuit[]>([]);
  const [saveMessage, setSaveMessage] = useState(initial.message);
  const [isEditing, setIsEditing] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [exampleId, setExampleId] = useState('standard-tele');
  const [theme, setTheme] = useState(() => loadTheme(browserStorage()));
  const estimate = useMemo(() => analyze(circuit), [circuit]);
  const selectedPart =
    selection?.kind === 'part'
      ? circuit.parts.find((part) => part.id === selection.id)
      : undefined;
  const commit = (next: Circuit) => {
    if (next === circuit || JSON.stringify(next) === JSON.stringify(circuit))
      return;
    setHistory((previous) => [...previous.slice(-29), circuit]);
    setCircuit(next);
    if (selection?.kind === 'wire') setSelection(null);
    setSaveMessage(saveCircuit(browserStorage(), next));
  };
  const updatePart = (id: string, updates: Partial<Part>) =>
    commit({
      ...circuit,
      parts: circuit.parts.map((part) =>
        part.id === id ? mergePartUpdates(part, updates) : part,
      ),
    });
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setCircuit(previous);
    setHistory(history.slice(0, -1));
    setSelection(null);
    setPending(null);
    setSaveMessage(saveCircuit(browserStorage(), previous));
    setNotice('Previous change restored.');
  };
  const setThemePreference = (next: Theme) => {
    setTheme(next);
    setSaveMessage(
      saveTheme(browserStorage(), next)
        ? ''
        : 'Theme could not be saved. Your circuit is unchanged.',
    );
  };
  const replace = (next: Circuit, label: string) => {
    commit(next);
    setSelection(null);
    setPending(null);
    setNotice(`${label} loaded. Undo restores your previous circuit.`);
  };
  const addPart = (
    kind: PartKind,
    variant?: { skin: NonNullable<Part['skin']>; label: string },
  ) => {
    if (circuit.parts.length >= limits.parts) {
      setNotice(`Workbench limit: ${limits.parts} parts.`);
      return;
    }
    const part = {
      ...createPart(kind, crypto.randomUUID(), circuit.parts.length),
      ...variant,
    };
    commit({ ...circuit, parts: [...circuit.parts, part] });
    setSelection({ kind: 'part', id: part.id });
    setNotice(
      `${part.label} added. Drag it into place, or focus it and use arrow keys.`,
    );
  };
  const onTerminal = (id: string) => {
    if (!pending) {
      setPending(id);
      setNotice('Choose a second terminal. Escape cancels.');
      return;
    }
    const next = connect(circuit, pending, id, crypto.randomUUID());
    commit(next);
    setPending(null);
    setNotice(
      next === circuit
        ? 'Connection cancelled: same terminal, existing wire, or wire limit.'
        : 'Wire connected. Select a wire to remove it.',
    );
  };
  const deleteSelected = () => {
    if (!selection) return;
    commit(
      selection.kind === 'part'
        ? removePart(circuit, selection.id)
        : {
            ...circuit,
            wires: circuit.wires.filter((wire) => wire.id !== selection.id),
          },
    );
    setSelection(null);
    setPending(null);
    setNotice('Selection removed. Undo restores it.');
  };
  const changeMode = (editing: boolean) => {
    setIsEditing(editing);
    setPending(null);
    setSelection(null);
    setNotice('');
  };

  if (flags.isWorkbenchUiEnabled)
    return (
      <WorkbenchLayout
        circuit={circuit}
        estimate={estimate}
        isEditing={isEditing}
        selection={selection}
        pending={pending}
        notice={notice}
        saveMessage={saveMessage}
        canUndo={history.length > 0}
        onUndo={undo}
        onMode={changeMode}
        onSelect={setSelection}
        onTerminal={onTerminal}
        onUpdate={updatePart}
        onReplace={replace}
        onAdd={addPart}
        onDelete={deleteSelected}
        onCancelConnection={() => {
          setPending(null);
          setNotice('Connection cancelled.');
        }}
        onMetadata={commit}
      />
    );

  return (
    <div
      className="app-shell"
      data-theme={theme}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setPending(null);
          setSelection(null);
          setNotice('Connection cancelled.');
        }
      }}
    >
      <header className="app-header">
        <a
          className="brand"
          href="#workbench"
          aria-label="Pickup Lab workbench"
        >
          <span className="brand-icon">⌁</span>
          <span>
            pickup<span className="brand-light">lab</span>
            <small>GUITAR WIRING WORKBENCH</small>
          </span>
        </a>
        <nav className="header-actions" aria-label="Workbench actions">
          {flags.isEditorEnabled && (
            <div className="mode-switch">
              <button
                className={!isEditing ? 'is-active' : ''}
                aria-pressed={!isEditing}
                onClick={() => changeMode(false)}
              >
                ◉ Play
              </button>
              <button
                className={isEditing ? 'is-active' : ''}
                aria-pressed={isEditing}
                onClick={() => changeMode(true)}
              >
                ✎ Edit
              </button>
            </div>
          )}
          <button
            className="quiet-button"
            onClick={() => replace(presetCircuit(), 'Two-pickup preset')}
          >
            ↺ Preset
          </button>
          {flags.isEditorEnabled && (
            <button
              className="quiet-button"
              onClick={() => {
                replace(blankCircuit(), 'Blank build');
                setIsEditing(true);
              }}
            >
              ＋ Blank build
            </button>
          )}
          <button
            className="undo-button"
            disabled={!history.length}
            onClick={undo}
          >
            Undo
          </button>
          <select
            className="quiet-button"
            aria-label="Theme"
            value={theme}
            onChange={(event) =>
              setThemePreference(event.target.value as Theme)
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </nav>
      </header>

      <main id="workbench">
        <section className="intro">
          <div>
            <div className="eyebrow">THE BENCH IS YOURS</div>
            <h1>See how your sound connects.</h1>
            <p>Trace the signal. Turn a knob. Make it your own.</p>
          </div>
          <div className="local-badge">
            <span />
            LOCAL & PRIVATE<small>Everything stays in your browser</small>
          </div>
        </section>
        {flags.isExtendedPartsEnabled && (
          <div className="example-library" aria-label="Example library">
            <label htmlFor="example-library">Library</label>
            <select
              id="example-library"
              value={exampleId}
              onChange={(event) => setExampleId(event.target.value)}
            >
              {exampleLibrary.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const example = exampleLibrary.find(
                  (item) => item.id === exampleId,
                )!;
                replace(example.createCircuit(), example.title);
              }}
            >
              Load example
            </button>
            <span>
              {
                exampleLibrary.find((example) => example.id === exampleId)
                  ?.description
              }
            </span>
          </div>
        )}
        {flags.isDiagramFilesEnabled && (
          <DiagramFiles
            circuit={circuit}
            canImport={flags.isEditorEnabled}
            canEdit={flags.isEditorEnabled && isEditing}
            onImport={(next) => replace(next, 'Diagram')}
            onMetadata={commit}
          />
        )}
        <div className="workspace">
          <section className="board-panel" aria-label="Circuit board">
            <div className="panel-heading">
              <div>
                <span className="status-dot" />
                <strong className="circuit-title" data-testid="circuit-title">
                  {circuitTitle(circuit)}
                </strong>
              </div>
              <span className="board-tag">
                {isEditing ? 'EDIT MODE' : 'PASSIVE / MONO'}
              </span>
            </div>
            {(circuit.parts.some((part) => part.kind === 'selector') ||
              circuit.metadata.title === 'Imported legacy build') && (
              <div className="preset-prompt">
                <p>
                  Your saved wiring is unchanged. Try the standard
                  two-single-coil circuit; Undo brings this one back.
                </p>
                <button
                  onClick={() => replace(presetCircuit(), 'Standard Tele')}
                >
                  Load standard Tele
                </button>
              </div>
            )}
            {isEditing && (
              <div className="parts-tray" aria-label="Parts tray">
                <span>ADD PART</span>
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
                      onClick={() => addPart(kind)}
                      disabled={circuit.parts.length >= limits.parts}
                    >
                      ＋ {partLabels[kind]}
                    </button>
                  ))}
                {flags.isExtendedPartsEnabled &&
                  pickupVariants.map((variant) => (
                    <button
                      key={variant.skin}
                      onClick={() =>
                        addPart(variant.kind, {
                          skin: variant.skin,
                          label: variant.label,
                        })
                      }
                      disabled={circuit.parts.length >= limits.parts}
                    >
                      ＋ {variant.label}
                    </button>
                  ))}
              </div>
            )}
            <Board
              circuit={circuit}
              estimate={estimate}
              isEditing={isEditing}
              selection={selection}
              pending={pending}
              onSelect={setSelection}
              onTerminal={onTerminal}
              onMove={(id, x, y) => updatePart(id, { x, y })}
              onUpdate={updatePart}
            />
            <div className="board-footer">
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
              </div>
              <span>Glow ≈ contribution, not voltage</span>
            </div>
          </section>

          <aside className="sidebar" aria-label="Circuit controls">
            <section className="output-card">
              <div className="eyebrow">AT THE OUTPUT JACK</div>
              <div className="output-heading">
                <h2>
                  {estimate.status === 'unavailable'
                    ? 'Unestimated'
                    : estimate.output === 0
                      ? 'Quiet'
                      : 'Signal flowing'}
                </h2>
                <span className={`live-badge ${estimate.status}`}>
                  {estimate.status === 'live'
                    ? '● LIVE'
                    : estimate.status === 'silent'
                      ? '○ SILENT'
                      : '◇ CHECK'}
                </span>
              </div>
              <div className="output-value">
                <strong data-testid="output-level">
                  {estimate.output === null ? '—' : `${estimate.output}%`}
                </strong>
                <span>approx. output level</span>
                {estimate.status !== 'live' && (
                  <span className="output-message">({estimate.message})</span>
                )}
                {estimate.notes.length > 0 && (
                  <span className="output-message">
                    ({estimate.notes.join('; ')})
                  </span>
                )}
              </div>
              <div className="level-meter" aria-hidden="true">
                {Array.from({ length: 20 }, (_, index) => (
                  <i
                    key={index}
                    className={
                      estimate.output !== null && index < estimate.output / 5
                        ? 'lit'
                        : ''
                    }
                  />
                ))}
              </div>
              <div className="pickup-summary">
                <span>Contributing pickups</span>
                <strong>
                  {estimate.activePickups
                    .map(
                      (id) =>
                        circuit.parts.find((part) => part.id === id)!.label,
                    )
                    .join(' + ') || 'None'}
                </strong>
              </div>
              {estimate.pickupTopology && (
                <div className="coil-summary">
                  <span>Pickup connection</span>
                  <strong data-testid="coil-topology">
                    {
                      {
                        single: 'Single pickup',
                        parallel: 'Parallel pickups',
                        series: 'Series pickups',
                        mixed: 'Mixed pickup network',
                      }[estimate.pickupTopology]
                    }
                  </strong>
                </div>
              )}
              {estimate.notes.map((note) => (
                <p className="warning-note" key={note}>
                  {note}
                </p>
              ))}
            </section>

            <section className="controls-card">
              <div className="section-label">
                {isEditing && selectedPart ? 'SELECTED PART' : 'ON THE GUITAR'}
                <span>↘</span>
              </div>
              {isEditing && selectedPart ? (
                <>
                  <h2>{selectedPart.label}</h2>
                  <label className="field-label">
                    Part label
                    <input
                      maxLength={40}
                      value={selectedPart.label}
                      onChange={(event) => {
                        if (event.target.value.trim())
                          updatePart(selectedPart.id, {
                            label: event.target.value,
                          });
                      }}
                    />
                  </label>
                  <PartControl
                    part={selectedPart}
                    update={(updates) => updatePart(selectedPart.id, updates)}
                  />
                  {flags.isExtendedPartsEnabled && (
                    <PickupOptions
                      part={selectedPart}
                      update={(updates) => updatePart(selectedPart.id, updates)}
                    />
                  )}
                  {selectedPart.kind === 'capacitor' && (
                    <label className="field-label">
                      Capacitance
                      <select
                        value={selectedPart.value}
                        onChange={(event) =>
                          updatePart(selectedPart.id, {
                            value: Number(event.target.value),
                          })
                        }
                      >
                        <option value={22}>22 nF</option>
                        <option value={47}>47 nF</option>
                      </select>
                    </label>
                  )}
                  <p className="control-hint">
                    Drag the part on the board. Keyboard: focus the part, then
                    use arrow keys.
                  </p>
                </>
              ) : (
                circuit.parts
                  .filter(
                    (part) =>
                      part.kind === 'selector' ||
                      isBladePart(part) ||
                      potRole(part) !== null ||
                      part.kind === 'varitone',
                  )
                  .map((part) => (
                    <PartControl
                      key={part.id}
                      part={part}
                      update={(updates) => updatePart(part.id, updates)}
                    />
                  ))
              )}
              {!circuit.parts.length && (
                <p className="control-hint">
                  Start with parts from the tray, then connect their labelled
                  terminals.
                </p>
              )}
              {isEditing && selection && (
                <button className="delete-button" onClick={deleteSelected}>
                  Remove selected {selection.kind}
                </button>
              )}
              {isEditing && pending && (
                <div className="pending-message" role="status">
                  Connecting from <strong>{pending}</strong>
                  <button onClick={() => setPending(null)}>
                    Cancel connection
                  </button>
                </div>
              )}
            </section>
            <section className="treble-card">
              <div>
                <span className="section-label">TREBLE CHARACTER</span>
                <strong data-testid="treble-level">
                  {estimate.treble === null ? '—' : `${estimate.treble}%`}
                </strong>
              </div>
              <div className="treble-track">
                <span style={{ width: `${estimate.treble ?? 0}%` }} />
              </div>
              <div className="treble-labels">
                <span>Warm</span>
                <span>Bright</span>
              </div>
              <p>
                <strong data-testid="tone-diversion">
                  {estimate.toneDiversion === null
                    ? '—'
                    : `${estimate.toneDiversion}%`}
                </strong>{' '}
                illustrative treble diverted
              </p>
              <p>
                Turquoise follows tone → capacitor; ground returns stay grey.
                Relative guide, not measured current; separate from output
                level.
              </p>
            </section>
            {estimate.varitone && <VaritoneCard estimate={estimate.varitone} />}
          </aside>
        </div>
        <div className="bench-notes">
          <p>
            <span>↳</span>
            {isEditing
              ? 'Click two terminals to connect. Select a part or wire to remove it. Escape cancels wiring.'
              : flags.isSignalFlowEnabled
                ? 'Orange: HOT. Blue: switched / series RETURN. Moving highlights follow contribution toward output, not current. Grey: permanent ground. Teal: tone. Purple: LC.'
                : 'Amber: pickup contribution. Teal glow: connected return paths, not current level. Ground connects only through wires to jack sleeve.'}
          </p>
          <span className="save-status" role="status">
            {saveMessage}
          </span>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <footer className="app-footer">
          <span>
            PICKUP LAB <b>/</b> AN OPEN WORKBENCH
          </span>
          <p>
            Educational approximation · linear volume, illustrative treble ·
            connections are real, glow is a guide.
          </p>
        </footer>
      </main>
    </div>
  );
}
