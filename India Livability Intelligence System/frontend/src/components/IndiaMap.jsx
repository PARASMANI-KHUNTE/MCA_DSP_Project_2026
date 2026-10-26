import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MapPin, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { getScoreColor, getTierColor, SCORE_BANDS } from "../services/scoringService";
import { INDIA_STATES, MAP_VIEWBOX, projectLatLng } from "../data/indiaMap";

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 3;
const COMPACT_WIDTH = 520;
const LABEL_FONT_COMPACT = 9.5;
const LABEL_FONT_REGULAR = 10.5;
const LABEL_FONT_EMPHASIS = 2;

const FACTOR_LABELS = {
  overall: "Composite index",
  air: "Air quality",
  safety: "Public safety",
  health: "Healthcare",
  economy: "Economy & jobs",
  col: "Cost of living"
};

const VIEWS = [
  { id: "all", label: "All" },
  { id: "cities", label: "Cities" },
  { id: "states", label: "States" }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const clampPan = (x, y, zoom) => {
  const limit = 160 + 260 * (zoom - 1);
  return {
    x: clamp(x, -limit, limit),
    y: clamp(y, -limit, limit)
  };
};

const getPinRadius = (compact, emphasized) => {
  const base = compact ? 4.1 : 4.7;
  return base + (emphasized ? 1.4 : 0);
};

const getLabelFont = (compact, emphasized) =>
  (compact ? LABEL_FONT_COMPACT : LABEL_FONT_REGULAR) + (emphasized ? LABEL_FONT_EMPHASIS : 0);

export default function IndiaMap({
  places,
  selectedPlace,
  onSelectPlace,
  colorMode = "overall",
  activeFactor = "overall",
  year
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hoveredPlace, setHoveredPlace] = useState(null);
  const [viewType, setViewType] = useState("all");
  const [showCityLabels, setShowCityLabels] = useState(true);

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const didDragRef = useRef(false);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const measure = () => {
      setMapSize({ width: node.clientWidth, height: node.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const compact = mapSize.width > 0 && mapSize.width < COMPACT_WIDTH;
  const fitScale =
    mapSize.width > 0 && mapSize.height > 0
      ? Math.min(mapSize.width / MAP_VIEWBOX.width, mapSize.height / MAP_VIEWBOX.height)
      : 1;
  const screenScale = Math.max(fitScale * zoom, 0.001);
  const toScreenUnits = value => value / screenScale;

  const scoreMap = useMemo(() => {
    const map = {};
    places.forEach(place => {
      map[place.id] = place;
    });
    return map;
  }, [places]);

  const cities = useMemo(
    () =>
      places
        .filter(place => place.type === "city")
        .sort((a, b) => {
          const aScore = Number.isFinite(a.overallScore) ? a.overallScore : -1;
          const bScore = Number.isFinite(b.overallScore) ? b.overallScore : -1;
          return bScore - aScore || a.name.localeCompare(b.name);
        }),
    [places]
  );

  const labelPlan = useMemo(() => {
    const plan = new Map();
    if (!showCityLabels || !cities.length) return plan;

    const isCompact = mapSize.width > 0 && mapSize.width < COMPACT_WIDTH;
    const scale =
      mapSize.width > 0 && mapSize.height > 0
        ? Math.max(
            Math.min(mapSize.width / MAP_VIEWBOX.width, mapSize.height / MAP_VIEWBOX.height) * zoom,
            0.001
          )
        : 1;
    const selectedId = selectedPlace?.id;
    const hoveredId = hoveredPlace?.id;
    const budget = isCompact
      ? zoom >= 1.9
        ? cities.length
        : zoom >= 1.3
          ? 12
          : 6
      : zoom >= 1.9
        ? cities.length
        : zoom >= 1.2
          ? 18
          : 10;

    const ordered = cities
      .map((city, index) => {
        const emphasized = city.id === selectedId || city.id === hoveredId;
        return {
          city,
          index,
          emphasized,
          priority: emphasized
            ? Number.POSITIVE_INFINITY
            : Number.isFinite(city.overallScore) ? city.overallScore : -1
        };
      })
      .sort((a, b) => b.priority - a.priority || a.index - b.index);

    const placed = [];
    let count = 0;

    ordered.forEach(({ city, emphasized }) => {
      if (!emphasized && count >= budget) return;

      const { x, y } = projectLatLng(city.lat, city.lng);
      const radiusPx = getPinRadius(isCompact, emphasized);
      const fontPx = getLabelFont(isCompact, emphasized);
      const gap = emphasized ? 5 : 4;
      const width = Math.max(20, city.name.length * fontPx * 0.58 + 4);
      const height = fontPx * 1.1;
      const cx = x * scale;
      const cy = y * scale;
      const offsets = radiusPx + gap;

      const boxes = {
        top: {
          left: cx - width / 2,
          right: cx + width / 2,
          top: cy - offsets - height,
          bottom: cy - offsets
        },
        right: {
          left: cx + offsets,
          right: cx + offsets + width,
          top: cy - height / 2,
          bottom: cy + height / 2
        },
        left: {
          left: cx - offsets - width,
          right: cx - offsets,
          top: cy - height / 2,
          bottom: cy + height / 2
        },
        bottom: {
          left: cx - width / 2,
          right: cx + width / 2,
          top: cy + offsets,
          bottom: cy + offsets + height
        }
      };

      const placements = ["top", "right", "left", "bottom"];
      let choice = null;
      for (const placement of placements) {
        const box = boxes[placement];
        const collides = placed.some(
          other =>
            !(
              box.right < other.left - 3 ||
              box.left > other.right + 3 ||
              box.bottom < other.top - 2 ||
              box.top > other.bottom + 2
            )
        );
        if (!collides) {
          choice = placement;
          break;
        }
      }

      if (!emphasized && !choice) return;

      const placement = choice || "top";
      placed.push(boxes[placement]);
      plan.set(city.id, { radiusPx, fontPx, emphasized, placement });
      if (!emphasized) count += 1;
    });

    return plan;
  }, [cities, mapSize, zoom, showCityLabels, selectedPlace, hoveredPlace]);

  const getColorForPlace = place => {
    if (!place) return "#1e293b";
    if (colorMode === "tier") return getTierColor(place.tier);
    if (colorMode === "factor" && activeFactor !== "overall") {
      return getScoreColor(place.factorScores?.[activeFactor]);
    }
    return getScoreColor(place.overallScore);
  };

  const adjustZoom = delta => {
    setZoom(current => {
      const next = clamp(current + delta, MIN_ZOOM, MAX_ZOOM);
      setPan(previous => clampPan(previous.x, previous.y, next));
      return next;
    });
  };

  useEffect(() => {
    const node = svgRef.current;
    if (!node) return undefined;

    const handleWheel = event => {
      event.preventDefault();
      adjustZoom(event.deltaY > 0 ? -0.14 : 0.14);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  const handlePointerDown = event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchRef.current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y) || 1,
        zoom
      };
      dragRef.current = null;
      didDragRef.current = true;
      setDragging(false);
      return;
    }

    if (pointers.size > 2) return;

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: pan.x,
      startY: pan.y
    };
    didDragRef.current = false;
    setDragging(true);
  };

  const handlePointerMove = event => {
    const pointers = pointersRef.current;
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const pinch = pinchRef.current;
    if (pinch && pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y) || 1;
      const next = clamp(pinch.zoom * (distance / pinch.distance), MIN_ZOOM, MAX_ZOOM);
      setZoom(next);
      setPan(previous => clampPan(previous.x, previous.y, next));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) didDragRef.current = true;
    setPan(clampPan(drag.startX + dx, drag.startY + dy, zoom));
  };

  const endDrag = event => {
    const pointers = pointersRef.current;
    if (event?.pointerId !== undefined) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchRef.current = null;
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
      if (!pointers.size) {
        dragRef.current = null;
        setDragging(false);
      }
    } else {
      pointers.clear();
      pinchRef.current = null;
      dragRef.current = null;
      setDragging(false);
    }
  };

  const handleSelect = place => {
    if (didDragRef.current) return;
    onSelectPlace(place);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const legendItems = colorMode === "tier"
    ? [
        { label: "Tier 1", color: getTierColor("Tier 1: High Livability") },
        { label: "Tier 2", color: getTierColor("Tier 2: Moderate Livability") },
        { label: "Tier 3", color: getTierColor("Tier 3: Developing Livability") }
      ]
    : [...SCORE_BANDS].reverse();

  const legendTitle = colorMode === "tier"
    ? "Score band"
    : colorMode === "factor"
      ? FACTOR_LABELS[activeFactor]
      : "Composite livability";

  const zoomedIn = zoom > 1.01;
  const canReset = zoomedIn || Math.abs(pan.x) > 1 || Math.abs(pan.y) > 1;

  return (
    <div ref={containerRef} className="surface relative flex h-full w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5 sm:p-3">
        <div className="pointer-events-auto flex max-w-[calc(100%-3.25rem)] items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/90 p-1 shadow-lg backdrop-blur-md">
          <span className="hidden items-center gap-1 rounded bg-cyan-500/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-300 sm:flex">
            Step 2: Map
          </span>
          <span className="hidden h-4 w-px bg-slate-700 sm:block" />
          {VIEWS.map(view => (
            <button
              key={view.id}
              onClick={() => setViewType(view.id)}
              aria-pressed={viewType === view.id}
              className={`min-h-8 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                viewType === view.id
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex flex-col gap-1 rounded-xl border border-slate-700/70 bg-slate-900/90 p-1 shadow-lg backdrop-blur-md">
          <button
            title="Zoom in"
            onClick={() => adjustZoom(0.25)}
            disabled={zoom >= MAX_ZOOM - 0.001}
            className="icon-btn h-7 w-7 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            title="Zoom out"
            onClick={() => adjustZoom(-0.25)}
            disabled={zoom <= MIN_ZOOM + 0.001}
            className="icon-btn h-7 w-7 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            title="Reset map view"
            onClick={resetView}
            disabled={!canReset}
            className="icon-btn h-7 w-7 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Reset map view"
          >
            <RotateCcw size={14} />
          </button>
          <span className="mx-auto h-px w-4 bg-slate-700/80" />
          <button
            title={showCityLabels ? "Hide city labels" : "Show city labels"}
            onClick={() => setShowCityLabels(value => !value)}
            aria-pressed={showCityLabels}
            className={`icon-btn h-7 w-7 ${showCityLabels ? "text-emerald-300" : ""}`}
            aria-label={showCityLabels ? "Hide city labels" : "Show city labels"}
          >
            <MapPin size={14} />
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full touch-none select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          touchAction: "none",
          willChange: "transform"
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => adjustZoom(0.35)}
        role="img"
        aria-label={`India livability map for ${year}, colored by ${legendTitle}`}
      >
        <defs>
          <filter id="map-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="pin-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.3" floodColor="#020617" floodOpacity="0.9" />
          </filter>
          <radialGradient id="map-ocean" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#0b1729" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="map-halo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <pattern id="state-no-data" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#0b1220" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#243249" strokeWidth="2" />
          </pattern>
        </defs>

        <rect width={MAP_VIEWBOX.width} height={MAP_VIEWBOX.height} fill="url(#map-ocean)" rx="18" />
        <ellipse cx="400" cy="150" rx="290" ry="165" fill="url(#map-halo)" />

        <g opacity="0.24" stroke="#334155" strokeWidth="0.6">
          {[150, 300, 450, 600, 750].map(line => (
            <line key={`h-${line}`} x1="34" y1={line} x2="766" y2={line} strokeDasharray="2,6" />
          ))}
          {[150, 300, 450, 600].map(line => (
            <line key={`v-${line}`} x1={line} y1="34" x2={line} y2="866" strokeDasharray="2,6" />
          ))}
        </g>

        <g id="states-layer">
          {INDIA_STATES.map(state => {
            const placeData = state.id ? scoreMap[state.id] : null;
            const color = getColorForPlace(placeData);
            const selected = selectedPlace?.id === state.id;
            const hovered = hoveredPlace?.id === (state.id || state.name);
            const dimmed = viewType === "cities";

            return (
              <path
                key={state.id || state.name}
                d={state.d}
                fill={placeData ? color : "url(#state-no-data)"}
                fillRule="evenodd"
                fillOpacity={dimmed ? 0.14 : selected ? 0.94 : hovered ? 0.82 : 0.6}
                stroke={selected ? "#f8fafc" : hovered ? "#94a3b8" : "#334155"}
                strokeWidth={selected ? 2.2 : hovered ? 1.5 : 0.9}
                strokeLinejoin="round"
                className={`transition-all duration-200 ${
                  dimmed
                    ? "pointer-events-none"
                    : placeData
                      ? "cursor-pointer hover:brightness-125"
                      : "cursor-help"
                }`}
                onClick={() => {
                  if (!dimmed && placeData) handleSelect(placeData);
                }}
                onMouseEnter={() => {
                  if (dimmed) return;
                  setHoveredPlace(
                    placeData || {
                      id: state.id || state.name,
                      name: state.name,
                      type: "state"
                    }
                  );
                }}
                onMouseLeave={() => setHoveredPlace(null)}
                onKeyDown={event => {
                  if (!placeData) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(placeData);
                  }
                }}
                tabIndex={placeData && !dimmed ? 0 : -1}
                role={placeData ? "button" : undefined}
                aria-label={
                  placeData
                    ? `${state.name}, score ${placeData.overallScore}. Open details.`
                    : `${state.name}, no score available`
                }
              >
                <title>{`${state.name}${placeData ? ` — ${placeData.overallScore}` : " — no score"}`}</title>
              </path>
            );
          })}
        </g>

        {viewType !== "states" && (
          <g id="cities-layer">
            {[...cities].reverse().map(city => {
              const { x, y } = projectLatLng(city.lat, city.lng);
              const color = getColorForPlace(city);
              const selected = selectedPlace?.id === city.id;
              const hovered = hoveredPlace?.id === city.id;
              const emphasized = selected || hovered;
              const radiusPx = getPinRadius(compact, emphasized);
              const radius = toScreenUnits(radiusPx);
              const label = labelPlan.get(city.id);
              const placement = label?.placement || "top";
              const fontPx = label?.fontPx ?? getLabelFont(compact, emphasized);
              const labelGap = emphasized ? 5 : 4;
              const textX =
                placement === "right"
                  ? toScreenUnits(radiusPx + labelGap)
                  : placement === "left"
                    ? -toScreenUnits(radiusPx + labelGap)
                    : 0;
              const textY =
                placement === "top"
                  ? -toScreenUnits(radiusPx + labelGap + fontPx / 2)
                  : placement === "bottom"
                    ? toScreenUnits(radiusPx + labelGap + fontPx / 2)
                    : 0;

              return (
                <g
                  key={city.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer outline-none"
                  onClick={() => handleSelect(city)}
                  onMouseEnter={() => setHoveredPlace(city)}
                  onMouseLeave={() => setHoveredPlace(null)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelect(city);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${city.name}, score ${city.overallScore}. Open details.`}
                >
                  {emphasized && (
                    <circle
                      r={toScreenUnits(radiusPx + (selected ? 10 : 7))}
                      fill={color}
                      fillOpacity={0.2}
                      className={selected ? "animate-ping" : ""}
                      style={{ animationDuration: "2.6s" }}
                    />
                  )}
                  <circle r={toScreenUnits(radiusPx + 2.5)} fill={color} fillOpacity={0.14} />
                  <circle
                    r={radius}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={toScreenUnits(selected ? 2 : 1.2)}
                    filter="url(#pin-shadow)"
                    className="transition-all duration-200"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor={placement === "right" ? "start" : placement === "left" ? "end" : "middle"}
                    dominantBaseline="central"
                    fill={selected ? "#ffffff" : "#e2e8f0"}
                    fontSize={toScreenUnits(fontPx)}
                    fontWeight={selected ? 800 : 600}
                    stroke="#030712"
                    strokeWidth={toScreenUnits(emphasized ? 2.6 : 2)}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    opacity={label ? 1 : 0}
                    className="pointer-events-none select-none transition-opacity duration-200"
                  >
                    {city.name}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        <g opacity="0.7" transform="translate(738, 74)">
          <circle r="16" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <path d="M 0,-11 L 4,4 L 0,1 L -4,4 Z" fill="#34d399" />
          <text y="27" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">N</text>
        </g>
      </svg>

      {year !== 2024 && (
        <div className="pointer-events-none absolute left-2.5 top-14 z-10 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 backdrop-blur sm:left-3">
          {year > 2024
            ? `OLS projection · ${year}`
            : `Latest observation ≤ ${year}`}
        </div>
      )}

      <div
        className={`pointer-events-none absolute left-3 z-10 hidden items-center gap-1.5 rounded-lg border border-slate-800/70 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-500 backdrop-blur sm:flex ${
          year !== 2024 ? "top-[5.35rem]" : "top-14"
        }`}
      >
        <Move size={11} />
        Drag to pan · scroll to zoom
        <span className="ml-0.5 rounded bg-slate-800/80 px-1 font-mono text-[9px] font-semibold text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {hoveredPlace && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 hidden w-[226px] rounded-xl border border-slate-700/90 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-fade-in sm:block">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-white">
              <MapPin size={13} className="shrink-0 text-emerald-400" />
              <span className="truncate">{hoveredPlace.name}</span>
            </span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black text-slate-950"
              style={{ backgroundColor: getColorForPlace(hoveredPlace) }}
            >
              {hoveredPlace.overallScore ?? "—"}
            </span>
          </div>
          <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
            <span className="truncate">
              {hoveredPlace.type === "city"
                ? hoveredPlace.state
                : hoveredPlace.overallScore !== undefined
                  ? `${hoveredPlace.region || "India"} region`
                  : "Union territory · outside scope"}
            </span>
            <span className="shrink-0">{hoveredPlace.rank ? `Rank #${hoveredPlace.rank}` : "No data"}</span>
          </div>
          {hoveredPlace.factorScores && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-800 pt-2 text-[10px]">
              <div className="text-slate-500">Air <span className="float-right font-semibold text-slate-200">{hoveredPlace.factorScores?.air ?? "—"}</span></div>
              <div className="text-slate-500">Safety <span className="float-right font-semibold text-slate-200">{hoveredPlace.factorScores?.safety ?? "—"}</span></div>
              <div className="text-slate-500">Health <span className="float-right font-semibold text-slate-200">{hoveredPlace.factorScores?.health ?? "—"}</span></div>
              <div className="text-slate-500">Econ <span className="float-right font-semibold text-slate-200">{hoveredPlace.factorScores?.economy ?? "—"}</span></div>
            </div>
          )}
        </div>
      )}

      <div
        className={`pointer-events-none absolute z-20 rounded-xl border border-slate-800/90 bg-slate-950/90 shadow-xl backdrop-blur-md ${
          compact
            ? "bottom-2 left-2 right-2 p-2"
            : "bottom-3 left-3 right-3 p-2.5 sm:left-auto sm:right-3 sm:w-[196px]"
        }`}
      >
        <div className={`flex items-center justify-between gap-2 ${compact ? "mb-1" : "mb-1.5"}`}>
          <span className="truncate text-[10px] font-semibold text-slate-300">{legendTitle}</span>
          {compact ? (
            <span
              className="flex shrink-0 items-center gap-1 text-[8px] text-slate-500"
              title="Hatched states have no score"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-[2px] border border-slate-700"
                style={{ background: "repeating-linear-gradient(45deg, #0b1220 0 2px, #243249 2px 3px)" }}
              />
              {year}
            </span>
          ) : (
            <span className="shrink-0 text-[9px] text-slate-500">{year}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {legendItems.map(item => (
            <span
              key={item.label}
              className="h-2.5 flex-1 rounded-sm"
              style={{ backgroundColor: item.color }}
              title={item.min !== undefined ? `${item.label} (${item.min}+)` : item.label}
            />
          ))}
        </div>
        <div className={`flex justify-between text-[9px] text-slate-500 ${compact ? "mt-0.5" : "mt-1"}`}>
          {colorMode === "tier" ? (
            <>
              <span>High</span>
              <span>Moderate</span>
              <span>Developing</span>
            </>
          ) : (
            <>
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </>
          )}
        </div>
        {!compact && (
          <div className="mt-1.5 flex items-center gap-1 border-t border-slate-800/80 pt-1.5 text-[9px] text-slate-500">
            <span
              className="h-2 w-2.5 rounded-sm border border-slate-700"
              style={{ background: "repeating-linear-gradient(45deg, #0b1220 0 2px, #243249 2px 3px)" }}
            />
            Hatched = no score
          </div>
        )}
      </div>
    </div>
  );
}
