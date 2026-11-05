import {
  bladePosition,
  isPushPullPart,
  potRole,
  switchConnections,
  varitoneSettings,
  type Part,
  type SwitchPosition,
} from '../circuit/model';

export function PartControl({
  part,
  update,
}: {
  part: Part;
  update: (updates: Partial<Part>) => void;
}) {
  const positionNumber = bladePosition(part);
  if (part.kind === 'blade4')
    return (
      <div className="control-group">
        <div className="control-heading">
          <label>{part.label}</label>
          <span>4-WAY BLADE</span>
        </div>
        <div className="selector-buttons" role="group" aria-label={part.label}>
          {[1, 2, 3, 4].map((value) => (
            <button
              key={value}
              aria-pressed={part.value === value}
              className={part.value === value ? 'is-active' : ''}
              onClick={() => update({ value })}
            >
              Position {value}
            </button>
          ))}
        </div>
        <p className="control-hint">
          {switchConnections(part)
            .map(([from, to]) => `${from.split(':')[1]}–${to.split(':')[1]}`)
            .join('; ')}{' '}
          connected.
        </p>
      </div>
    );
  if (part.kind === 'varitone')
    return (
      <div className="control-group">
        <label className="field-label">
          {part.label}
          <select
            aria-label={`${part.label} position`}
            value={part.value}
            onChange={(event) => update({ value: Number(event.target.value) })}
          >
            {varitoneSettings.map((setting) => (
              <option key={setting.position} value={setting.position}>
                Position {setting.position} · {setting.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  if (part.kind === 'selector' || part.kind === 'blade')
    return (
      <div className="control-group">
        <div className="control-heading">
          <label>{part.label}</label>
          <span>{part.kind === 'blade' ? '3-WAY BLADE' : '3-WAY'}</span>
        </div>
        <div className="selector-buttons" role="group" aria-label={part.label}>
          {(['neck', 'both', 'bridge'] as SwitchPosition[]).map(
            (position, index) => (
              <button
                key={position}
                aria-pressed={part.position === position}
                className={part.position === position ? 'is-active' : ''}
                onClick={() => update({ position })}
              >
                {part.kind === 'blade'
                  ? `Position ${index + 1}`
                  : position[0]!.toUpperCase() + position.slice(1)}
              </button>
            ),
          )}
        </div>
        <p className="control-hint">
          {part.kind === 'blade'
            ? `Contacts AC–A${positionNumber} and BC–B${positionNumber} connected.`
            : part.position === 'both'
              ? 'Both pickups, wired in parallel.'
              : `${part.position === 'neck' ? 'Neck' : 'Bridge'} contact selected.`}
        </p>
      </div>
    );
  const role = potRole(part);
  if (!role) return null;
  return (
    <div className={`control-group ${role}-control`}>
      <div className="control-heading">
        <label htmlFor={`control-${part.id}`}>{part.label}</label>
        <output htmlFor={`control-${part.id}`}>
          {part.value}
          <span> / 10</span>
        </output>
      </div>
      <input
        id={`control-${part.id}`}
        type="range"
        min="0"
        max="10"
        step="1"
        value={part.value}
        onChange={(event) => update({ value: Number(event.target.value) })}
      />
      <div className="range-labels">
        <span>{role === 'tone' ? 'Warm' : 'Silent'}</span>
        <span>{role === 'tone' ? 'Bright' : 'Full'}</span>
      </div>
      {isPushPullPart(part) && (
        <>
          <div
            className="selector-buttons push-pull-buttons"
            role="group"
            aria-label={`${part.label} switch`}
          >
            {[false, true].map((isPulled) => (
              <button
                key={String(isPulled)}
                aria-pressed={Boolean(part.isPulled) === isPulled}
                className={
                  Boolean(part.isPulled) === isPulled ? 'is-active' : ''
                }
                onClick={() => update({ isPulled })}
              >
                {isPulled ? 'Pulled' : 'Pushed'}
              </button>
            ))}
          </div>
          <p className="control-hint">
            DPDT commons → {part.isPulled ? '2' : '1'}. Switch and knob are
            independent; wires determine the coil split.
          </p>
        </>
      )}
      {role === 'volume' && (
        <p className="control-hint">
          Linear teaching scale, not an audio-taper response.
        </p>
      )}
    </div>
  );
}
