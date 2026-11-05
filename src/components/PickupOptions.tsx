import type { Part, PartKind } from '../circuit/model';

export const pickupVariants: {
  kind: PartKind;
  skin: NonNullable<Part['skin']>;
  label: string;
}[] = [
  { kind: 'pickup', skin: 'p90', label: 'P90' },
  { kind: 'pickup', skin: 'dynasonic', label: 'DynaSonic' },
  { kind: 'humbucker', skin: 'filtertron', label: "Filter'Tron" },
  { kind: 'humbucker', skin: 'mini-humbucker', label: 'Mini-humbucker' },
];

export function PickupOptions({
  part,
  update,
}: {
  part: Part;
  update: (updates: Partial<Part>) => void;
}) {
  if (part.kind !== 'pickup' && part.kind !== 'humbucker') return null;
  return (
    <>
      <label className="field-label">
        Pickup appearance
        <select
          value={part.skin ?? ''}
          onChange={(event) =>
            update({ skin: (event.target.value || undefined) as Part['skin'] })
          }
        >
          <option value="">
            {part.kind === 'pickup' ? 'Single coil' : 'Humbucker'}
          </option>
          {pickupVariants
            .filter((variant) => variant.kind === part.kind)
            .map((variant) => (
              <option key={variant.skin} value={variant.skin}>
                {variant.label}
              </option>
            ))}
        </select>
      </label>
      {part.kind === 'humbucker' && (
        <p className="control-hint">
          Generic four-conductor model plus shield; actual leads vary by model.
        </p>
      )}
      {part.kind === 'pickup' && !part.hasSeparateShield && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={false}
            onChange={() => update({ hasSeparateShield: true })}
          />{' '}
          Add separate cover lead
        </label>
      )}
      {part.hasSeparateShield && (
        <p className="control-hint">
          Separate cover lead: SHIELD is independent of RETURN.
        </p>
      )}
    </>
  );
}
