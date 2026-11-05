import type { Estimate } from '../circuit/analyze';
import { varitoneInductanceHenries } from '../circuit/model';

export function VaritoneCard({
  estimate,
}: {
  estimate: NonNullable<Estimate['varitone']>;
}) {
  const position =
    estimate.frequencyHz === null
      ? null
      : Math.max(
          0,
          Math.min(
            100,
            (Math.log(estimate.frequencyHz / 200) / Math.log(5000 / 200)) * 100,
          ),
        );
  return (
    <section className="varitone-card" aria-label="Varitone notch band">
      <span className="section-label">NOTCH BAND · ILLUSTRATIVE</span>
      <h2 data-testid="varitone-state">
        {estimate.isBypassed
          ? 'Bypass'
          : !estimate.isConnected
            ? 'Disconnected'
            : estimate.level === 0
              ? 'Inactive'
              : 'Filter connected'}
      </h2>
      <div
        className="notch-track"
        data-testid="notch-band"
        data-level={estimate.level}
      >
        {position !== null && (
          <span
            style={{
              left: `${position}%`,
              opacity: estimate.level > 0 ? 1 : 0.35,
            }}
          />
        )}
      </div>
      <div className="treble-labels">
        <span>200 Hz</span>
        <span>1 kHz</span>
        <span>5 kHz</span>
      </div>
      <p>
        Ideal LC resonance:{' '}
        <strong data-testid="varitone-frequency">
          {estimate.frequencyHz === null
            ? '—'
            : `${Math.round(estimate.frequencyHz)} Hz`}
        </strong>
      </p>
      <p>
        {estimate.isBypassed
          ? 'Filter branch open; main signal path unchanged.'
          : `${varitoneInductanceHenries} H · ${estimate.capacitanceNanofarads} nF. Illustrative notch location, not measured response or depth.`}
      </p>
    </section>
  );
}
