import { useMemo } from 'react';
import type { Estimate } from '../circuit/analyze';
import {
  computeTruthTable,
  formatOutput,
  formatPickups,
  formatTreble,
} from '../circuit/truthTable';
import type { Circuit } from '../circuit/model';

const MAX_ROWS_DISPLAY = 64;

interface TruthTableDialogProps {
  circuit: Circuit;
}

export function TruthTableDialog({ circuit }: TruthTableDialogProps) {
  const table = useMemo(() => computeTruthTable(circuit), [circuit]);

  const statusStyle = (status: Estimate['status']) => {
    switch (status) {
      case 'live':
        return { color: '#2b79a2', label: 'Live' };
      case 'silent':
        return { color: '#7a7a6a', label: 'Silent' };
      case 'unavailable':
        return { color: '#505254', label: 'Unavailable' };
    }
  };

  return (
    <div className="bench-truth-table-panel">
      <p className="bench-details-intro">
        Every switch position in the current circuit, analysed one at a time.
        Output level follows the master volume setting; pickup selection changes
        with each switch position.
      </p>
      {table.truncated && (
        <p className="bench-truncated">
          Showing {MAX_ROWS_DISPLAY} of {table.totalCombinations} combinations.
          Reduce the number of switchable parts to see the full table.
        </p>
      )}
      {table.rows.length === 0 && (
        <p className="bench-no-switches">
          This circuit has no switchable parts (blade, selector, 4-way blade,
          varitone, or push-pull). There are no positions to enumerate.
        </p>
      )}
      {table.rows.length > 0 && (
        <div className="bench-table-wrap">
          <table
            className="bench-truth-table"
            aria-label="Switch position truth table"
          >
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Pickups</th>
                <th scope="col">Volume</th>
                <th scope="col">Tone</th>
                <th scope="col">Output</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => {
                const style = statusStyle(row.estimate.status);
                return (
                  <tr key={index} className="bench-truth-row">
                    <td data-label="Position">{row.positionLabel}</td>
                    <td data-label="Pickups">
                      {formatPickups(row.estimate, circuit)}
                    </td>
                    <td data-label="Volume">{formatOutput(row.estimate)}</td>
                    <td data-label="Tone">{formatTreble(row.estimate)}</td>
                    <td data-label="Output">{formatOutput(row.estimate)}</td>
                    <td data-label="Status">
                      <span
                        className="bench-status-badge"
                        style={{ color: style.color }}
                      >
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {table.rows.length > 0 &&
        table.rows.some((row) => row.estimate.notes.length > 0) && (
          <details className="bench-notes-details">
            <summary>Notes</summary>
            {table.rows.flatMap((row, index) =>
              row.estimate.notes.map((note) => (
                <p key={`${index}-${note}`}>
                  <strong>{row.positionLabel}:</strong> {note}
                </p>
              )),
            )}
          </details>
        )}
    </div>
  );
}
