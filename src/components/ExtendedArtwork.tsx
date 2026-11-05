import {
  varitoneInductanceHenries,
  varitoneSetting,
  type Part,
} from '../circuit/model';
import { labelScale, materialTransform } from './partGeometry';

export function PickupSkin({
  part,
  isActive,
  activeCoils,
}: {
  part: Part;
  isActive: boolean;
  activeCoils: ('a' | 'b')[];
}) {
  const isSingle = part.kind === 'pickup';
  const isMini = part.skin === 'mini-humbucker';
  const isP90 = part.skin === 'p90';
  const isDyna = part.skin === 'dynasonic';
  return (
    <g
      data-pickup-skin={part.skin}
      data-material="pickup"
      transform={materialTransform()}
    >
      <title>
        {isSingle
          ? `${part.label}: single coil`
          : `${part.label}: generic four-conductor model plus shield; actual leads vary`}
      </title>
      <rect
        x={isMini ? 24 : 12}
        y={isSingle ? 30 : 23}
        width={isMini ? 132 : 156}
        height={isSingle ? 56 : 70}
        rx={isP90 ? 7 : 12}
        fill={isP90 ? '#d2c49c' : 'url(#pickup-metal)'}
        stroke={isP90 ? '#847650' : '#a9b5b1'}
        strokeWidth="2"
      />
      {isP90 ? (
        <path d="M22 39H158M22 77H158" stroke="#a29168" />
      ) : (
        <rect
          x={isMini ? 31 : 21}
          y={isSingle ? 37 : 30}
          width={isMini ? 118 : 138}
          height={isSingle ? 42 : 56}
          rx="7"
          fill={isDyna ? '#293235' : '#687573'}
          stroke="#b2b9ae"
        />
      )}
      {(isSingle ? (['a'] as const) : (['a', 'b'] as const)).map(
        (coil, row) => {
          const active = isSingle ? isActive : activeCoils.includes(coil);
          const y = isSingle ? 58 : 46 + row * 23;
          return (
            <g key={coil} data-coil={coil} data-active={active}>
              {isMini && row === 1 ? (
                <rect
                  x="40"
                  y={y - 4}
                  width="100"
                  height="8"
                  rx="3"
                  fill={active ? '#e5b870' : '#b0b8b2'}
                />
              ) : (
                Array.from({ length: 6 }, (_, index) => {
                  const x = (isMini ? 40 : 35) + index * (isMini ? 20 : 22);
                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isDyna ? 7 : 5}
                        fill={active ? '#e5b870' : '#b4bcb5'}
                        stroke="#475450"
                      />
                      <path d={`M${x - 3} ${y}h6`} stroke="#47504c" />
                      {isDyna && <circle cx={x} cy="76" r="2" fill="#d5d9c8" />}
                    </g>
                  );
                })
              )}
            </g>
          );
        },
      )}
      <circle cx={isMini ? 28 : 17} cy="58" r="2" fill="#263032" />
      <circle cx={isMini ? 152 : 163} cy="58" r="2" fill="#263032" />
      {part.skin === 'filtertron' && (
        <path
          d="M25 35H155M25 82H155M29 32V85M151 32V85"
          fill="none"
          stroke="#d5d9c8"
          strokeWidth="3"
        />
      )}
    </g>
  );
}

export function VaritoneArtwork({
  part,
  level,
}: {
  part: Part;
  level: number;
}) {
  const setting = varitoneSetting(part);
  return (
    <g data-testid={`varitone-art-${part.id}`} data-level={level}>
      <g data-material="varitone" transform={materialTransform(90, 55)}>
        <circle
          cx="90"
          cy="55"
          r="49"
          fill="#b5a2e3"
          opacity={level * 0.3}
          filter="url(#wire-glow)"
        />
        <circle
          cx="90"
          cy="55"
          r="43"
          fill="url(#knob-metal)"
          stroke="#a9a0bb"
          strokeWidth="2"
        />
        {[1, 2, 3, 4, 5, 6].map((position) => (
          <path
            key={position}
            d="M90 17v6"
            stroke={position === part.value ? '#d8c6ff' : '#65716e'}
            strokeWidth="3"
            transform={`rotate(${-135 + (position - 1) * 54} 90 55)`}
          />
        ))}
        <circle cx="90" cy="55" r="29" fill="#252c34" stroke="#131a21" />
        <path
          d="M90 31v10"
          stroke="#d8c6ff"
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${-135 + (part.value - 1) * 54} 90 55)`}
        />
      </g>
      <text
        transform={`translate(90 70) scale(${labelScale})`}
        textAnchor="middle"
        className="knob-number"
      >
        {part.value}
      </text>
      <path
        d="M24 112V98H47q0 -12 7 -12t7 12q0 -12 7 -12t7 12H105M105 88v20M113 88v20M113 98H156v14"
        fill="none"
        stroke="#b1a3cd"
        strokeWidth="2"
      />
      <text
        x="24"
        y="80"
        textAnchor="middle"
        className="coil-label"
        style={{ fontSize: 10 * labelScale }}
      >
        {varitoneInductanceHenries} H
      </text>
      <text
        x="156"
        y="80"
        textAnchor="middle"
        className="coil-label"
        style={{ fontSize: 10 * labelScale }}
      >
        {setting.capacitanceNanofarads === null
          ? 'OPEN'
          : `${setting.capacitanceNanofarads}nF`}
      </text>
    </g>
  );
}
