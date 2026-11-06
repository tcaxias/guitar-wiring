import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  board,
  bladePosition,
  isBladePart,
  isPushPullPart,
  potRole,
  partScale,
  switchConnections,
  terminalId,
  terminalsFor,
  type Circuit,
  type Part,
} from '../circuit/model';
import type { Estimate } from '../circuit/analyze';
import {
  clampPosition,
  labelScale,
  materialTransform,
  partStateY,
  partTitleY,
  terminalHitRadius,
  terminalLeadPath,
} from './partGeometry';
import { wirePath, wireRoutes } from './wireRouting';
import { closestVisibleWire, wireDrawings, wireOrder } from './wireGeometry';
import { flags } from '../flags';
import { groundPresentation } from './groundPresentation';

// Draws a growing arc along the inner knob ring from the minimum-value
// position to the current position, so the knob shows how far it's turned.
const knobArcPath = (value: number) => {
  const cx = 90;
  const cy = 58;
  const r = 26;
  const startDeg = -135;
  const endDeg = startDeg + value * 27;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const startX = cx + r * Math.sin(rad(startDeg));
  const startY = cy - r * Math.cos(rad(startDeg));
  const endX = cx + r * Math.sin(rad(endDeg));
  const endY = cy - r * Math.cos(rad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  if (value <= 0) return `M${startX} ${startY}`;
  return `M${startX} ${startY} A${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
};
import {
  signalFlowDirections,
  signalWireRoles,
  wireRoleColors,
} from './signalPresentation';
import { PickupSkin, VaritoneArtwork } from './ExtendedArtwork';

export type Selection = { kind: 'part' | 'wire'; id: string } | null;
interface BoardProps {
  circuit: Circuit;
  estimate: Estimate;
  isEditing: boolean;
  selection: Selection;
  pending: string | null;
  onSelect: (selection: Selection) => void;
  onTerminal: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  compactAnnotations?: boolean;
  showAllLabels?: boolean;
  showGroundWiring?: boolean;
  onTraceChange?: (message: string) => void;
  onKeyboardSelect?: () => void;
  onUpdate?: (id: string, updates: Partial<Part>) => void;
}

function PartArtwork({
  part,
  isActive,
  activeCoils,
  capacitorLevel,
  varitoneLevel,
  groundState,
}: {
  part: Part;
  isActive: boolean;
  activeCoils: ('a' | 'b')[];
  capacitorLevel: number;
  varitoneLevel: number;
  groundState?: Estimate['groundNodes'][string];
}) {
  if ((part.kind === 'pickup' || part.kind === 'humbucker') && part.skin)
    return (
      <PickupSkin part={part} isActive={isActive} activeCoils={activeCoils} />
    );
  if (part.kind === 'varitone')
    return <VaritoneArtwork part={part} level={varitoneLevel} />;
  if (part.kind === 'pickup' || part.kind === 'humbucker')
    return (
      <>
        <g data-material="pickup" transform={materialTransform()}>
          <rect
            x="12"
            y={part.kind === 'pickup' ? 32 : 23}
            width="156"
            height={part.kind === 'pickup' ? 52 : 70}
            rx="13"
            fill="url(#pickup-metal)"
            stroke="#748080"
          />
          <rect
            x="22"
            y={part.kind === 'pickup' ? 40 : 31}
            width="136"
            height={part.kind === 'pickup' ? 36 : 54}
            rx="9"
            fill="#20272a"
            stroke="#101416"
          />
          {(part.kind === 'pickup'
            ? (['a'] as const)
            : (['a', 'b'] as const)
          ).map((coil, row) => (
            <g
              key={coil}
              data-coil={coil}
              data-active={
                part.kind === 'humbucker'
                  ? activeCoils.includes(coil)
                  : isActive
              }
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <g key={index}>
                  <circle
                    cx={36 + index * 22}
                    cy={part.kind === 'pickup' ? 58 : 46 + row * 23}
                    r="5"
                    fill={
                      (
                        part.kind === 'humbucker'
                          ? activeCoils.includes(coil)
                          : isActive
                      )
                        ? '#e5b870'
                        : '#8b9695'
                    }
                  />
                  {part.kind === 'humbucker' && row === 0 && (
                    <path d={`M${33 + index * 22} 46h6`} stroke="#3c4447" />
                  )}
                </g>
              ))}
            </g>
          ))}
          <circle cx="16" cy="58" r="2" fill="#11191b" />
          <circle cx="164" cy="58" r="2" fill="#11191b" />
        </g>
        {part.kind === 'humbucker' && (
          <>
            <text
              x="16"
              y="49"
              textAnchor="middle"
              className="coil-label"
              style={{ fontSize: 9 * labelScale }}
            >
              A
            </text>
            <text
              x="16"
              y="72"
              textAnchor="middle"
              className="coil-label"
              style={{ fontSize: 9 * labelScale }}
            >
              B
            </text>
          </>
        )}
      </>
    );
  if (potRole(part)) {
    return (
      <>
        <g data-material="pot" transform={materialTransform()}>
          <rect
            x="37"
            y="18"
            width="106"
            height="84"
            rx="25"
            fill="#687271"
            stroke="#a0aaa0"
          />
          <circle cx="90" cy="58" r="47" fill="#11171a" stroke="#414b4e" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
            <path
              key={index}
              d="M90 15v4"
              stroke={
                index <= part.value
                  ? potRole(part) === 'tone'
                    ? '#78c6c1'
                    : '#e5b870'
                  : '#465052'
              }
              strokeWidth="2"
              transform={`rotate(${-135 + index * 27} 90 58)`}
            />
          ))}
        </g>
        <g
          data-testid={`pot-cap-${part.id}`}
          transform={
            isPushPullPart(part) && part.isPulled
              ? 'translate(0 -14)'
              : undefined
          }
        >
          <g data-material="pot-cap" transform={materialTransform()}>
            <circle
              cx="90"
              cy="58"
              r="34"
              fill="url(#knob-metal)"
              stroke="#677174"
            />
            <circle cx="90" cy="58" r="26" fill="#212a2e" stroke="#101618" />
            <path
              d={knobArcPath(part.value)}
              stroke={potRole(part) === 'tone' ? '#78c6c1' : '#e5b870'}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <text
            transform={`translate(90 71) scale(${labelScale})`}
            textAnchor="middle"
            className={`knob-number knob-number-${potRole(part)}`}
          >
            {part.value}
          </text>
        </g>
        <path d="M90 92V99" stroke="#9d9980" strokeWidth="3" />
        <rect
          x="14"
          y="96"
          width="152"
          height="10"
          rx="3"
          fill="#67513a"
          stroke="#a28a62"
        />
        {isPushPullPart(part) && (
          <>
            <title>
              Independent push-pull DPDT switch. Commons connect to 1 pushed, 2
              pulled.
            </title>
            <rect
              data-material="push-pull"
              transform={materialTransform(90, 204)}
              x="30"
              y="154"
              width="120"
              height="100"
              rx="5"
              fill="#684b33"
              stroke="#ac8c63"
            />
            <path d="M90 106V164" stroke="#b2b8a9" strokeWidth="7" />
            {switchConnections(part).map(([from, to]) => {
              const start = terminalsFor(part).find(
                (terminal) => terminalId(part, terminal.name) === from,
              )!;
              const end = terminalsFor(part).find(
                (terminal) => terminalId(part, terminal.name) === to,
              )!;
              return (
                <path
                  key={from}
                  data-contact={`${from} ${to}`}
                  d={`M${start.x} ${start.y}H${start.exit === 'left' ? 45 : 135}V${end.y}H${end.x}`}
                  fill="none"
                  stroke="#d9c59e"
                  strokeWidth="3"
                />
              );
            })}
          </>
        )}
      </>
    );
  }
  if (isBladePart(part)) {
    const angle =
      part.kind === 'blade4'
        ? -36 + (bladePosition(part) - 1) * 24
        : -32 + (bladePosition(part) - 1) * 32;
    return (
      <>
        <title>
          Open-frame blade switch. Generic logical lug layout, not a
          manufacturer pin map.
        </title>
        <g data-material="blade" transform={materialTransform(90, 55)}>
          <path
            d="M38 43H142L153 66Q143 100 90 101Q37 100 27 66Z"
            fill="#69402c"
            stroke="#b17d4c"
            strokeWidth="2"
          />
          <path
            d="M43 49H137L144 66Q129 91 90 92Q51 91 36 66Z"
            fill="#8b5737"
            stroke="#432c25"
          />
          <path
            d="M51 58Q90 106 129 58M55 61L46 82M125 61L134 82"
            fill="none"
            stroke="#bf9c64"
            strokeWidth="3"
          />
          <path
            d="M34 42V65L48 76M146 42V65L132 76"
            fill="none"
            stroke="#9ca69e"
            strokeWidth="5"
          />
          <path
            d="M32 35H148L152 39V45H133V42H47V45H28V39Z"
            fill="url(#pickup-metal)"
            stroke="#b7c1b6"
          />
          {[38, 142].map((x) => (
            <ellipse
              key={x}
              cx={x}
              cy="40"
              rx="5"
              ry="2.5"
              fill="#182226"
              stroke="#d5dbca"
            />
          ))}
          <g
            data-testid={`blade-lever-${part.id}`}
            transform={`rotate(${angle} 90 55)`}
          >
            <path
              d="M86 58L87 12H93L94 58Z"
              fill="url(#screw-metal)"
              stroke="#d4dbce"
            />
            <path
              d="M84 17L82 1Q90 -3 98 1L96 17Z"
              fill="#eee2bf"
              stroke="#9a8d70"
              strokeWidth="1.5"
            />
            <path d="M86 2L87 13" stroke="#fff6dc" strokeWidth="2" />
          </g>
          <circle
            cx="90"
            cy="55"
            r="8"
            fill="url(#screw-metal)"
            stroke="#444f4c"
          />
          <circle cx="90" cy="55" r="2.5" fill="#465350" />
          {[48, 132].map((x) => (
            <circle
              key={x}
              cx={x}
              cy="76"
              r="3"
              fill="#d5c391"
              stroke="#49392a"
            />
          ))}
        </g>
        {[12, 164].map((x) => (
          <rect
            key={x}
            x={x}
            y="16"
            width="4"
            height={part.kind === 'blade4' ? 168 : 128}
            fill="#795137"
            stroke="#ab8050"
          />
        ))}
        {switchConnections(part).map(([from, to]) => {
          const start = terminalsFor(part).find(
            (terminal) => terminalId(part, terminal.name) === from,
          )!;
          const end = terminalsFor(part).find(
            (terminal) => terminalId(part, terminal.name) === to,
          )!;
          return (
            <path
              key={from}
              data-contact={`${from} ${to}`}
              className="blade-contact"
              d={`M${start.x} ${start.y} H${start.exit === 'left' ? 24 : 156} V${end.y} H${end.x}`}
              fill="none"
              stroke="#a8b6b2"
              strokeWidth="1.5"
            />
          );
        })}
      </>
    );
  }
  if (part.kind === 'selector')
    return (
      <g data-material="selector" transform={materialTransform()}>
        <rect
          x="30"
          y="20"
          width="120"
          height="76"
          rx="25"
          fill="url(#pickup-metal)"
          stroke="#687574"
        />
        <rect
          x="51"
          y="49"
          width="78"
          height="18"
          rx="9"
          fill="#12191c"
          stroke="#707c7b"
        />
        <path
          d={`M${part.position === 'neck' ? 61 : part.position === 'bridge' ? 119 : 90} 58v-22`}
          stroke="#c2c8c0"
          strokeWidth="8"
        />
        <rect
          x={
            part.position === 'neck'
              ? 49
              : part.position === 'bridge'
                ? 107
                : 78
          }
          y="22"
          width="24"
          height="29"
          rx="8"
          fill="#e9dfc3"
          stroke="#9b947f"
        />
        <circle cx="40" cy="58" r="3" fill="#354043" />
        <circle cx="140" cy="58" r="3" fill="#354043" />
      </g>
    );
  if (part.kind === 'capacitor')
    return (
      <>
        <rect
          data-testid={`capacitor-halo-${part.id}`}
          transform={materialTransform(90, 60)}
          data-level={capacitorLevel}
          x="47"
          y="26"
          width="86"
          height="68"
          rx="18"
          fill="#6fe0cc"
          opacity={capacitorLevel * 0.65}
          filter="url(#wire-glow)"
        />
        <path
          d="M30 112V60h120v52"
          fill="none"
          stroke="#919e9c"
          strokeWidth="3"
        />
        <rect
          data-material="capacitor"
          transform={materialTransform(90, 60)}
          x="55"
          y="34"
          width="70"
          height="52"
          rx="13"
          fill="#ba7041"
          stroke="#e9a86f"
        />
        <path
          transform={materialTransform(90, 60)}
          d="M65 36v48"
          stroke="#724328"
          strokeWidth="5"
        />
        <rect
          x="67"
          transform={materialTransform(90, 60)}
          y="72"
          width={48 * capacitorLevel}
          height="18"
          rx="3"
          fill="#a3f4dc"
        />
        <text
          transform={`translate(94 59) scale(${labelScale})`}
          textAnchor="middle"
          className="capacitor-number"
        >
          {part.value}nF
        </text>
        <text
          transform={`translate(94 76) scale(${labelScale})`}
          textAnchor="middle"
          className="capacitor-small"
        >
          FILM
        </text>
      </>
    );
  if (part.kind === 'ground')
    return (
      <g
        data-testid={`ground-symbol-${part.id}`}
        data-active={groundState?.isActive ?? false}
      >
        <title>
          Signal return junction. Requires an explicit wire to jack sleeve; not
          mains earth.
        </title>
        <path
          d="M24 112V30H90V55"
          fill="none"
          stroke="var(--wire-ground, #999999)"
          strokeWidth="3"
        />
        <g data-material="ground" transform={materialTransform(90, 55)}>
          <path
            d="M60 55H120M70 69H110M80 83H100"
            fill="none"
            stroke={
              groundState?.isActive
                ? 'var(--wire-ground-active, #cccccc)'
                : 'var(--wire-ground, #999999)'
            }
            strokeWidth="5"
            strokeLinecap="round"
          />
          {groundState?.isActive && (
            <path
              d="M90 30V55M60 55H120M70 69H110M80 83H100"
              fill="none"
              stroke="var(--wire-ground-active, #cccccc)"
              strokeWidth="10"
              opacity="0.6"
              filter="url(#wire-glow)"
            />
          )}
        </g>
      </g>
    );
  return (
    <g data-material="jack" transform={materialTransform(90, 60)}>
      <path
        d="M90 18l37 21v42l-37 21-37-21V39Z"
        fill="url(#pickup-metal)"
        stroke="#929e9d"
      />
      <circle
        cx="90"
        cy="60"
        r="27"
        fill="#182022"
        stroke="#abb5ae"
        strokeWidth="5"
      />
      <circle
        cx="90"
        cy="60"
        r="18"
        fill="#090e10"
        stroke="#5d6969"
        strokeWidth="4"
      />
      <path
        d="M78 48a17 17 0 0 1 24 0"
        fill="none"
        stroke="#ced4ca"
        strokeWidth="2"
      />
    </g>
  );
}

export function Board({
  circuit,
  estimate,
  isEditing,
  selection,
  pending,
  onSelect,
  onTerminal,
  onMove,
  compactAnnotations = false,
  showAllLabels = false,
  showGroundWiring = true,
  onTraceChange,
  onKeyboardSelect,
  onUpdate,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isClear = flags.isClearWiringEnabled;
  const groundView = useMemo(() => groundPresentation(circuit), [circuit]);
  const signalRoles = useMemo(
    () => (flags.isSignalFlowEnabled ? signalWireRoles(circuit) : {}),
    [circuit],
  );
  const signalDirections = useMemo(
    () =>
      flags.isSignalFlowEnabled ? signalFlowDirections(circuit, estimate) : {},
    [circuit, estimate],
  );
  const hasGroundPresentation =
    compactAnnotations && flags.isCompactGroundEnabled;
  const isGroundWire = (id: string) =>
    flags.isSignalFlowEnabled || hasGroundPresentation
      ? groundView.groundWires.has(id)
      : estimate.groundWires.includes(id);
  const pickupTerminals = new Set(
    circuit.parts
      .filter((part) => part.kind === 'pickup' || part.kind === 'humbucker')
      .flatMap((part) =>
        terminalsFor(part).map((terminal) => terminalId(part, terminal.name)),
      ),
  );
  const visibleWires = circuit.wires.filter(
    (wire) => showGroundWiring || !groundView.hiddenWires.has(wire.id),
  );
  const orderedWires = isClear
    ? [...visibleWires].sort(wireOrder)
    : visibleWires;
  const [hovered, setHovered] = useState<{
    id: string;
    circuit: Circuit;
    isEditing: boolean;
  } | null>(null);
  const [focused, setFocused] = useState<{
    id: string;
    circuit: Circuit;
    isEditing: boolean;
  } | null>(null);
  useEffect(() => {
    // Hover may be on the board while keyboard focus is still on a control.
    const clearPreview = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHovered(null);
        setFocused(null);
      }
    };
    window.addEventListener('keydown', clearPreview);
    return () => window.removeEventListener('keydown', clearPreview);
  }, []);
  // A removed hover target must not mask keyboard focus on a remaining wire.
  const temporary = [hovered, focused].find(
    (preview) => preview && visibleWires.some((wire) => wire.id === preview.id),
  );
  const traceId =
    temporary?.circuit === circuit && temporary.isEditing === isEditing
      ? temporary.id
      : selection?.kind === 'wire'
        ? selection.id
        : null;
  const tracedWire = visibleWires.find((wire) => wire.id === traceId);
  const traceColor =
    tracedWire && flags.isSignalFlowEnabled
      ? wireRoleColors[signalRoles[tracedWire.id] ?? 'unknown']
      : tracedWire && isGroundWire(tracedWire.id)
        ? 'var(--wire-ground-active, #cccccc)'
        : tracedWire &&
            hasGroundPresentation &&
            (pickupTerminals.has(tracedWire.from) ||
              pickupTerminals.has(tracedWire.to) ||
              estimate.groundWires.includes(tracedWire.id))
          ? 'var(--wire-pickup, #5c7a3d)'
          : 'var(--wire-selection, #f4e3bf)';
  const endpointLabel = (id: string) => {
    for (const part of circuit.parts) {
      const terminal = terminalsFor(part).find(
        (terminal) => terminalId(part, terminal.name) === id,
      );
      if (terminal) return `${part.label} · ${terminal.label}`;
    }
    return 'Unknown terminal';
  };
  const clearTrace = () => {
    setHovered(null);
    setFocused(null);
    onSelect(null);
  };
  const traceMessage = tracedWire
    ? `${endpointLabel(tracedWire.from)} ↔ ${endpointLabel(tracedWire.to)}`
    : '';
  useEffect(() => {
    onTraceChange?.(traceMessage);
  }, [onTraceChange, traceMessage]);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const visibleCircuit = useMemo(
    () => ({
      ...circuit,
      parts: circuit.parts.map((part) => ({
        ...part,
        ...clampPosition(
          part,
          part.id === drag?.id ? drag.x : part.x,
          part.id === drag?.id ? drag.y : part.y,
        ),
      })),
    }),
    [circuit, drag],
  );
  // Keep the entire physical circuit in routing, even when ground is hidden.
  // Control values, trace, theme and visibility must not rebuild route occupancy.
  const geometryKey = JSON.stringify({
    parts: visibleCircuit.parts.map((part) => ({
      id: part.id,
      kind: part.kind,
      x: part.x,
      y: part.y,
      hasSeparateShield: part.hasSeparateShield,
    })),
    wires: [...visibleCircuit.wires].sort(wireOrder),
    groundWires: isClear ? [] : estimate.groundWires,
  });
  const routes = useMemo(() => {
    const input = JSON.parse(geometryKey) as Circuit & {
      groundWires: string[];
    };
    return wireRoutes(input, input.groundWires, { clear: isClear });
  }, [geometryKey, isClear]);
  const visibilityKey = JSON.stringify(
    showGroundWiring ? [] : [...groundView.hiddenWires],
  );
  const { drawings, visibleRoutes } = useMemo(() => {
    const ids = new Set<string>(JSON.parse(visibilityKey));
    const input = JSON.parse(geometryKey) as Circuit;
    const visibleRoutes = new Map([...routes].filter(([id]) => !ids.has(id)));
    // Hidden wires must neither cut crossing gaps nor become fallback pick targets.
    return {
      visibleRoutes,
      drawings: isClear
        ? wireDrawings(
            {
              ...input,
              wires: input.wires.filter((wire) => !ids.has(wire.id)),
            },
            visibleRoutes,
          )
        : new Map(),
    };
  }, [geometryKey, visibilityKey, routes, isClear]);
  const coordinates = (event: { clientX: number; clientY: number }) => {
    const matrix = svgRef.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : { x: 0, y: 0 };
  };
  const pickedWire = (
    event: { clientX: number; clientY: number },
    fallback: string,
  ) =>
    isClear
      ? closestVisibleWire(coordinates(event), drawings, 8, visibleRoutes)
      : fallback;
  const previewWire = (event: PointerEvent<SVGGElement>, fallback: string) => {
    const id = pickedWire(event, fallback);
    setHovered((previous) =>
      previous?.id === id &&
      previous.circuit === circuit &&
      previous.isEditing === isEditing
        ? previous
        : id
          ? { id, circuit, isEditing }
          : null,
    );
  };
  const startDrag = (event: PointerEvent<SVGGElement>, part: Part) => {
    if (!isEditing || event.button !== 0) return;
    const point = coordinates(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect({ kind: 'part', id: part.id });
    setDrag({
      id: part.id,
      startX: point.x,
      startY: point.y,
      x: part.x,
      y: part.y,
      originX: part.x,
      originY: part.y,
    });
  };
  const moveDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = coordinates(event);
    setDrag({
      ...drag,
      ...clampPosition(
        circuit.parts.find((part) => part.id === drag.id)!,
        drag.originX + point.x - drag.startX,
        drag.originY + point.y - drag.startY,
      ),
    });
  };
  const endDrag = () => {
    if (drag) onMove(drag.id, drag.x, drag.y);
    setDrag(null);
  };
  const partKey = (event: KeyboardEvent<SVGGElement>, part: Part) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect({ kind: 'part', id: part.id });
      onKeyboardSelect?.();
    }
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
    };
    const direction = delta[event.key];
    if (isEditing && direction) {
      event.preventDefault();
      const point = clampPosition(
        part,
        part.x + direction[0],
        part.y + direction[1],
      );
      onMove(part.id, point.x, point.y);
    } else if (!isEditing && onUpdate && direction) {
      event.preventDefault();
      const role = potRole(part);
      if (role === 'volume' || role === 'tone') {
        const deltaValue = direction[1] > 0 ? -1 : 1;
        const newValue = Math.max(0, Math.min(10, part.value + deltaValue));
        onUpdate(part.id, { value: newValue });
      } else if (isBladePart(part)) {
        if (part.kind === 'blade4') {
          const deltaPos = direction[0] > 0 ? 1 : -1;
          const newValue = Math.max(
            1,
            Math.min(4, (part.value ?? 1) + deltaPos),
          );
          onUpdate(part.id, { value: newValue });
        } else {
          const positions = ['neck', 'both', 'bridge'] as const;
          const current = part.position ?? 'neck';
          const currentIndex = positions.indexOf(current);
          const deltaPos = direction[0] > 0 ? 1 : -1;
          const newIndex = (currentIndex + deltaPos + 3) % 3;
          onUpdate(part.id, { position: positions[newIndex] });
        }
      } else if (part.kind === 'varitone') {
        const deltaPos = direction[0] > 0 ? 1 : -1;
        const newValue = Math.max(1, Math.min(6, (part.value ?? 1) + deltaPos));
        onUpdate(part.id, { value: newValue });
      } else if (isPushPullPart(part)) {
        onUpdate(part.id, { isPulled: !part.isPulled });
      }
    }
  };

  return (
    <div className="board-scroll">
      <svg
        ref={svgRef}
        className={`circuit-board ${isEditing ? 'is-editing' : ''} ${isClear ? 'clear-wiring' : ''}`}
        viewBox={`0 0 ${board.width} ${board.height}`}
        aria-label="Guitar wiring workbench"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') clearTrace();
        }}
      >
        <defs>
          <pattern
            id="board-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="1"
              fill="var(--canvas-grid, #3b484c)"
              opacity="0.55"
            />
          </pattern>
          <linearGradient id="pickup-metal" x2="0.3" y2="1">
            <stop stopColor="#a5b0aa" />
            <stop offset="0.45" stopColor="#515e60" />
            <stop offset="0.52" stopColor="#899592" />
            <stop offset="1" stopColor="#38464a" />
          </linearGradient>
          <radialGradient id="knob-metal">
            <stop stopColor="#778180" />
            <stop offset="0.8" stopColor="#354145" />
            <stop offset="1" stopColor="#182226" />
          </radialGradient>
          <linearGradient id="screw-metal">
            <stop stopColor="#e3e1cc" />
            <stop offset="1" stopColor="#65706a" />
          </linearGradient>
          <filter id="wire-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="lead-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
        <rect
          width={board.width}
          height={board.height}
          fill="url(#board-grid)"
          onClick={clearTrace}
        />
        {!compactAnnotations && (
          <text x="30" y="35" className="board-annotation">
            PASSIVE CIRCUIT / {isEditing ? 'EDITABLE LAYOUT' : 'SIGNAL VIEW'}
          </text>
        )}
        {orderedWires.map((wire) => {
          const isGround = isGroundWire(wire.id);
          const isPickupLead =
            hasGroundPresentation &&
            !isGround &&
            (pickupTerminals.has(wire.from) ||
              pickupTerminals.has(wire.to) ||
              estimate.groundWires.includes(wire.id));
          const isTone = estimate.toneWires.includes(wire.id);
          const level = estimate.wireLevels[wire.id] ?? 0;
          const toneLevel = estimate.toneWireLevels[wire.id] ?? 0;
          const varitoneLevel = estimate.varitoneWireLevels[wire.id] ?? 0;
          const groundLevel = estimate.groundWireLevels[wire.id] ?? 0;
          const hasGroundActivity = isGround && groundLevel > 0;
          const isSelected = traceId === wire.id;
          const centerline = wirePath(routes.get(wire.id)!);
          const path = isClear ? drawings.get(wire.id)!.path : centerline;
          const signalRole = signalRoles[wire.id];
          const direction = signalDirections[wire.id];
          const hasSignalFlow =
            flags.isSignalFlowEnabled &&
            (signalRole === 'hot' || signalRole === 'return') &&
            level > 0 &&
            direction !== undefined;
          // Analyzer filter paths may share the pickup bus. Keep those shared
          // wires HOT/RETURN; filter effects belong to their own spurs/ground.
          const hasToneFlow =
            toneLevel > 0 &&
            (!flags.isSignalFlowEnabled || signalRole === 'tone' || isGround);
          const hasVaritoneFlow =
            varitoneLevel > 0 &&
            (!flags.isSignalFlowEnabled || signalRole === 'lc' || isGround);
          const color = flags.isSignalFlowEnabled
            ? wireRoleColors[signalRole ?? 'unknown']
            : isGround
              ? 'var(--wire-ground, #999999)'
              : isTone
                ? 'var(--wire-tone, #8dbdb8)'
                : level > 0
                  ? 'var(--wire-signal, #f2b95f)'
                  : isPickupLead
                    ? 'var(--wire-pickup, #5c7a3d)'
                    : 'var(--wire-inactive, #647075)';
          return (
            <g
              key={wire.id}
              data-wire-id={wire.id}
              data-from={wire.from}
              data-to={wire.to}
              data-tone-level={toneLevel}
              data-varitone-level={varitoneLevel}
              data-ground-level={groundLevel}
              data-wire-role={signalRole}
              className={`wire ${isSelected ? 'selected-wire' : tracedWire ? 'dimmed-wire' : ''}`}
              role="button"
              aria-label={`Wire ${endpointLabel(wire.from)} ↔ ${endpointLabel(wire.to)}`}
              aria-pressed={
                selection?.kind === 'wire' && selection.id === wire.id
              }
              tabIndex={0}
              onPointerEnter={(event) => previewWire(event, wire.id)}
              onPointerMove={(event) => previewWire(event, wire.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setFocused({ id: wire.id, circuit, isEditing })}
              onBlur={() => setFocused(null)}
              onClick={(event) => {
                const id =
                  event.detail === 0 ? wire.id : pickedWire(event, wire.id);
                if (id) {
                  onSelect({ kind: 'wire', id });
                  if (id !== wire.id)
                    svgRef.current
                      ?.querySelector<SVGGElement>(
                        `[data-wire-id="${CSS.escape(id)}"]`,
                      )
                      ?.focus({ preventScroll: true });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect({ kind: 'wire', id: wire.id });
                }
              }}
            >
              <g className="wire-visuals">
                {level > 0 && (
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinejoin="round"
                    filter="url(#lead-glow)"
                    opacity={level * (isClear ? 0.12 : 0.2)}
                  />
                )}
                {!isClear && (
                  <path
                    d={path}
                    className="wire-outline"
                    fill="none"
                    stroke={
                      isSelected ? traceColor : 'var(--wire-underpass, #11181b)'
                    }
                    strokeWidth={isSelected ? 8 : 7}
                    strokeLinejoin="round"
                  />
                )}
                {hasGroundActivity && (
                  <path
                    className="ground-glow"
                    d={path}
                    fill="none"
                    stroke="var(--wire-ground-active, #cccccc)"
                    strokeWidth="5"
                    strokeLinejoin="round"
                    filter="url(#lead-glow)"
                    opacity={isClear ? 0.12 : 0.25}
                  />
                )}
                <path
                  d={path}
                  className="wire-base"
                  fill="none"
                  stroke={
                    hasGroundActivity
                      ? 'var(--wire-ground-active, #cccccc)'
                      : color
                  }
                  strokeWidth="3"
                  strokeDasharray={isGround ? '7 5' : undefined}
                  strokeLinejoin="round"
                  opacity={
                    hasGroundActivity
                      ? 1
                      : flags.isSignalFlowEnabled &&
                          (signalRole === 'hot' || signalRole === 'return') &&
                          wire.id in estimate.wireLevels
                        ? 0.35 + level * 0.25
                        : level > 0
                          ? 0.3 + level * 0.7
                          : 0.65
                  }
                />
                {hasSignalFlow && (
                  <path
                    d={path}
                    className={`signal-flow signal-flow-${direction}`}
                    aria-hidden="true"
                    pointerEvents="none"
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray="4 13"
                    strokeLinejoin="round"
                    opacity={0.25 + level * 0.75}
                  />
                )}
                {hasToneFlow && (
                  <>
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        isGround
                          ? 'var(--wire-ground-active, #c2c2c2)'
                          : 'var(--wire-tone, #65e4d1)'
                      }
                      strokeWidth="5"
                      strokeLinejoin="round"
                      filter="url(#lead-glow)"
                      opacity={toneLevel * (isClear ? 0.12 : 0.25)}
                    />
                    <path
                      d={path}
                      className="tone-flow"
                      fill="none"
                      stroke={
                        isGround
                          ? 'var(--wire-ground-active, #c2c2c2)'
                          : 'var(--wire-tone, #9af4df)'
                      }
                      strokeWidth="3"
                      strokeDasharray="4 13"
                      strokeLinejoin="round"
                      opacity={0.25 + toneLevel * 0.75}
                    />
                  </>
                )}
                {hasVaritoneFlow && (
                  <path
                    d={path}
                    className="varitone-flow"
                    fill="none"
                    stroke={
                      isGround
                        ? 'var(--wire-ground-active, #c2c2c2)'
                        : 'var(--wire-lc, #c5a6f2)'
                    }
                    strokeWidth="3"
                    strokeDasharray="3 12"
                    strokeLinejoin="round"
                    opacity={0.3 + varitoneLevel * 0.5}
                  />
                )}
              </g>
              <path
                d={centerline}
                fill="none"
                stroke="transparent"
                strokeWidth="16"
                strokeLinejoin="round"
                className="wire-hit"
              />
            </g>
          );
        })}
        {isClear && tracedWire && (
          <g
            className="wire-trace-overlay"
            data-trace-id={tracedWire.id}
            pointerEvents="none"
            aria-hidden="true"
          >
            <path
              d={wirePath(routes.get(tracedWire.id)!)}
              fill="none"
              stroke="var(--wire-underpass, #11181b)"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d={wirePath(routes.get(tracedWire.id)!)}
              fill="none"
              stroke={traceColor}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
          </g>
        )}
        {visibleCircuit.parts
          .filter(
            (part) =>
              showGroundWiring ||
              part.kind !== 'ground' ||
              !groundView.hiddenParts.has(part.id),
          )
          .map((part) => {
            const isActive = estimate.activePickups.includes(part.id);
            const isSelected =
              selection?.kind === 'part' && selection.id === part.id;
            return (
              <g
                key={part.id}
                transform={`translate(${part.x} ${part.y}) scale(${partScale})`}
                data-testid={`part-${part.id}`}
              >
                <g
                  className={`part-body ${isSelected ? 'selected-part' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${part.label}`}
                  onPointerDown={(event) => startDrag(event, part)}
                  onClick={() => onSelect({ kind: 'part', id: part.id })}
                  onKeyDown={(event) => partKey(event, part)}
                >
                  <rect
                    className="part-frame"
                    x={isBladePart(part) || isPushPullPart(part) ? 24 : 3}
                    y="-8"
                    width={
                      isBladePart(part) || isPushPullPart(part) ? 132 : 174
                    }
                    height={
                      isPushPullPart(part)
                        ? 264
                        : part.kind === 'blade4'
                          ? 196
                          : isBladePart(part)
                            ? 156
                            : 109
                    }
                    rx="15"
                    fill="transparent"
                    stroke="none"
                  />
                  <PartArtwork
                    part={part}
                    isActive={isActive}
                    activeCoils={estimate.activeCoils[part.id] ?? []}
                    capacitorLevel={estimate.capacitorLevels[part.id] ?? 0}
                    varitoneLevel={
                      estimate.varitone?.partId === part.id
                        ? estimate.varitone.level
                        : 0
                    }
                    groundState={estimate.groundNodes[part.id]}
                  />
                  <text
                    transform={`translate(90 ${partTitleY(part)}) scale(${labelScale})`}
                    textAnchor="middle"
                    className="part-title"
                  >
                    {part.label}
                  </text>
                </g>
                {terminalsFor(part).map((terminal) => {
                  const id = terminalId(part, terminal.name);
                  const isGrounded = estimate.groundedTerminals.includes(id);
                  return (
                    <g
                      key={id}
                      data-terminal-id={id}
                      role={isEditing ? 'button' : undefined}
                      tabIndex={isEditing ? 0 : undefined}
                      aria-label={`${part.label} ${terminal.label} terminal`}
                      aria-description={
                        isGrounded ? 'Connected to jack sleeve' : undefined
                      }
                      className={`terminal ${pending === id ? 'pending-terminal' : ''}`}
                      onClick={() => isEditing && onTerminal(id)}
                      onKeyDown={(event) => {
                        if (
                          isEditing &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          onTerminal(id);
                        }
                      }}
                    >
                      <circle
                        cx={terminal.x}
                        cy={terminal.y}
                        r={terminalHitRadius}
                        fill="transparent"
                      />
                      <path
                        d={terminalLeadPath(part, terminal)}
                        fill="none"
                        stroke="#9d9980"
                        strokeWidth="3"
                      />
                      {(tracedWire?.from === id || tracedWire?.to === id) && (
                        <circle
                          className="trace-terminal-ring"
                          cx={terminal.x}
                          cy={terminal.y}
                          r="13"
                          fill="none"
                          stroke={
                            flags.isSignalFlowEnabled || hasGroundPresentation
                              ? traceColor
                              : 'var(--wire-selection, #fff1cb)'
                          }
                          strokeWidth="3"
                          pointerEvents="none"
                        />
                      )}
                      <circle
                        cx={terminal.x}
                        cy={terminal.y}
                        r={
                          terminal.name === 'wiper' ||
                          terminal.name.endsWith('-common')
                            ? 8
                            : 6
                        }
                        fill={pending === id ? '#f5c679' : '#11191c'}
                        stroke={pending === id ? '#fff1cb' : '#d2b579'}
                        strokeWidth="2.5"
                      />
                      {!showGroundWiring &&
                        groundView.groundedTerminals.has(id) && (
                          <g
                            className="terminal-ground"
                            data-ground-terminal={id}
                            aria-hidden="true"
                            pointerEvents="none"
                            transform={`translate(${terminal.x + (terminal.exit === 'left' ? -22 : terminal.exit === 'right' ? 22 : 0)} ${terminal.y + (terminal.exit ? 0 : -20)}) scale(${1 / partScale})`}
                          >
                            <path
                              d="M0 -5V-1M-4 -1H4M-2.7 1.5H2.7M-1 4H1"
                              fill="none"
                              stroke="var(--wire-ground, #999999)"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </g>
                        )}
                      {(!compactAnnotations ||
                        showAllLabels ||
                        isEditing ||
                        isSelected ||
                        tracedWire?.from === id ||
                        tracedWire?.to === id) && (
                        <text
                          transform={`translate(${terminal.x} ${terminal.y + (isBladePart(part) || terminal.name.startsWith('switch-') ? -13 : 23)}) scale(${labelScale})`}
                          textAnchor="middle"
                          className={`terminal-label ${terminal.name === 'wiper' || terminal.name.endsWith('-common') ? 'wiper-label' : ''}`}
                        >
                          {terminal.label.split(' ').map((word, index) => (
                            <tspan key={index} x="0" dy={index === 0 ? 0 : 13}>
                              {word}
                            </tspan>
                          ))}
                        </text>
                      )}
                    </g>
                  );
                })}
                {(!compactAnnotations ||
                  isEditing ||
                  isSelected ||
                  (part.kind === 'ground' &&
                    !estimate.groundNodes[part.id]?.isConnected)) && (
                  <text
                    transform={`translate(90 ${partStateY(part)}) scale(${labelScale})`}
                    textAnchor="middle"
                    className={`part-state ${isActive ? 'active-state' : ''}`}
                  >
                    {part.kind === 'pickup' || part.kind === 'humbucker'
                      ? isActive
                        ? '● CONTRIBUTING'
                        : '○ INACTIVE'
                      : part.kind === 'ground'
                        ? estimate.groundNodes[part.id]?.isConnected === null
                          ? '◇ UNKNOWN RETURN'
                          : !estimate.groundNodes[part.id]?.isConnected
                            ? '○ FLOATING'
                            : estimate.groundNodes[part.id]?.isActive
                              ? '● ACTIVE RETURN'
                              : '○ CONNECTED / IDLE'
                        : isBladePart(part)
                          ? `POSITION ${bladePosition(part)}`
                          : part.kind === 'selector'
                            ? `${part.position.toUpperCase()} SELECTED`
                            : potRole(part)
                              ? `${part.value} / 10 · ${part.resistanceKOhms ?? 500} kΩ${isPushPullPart(part) ? (part.isPulled ? ' · PULLED' : ' · PUSHED') : ''}`
                              : part.kind === 'varitone'
                                ? part.value === 1
                                  ? 'BYPASS · BRANCH OPEN'
                                  : `POSITION ${part.value} · LC FILTER`
                                : part.kind === 'capacitor'
                                  ? `${part.value} nF`
                                  : '6.35 mm MONO'}
                  </text>
                )}
              </g>
            );
          })}
        {!circuit.parts.length && (
          <g className="empty-board">
            <text x="540" y="285" textAnchor="middle">
              Your next circuit starts here.
            </text>
            <text
              x="540"
              y="320"
              textAnchor="middle"
              className="empty-subtitle"
            >
              {compactAnnotations
                ? 'Choose Add part to place a pickup and an output jack.'
                : 'Add a pickup and an output jack from the parts tray.'}
            </text>
          </g>
        )}
        {!compactAnnotations && (
          <text x="30" y="652" className="board-annotation">
            {circuit.parts.length} PARTS · {circuit.wires.length} WIRES
          </text>
        )}
        {!compactAnnotations && (
          <text x="1050" y="652" textAnchor="end" className="board-annotation">
            EDITABLE DIAGRAM / PICKUP LAB
          </text>
        )}
      </svg>
      {!onTraceChange && (
        <div className="trace-status" role="status" aria-live="polite">
          {tracedWire
            ? `${endpointLabel(tracedWire.from)} ↔ ${endpointLabel(tracedWire.to)}`
            : 'Trace a wire: hover or Tab to preview · click or Enter to pin · Escape to clear'}
        </div>
      )}
    </div>
  );
}
