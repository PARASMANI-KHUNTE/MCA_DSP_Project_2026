import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, SlidersHorizontal, Trophy } from "lucide-react";
import Navbar from "./components/Navbar";
import WeightControls from "./components/WeightControls";
import IndiaMap from "./components/IndiaMap";
import Leaderboard from "./components/Leaderboard";
import PlaceDetailModal from "./components/PlaceDetailModal";
import CompareModal from "./components/CompareModal";
import CompareBar from "./components/CompareBar";
import Toast from "./components/Toast";
import OnboardingTourModal from "./components/OnboardingTourModal";
import QuickStartBanner from "./components/QuickStartBanner";
import InsightsView from "./components/InsightsView";
import MethodologyView from "./components/MethodologyView";
import { BASELINE_YEAR, calculateScores } from "./services/scoringService";
import { PRESETS } from "./data/methodologyData";

const MOBILE_PANELS = [
  { id: "map", label: "Map", icon: Map },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "weights", label: "Weights", icon: SlidersHorizontal }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedYear, setSelectedYear] = useState(BASELINE_YEAR);
  const [mobilePanel, setMobilePanel] = useState("map");

  const [weights, setWeights] = useState({
    air: 30,
    safety: 25,
    health: 25,
    economy: 20,
    col: 0
  });
  const [selectedPresetId, setSelectedPresetId] = useState("balanced");

  const [colorMode, setColorMode] = useState("overall");
  const [activeFactor, setActiveFactor] = useState("overall");

  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [backendOnline, setBackendOnline] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, tone = "info") => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const rankedPlaces = useMemo(
    () => calculateScores(weights, "all", selectedYear),
    [weights, selectedYear]
  );

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return rankedPlaces.find(place => place.id === selectedPlaceId) || null;
  }, [rankedPlaces, selectedPlaceId]);

  const comparePlaces = useMemo(
    () =>
      compareIds
        .map(id => rankedPlaces.find(place => place.id === id))
        .filter(Boolean),
    [compareIds, rankedPlaces]
  );

  const handleWeightChange = (factor, value) => {
    setSelectedPresetId("custom");
    setWeights(previous => ({ ...previous, [factor]: value }));
  };

  const handleSelectPreset = preset => {
    setSelectedPresetId(preset.id);
    setWeights(preset.weights);
  };

  const handleReset = () => {
    const balanced = PRESETS.find(preset => preset.id === "balanced");
    if (balanced) handleSelectPreset(balanced);
  };

  const handleToggleCompare = useCallback(
    place => {
      if (compareIds.includes(place.id)) {
        setCompareIds(ids => ids.filter(id => id !== place.id));
        return;
      }
      if (compareIds.length >= 3) {
        notify("Comparison tray is full. Remove a place before adding another.", "warning");
        return;
      }
      setCompareIds(ids => [...ids, place.id]);
    },
    [compareIds, notify]
  );

  const handleRemoveCompare = useCallback(place => {
    setCompareIds(ids => ids.filter(id => id !== place.id));
  }, []);

  const handleClearCompare = () => {
    setCompareIds([]);
    setShowCompareModal(false);
    notify("Comparison tray cleared.", "info");
  };

  const handleOpenCompare = () => {
    if (compareIds.length < 2) {
      notify("Pick at least two places to open the comparison.", "warning");
      return;
    }
    setShowCompareModal(true);
  };

  const handleAddMorePlaces = () => {
    setShowCompareModal(false);
    setActiveTab("map");
    setMobilePanel("rankings");
    notify("Select another place from the rankings to add it to the tray.", "info");
  };

  const handleSelectFromCompare = place => {
    setShowCompareModal(false);
    setSelectedPlaceId(place.id);
  };

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/health", { method: "GET" });
      const online = response.ok;
      setBackendOnline(online);
      return online;
    } catch {
      setBackendOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const probe = async () => {
      const online = await checkHealth();
      if (!mounted) return;
      setBackendOnline(online);
    };

    probe();
    const interval = window.setInterval(probe, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [checkHealth]);

  const handleRetryBackend = async () => {
    const online = await checkHealth();
    notify(
      online
        ? "FastAPI backend connected. Scores can sync with the API."
        : "Backend offline. The embedded scoring engine keeps working.",
      online ? "success" : "info"
    );
  };

  const explorerHeight = compareIds.length
    ? "lg:h-[calc(100dvh-12.25rem)]"
    : "lg:h-[calc(100dvh-7.25rem)]";

  return (
    <div className="flex min-h-[100dvh] flex-col text-slate-100">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        selectedYear={selectedYear}
        onChangeYear={setSelectedYear}
        backendOnline={backendOnline}
        onRetryBackend={handleRetryBackend}
        onOpenTour={() => setShowTourModal(true)}
      />

      <main
        className={`relative z-10 mx-auto w-full max-w-[1720px] flex-1 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-6 lg:pt-5 ${
          compareIds.length
            ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-28"
            : "pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:pb-8"
        }`}
      >
        {activeTab === "map" && (
          <div className="flex flex-col">
            <QuickStartBanner
              onOpenTour={() => setShowTourModal(true)}
              onSelectPreset={handleSelectPreset}
            />

            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1 sm:mb-4 lg:hidden">
              {MOBILE_PANELS.map(panel => {
                const Icon = panel.icon;
                const active = mobilePanel === panel.id;
                return (
                  <button
                    key={panel.id}
                    onClick={() => setMobilePanel(panel.id)}
                    aria-pressed={active}
                    className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all sm:text-xs ${
                      active
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {panel.label}
                  </button>
                );
              })}
            </div>

            <div className={`grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 ${explorerHeight}`}>
              <div
                className={`custom-scrollbar min-h-0 lg:col-span-3 lg:block lg:overflow-y-auto lg:pr-1 ${
                  mobilePanel === "weights" ? "block" : "hidden"
                }`}
              >
                <WeightControls
                  weights={weights}
                  onChangeWeight={handleWeightChange}
                  onSelectPreset={handleSelectPreset}
                  onReset={handleReset}
                  colorMode={colorMode}
                  onChangeColorMode={setColorMode}
                  activeFactor={activeFactor}
                  onChangeActiveFactor={setActiveFactor}
                  selectedPresetId={selectedPresetId}
                />
              </div>

              <div
                className={`h-[calc(100dvh-17rem)] min-h-[360px] sm:min-h-[440px] lg:col-span-6 lg:h-full lg:min-h-0 ${
                  mobilePanel === "map" ? "flex" : "hidden"
                } lg:flex`}
              >
                <IndiaMap
                  places={rankedPlaces}
                  selectedPlace={selectedPlace}
                  onSelectPlace={place => setSelectedPlaceId(place.id)}
                  colorMode={colorMode}
                  activeFactor={activeFactor}
                  year={selectedYear}
                />
              </div>

              <div
                className={`h-[calc(100dvh-17rem)] min-h-[360px] sm:min-h-[440px] lg:col-span-3 lg:h-full lg:min-h-0 ${
                  mobilePanel === "rankings" ? "flex" : "hidden"
                } lg:flex`}
              >
                <Leaderboard
                  rankedPlaces={rankedPlaces}
                  onSelectPlace={place => setSelectedPlaceId(place.id)}
                  selectedPlaceId={selectedPlaceId}
                  compareIds={compareIds}
                  onToggleCompare={handleToggleCompare}
                  year={selectedYear}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && <InsightsView rankedPlaces={rankedPlaces} year={selectedYear} />}

        {activeTab === "methodology" && <MethodologyView />}
      </main>

      <CompareBar
        places={comparePlaces}
        onRemove={handleRemoveCompare}
        onClear={handleClearCompare}
        onOpen={handleOpenCompare}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          weights={weights}
          year={selectedYear}
          onClose={() => setSelectedPlaceId(null)}
          onToggleCompare={handleToggleCompare}
          isComparing={compareIds.includes(selectedPlace.id)}
          allPlaces={rankedPlaces}
          onSelectPlace={place => setSelectedPlaceId(place.id)}
        />
      )}

      {showCompareModal && (
        <CompareModal
          comparePlaces={comparePlaces}
          onClose={() => setShowCompareModal(false)}
          onRemovePlace={handleRemoveCompare}
          onSelectPlace={handleSelectFromCompare}
          onAddMore={handleAddMorePlaces}
        />
      )}

      <OnboardingTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </div>
  );
}
