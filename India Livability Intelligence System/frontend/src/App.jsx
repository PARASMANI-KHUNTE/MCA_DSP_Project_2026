import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass, Map, Menu, SlidersHorizontal, Trophy } from "lucide-react";
import Sidebar from "./components/Sidebar";
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
import PipelineView from "./components/PipelineView";
import YearSelector from "./components/YearSelector";
import { BASELINE_YEAR, DATA_COVERAGE, OBSERVED_YEARS, calculateScores } from "./services/scoringService";
import { DATA } from "./data/realData";
import { PRESETS } from "./data/methodologyData";

const COMPOSITE_DEFAULT = PRESETS.find(preset => preset.id === "balanced") || {
  id: "balanced",
  weights: { air: 35, safety: 25, health: 25, economy: 15, col: 0, water: 0 }
};

const MOBILE_PANELS = [
  { id: "map", label: "Map", icon: Map },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "weights", label: "Weights", icon: SlidersHorizontal }
];

// Newest first so the default baseline sits at the top of the selector.
const YEAR_OPTIONS = [...OBSERVED_YEARS].sort((a, b) => b - a);

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedYear, setSelectedYear] = useState(BASELINE_YEAR);
  const [mobilePanel, setMobilePanel] = useState("map");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [weights, setWeights] = useState(() =>
    DATA_COVERAGE.compositeAvailable
      ? { ...COMPOSITE_DEFAULT.weights }
      : {
          air: DATA_COVERAGE.availableFactors?.includes("air") ? 100 : 0,
          safety: 0,
          health: 0,
          economy: 0,
          col: 0,
          water: 0
        }
  );
  const [selectedPresetId, setSelectedPresetId] = useState(() => {
    if (DATA_COVERAGE.compositeAvailable) return COMPOSITE_DEFAULT.id;
    return DATA_COVERAGE.availableFactors?.includes("air") ? "air_only" : "col_only";
  });

  const initialFactor = DATA_COVERAGE.availableFactors?.[0] || "air";
  const [colorMode, setColorMode] = useState(DATA_COVERAGE.compositeAvailable ? "overall" : "factor");
  const [activeFactor, setActiveFactor] = useState(initialFactor);

  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [showTourModal, setShowTourModal] = useState(false);
  const dataAvailable = DATA.rows.length > 0;

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

  const handleChangeActiveFactor = factor => {
    setActiveFactor(factor);
  };

  const handleReset = () => {
    setSelectedYear(BASELINE_YEAR);
    if (DATA_COVERAGE.compositeAvailable) {
      setSelectedPresetId(COMPOSITE_DEFAULT.id);
      setWeights({ ...COMPOSITE_DEFAULT.weights });
      return;
    }
    const defaultFactor = DATA_COVERAGE.availableFactors?.includes("air") ? "air" : DATA_COVERAGE.availableFactors?.[0];
    const resetWeights = { air: 0, safety: 0, health: 0, economy: 0, col: 0, water: 0 };
    if (defaultFactor) resetWeights[defaultFactor] = 100;
    setSelectedPresetId(defaultFactor === "col" ? "col_only" : "air_only");
    setWeights(resetWeights);
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F2] font-sans text-[#111111] md:flex-row">
      {/* Sticky Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E5E5E5] bg-white/95 px-4 backdrop-blur-md md:hidden">
        <button
          onClick={() => setActiveTab("map")}
          className="flex items-center gap-2 text-left"
          aria-label="Go to explorer"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] text-[#111111]">
            <Compass size={17} className="text-[#B51F3B]" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-[#111111]">
            Spatial Explorer
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] px-2 py-1 text-[11px] font-semibold text-[#666666]">
            {selectedYear}
          </span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#111111] hover:bg-[#F5F5F2] transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Left Sidebar Drawer / Rail */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col md:h-[100dvh] md:min-h-0 md:overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 md:min-h-0 xl:px-8">
          {dataAvailable && activeTab !== "pipeline" && (
            <YearSelector
              year={selectedYear}
              years={YEAR_OPTIONS}
              onChange={setSelectedYear}
            />
          )}

          {/* Interactive Views */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* View 1: Explorer (Decision System) */}
            {dataAvailable && activeTab === "map" && (
              <div className="flex min-h-0 flex-1 flex-col">

                <QuickStartBanner
                  onOpenTour={() => setShowTourModal(true)}
                  onSelectPreset={handleSelectPreset}
                  selectedPresetId={selectedPresetId}
                  compositeAvailable={DATA_COVERAGE.compositeAvailable}
                  availableFactors={DATA_COVERAGE.availableFactors || []}
                />

                {!DATA_COVERAGE.compositeAvailable && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
                    Composite rankings are unavailable because required indicators are missing. The map shows only available observed factors; missing tables remain unscored.
                  </div>
                )}

                {/* Mobile View Toggle */}
                <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-1 sm:mb-4 lg:hidden">
                  {MOBILE_PANELS.map(panel => {
                    const Icon = panel.icon;
                    const active = mobilePanel === panel.id;
                    return (
                      <button
                        key={panel.id}
                        onClick={() => setMobilePanel(panel.id)}
                        aria-pressed={active}
                        className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                          active
                            ? "bg-[#111111] text-white shadow-xs"
                            : "text-[#666666] hover:bg-white hover:text-[#111111]"
                        }`}
                      >
                        <Icon size={13} />
                        {panel.label}
                      </button>
                    );
                  })}
                </div>

                {/* 3-Column Decision Grid */}
                <div className="grid min-h-0 grid-cols-1 gap-4 lg:flex-1 lg:min-h-[520px] lg:grid-cols-12">
                  {/* Left Column: Weights */}
                  <div
                    className={`min-h-0 lg:col-span-3 lg:block ${
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
                      onChangeActiveFactor={handleChangeActiveFactor}
                      selectedPresetId={selectedPresetId}
                      availableFactors={DATA_COVERAGE.availableFactors || []}
                      compositeAvailable={DATA_COVERAGE.compositeAvailable}
                    />
                  </div>

                  {/* Center Column: Interactive Map */}
                  <div
                    className={`flex h-[460px] min-h-0 flex-col sm:h-[540px] lg:col-span-6 lg:h-full ${
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

                  {/* Right Column: Leaderboard */}
                  <div
                    className={`flex h-[460px] min-h-0 flex-col sm:h-[540px] lg:col-span-3 lg:h-full ${
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
                      compositeAvailable={DATA_COVERAGE.compositeAvailable}
                    />
                  </div>
                </div>
              </div>
            )}

{/* View 2: Insights */}
            {dataAvailable && activeTab === "insights" && (
              <InsightsView rankedPlaces={rankedPlaces} year={selectedYear} weights={weights} />
            )}

            {/* View 3: Pipeline */}
            {dataAvailable && activeTab === "pipeline" && (
              <PipelineView />
            )}

            {/* About section removed — kept only Explorer and Insights views */}
          </div>
        </div>
      </main>

      {/* Floating Elements */}
      {dataAvailable && (
        <CompareBar
          places={comparePlaces}
          onRemove={handleRemoveCompare}
          onClear={handleClearCompare}
          onOpen={handleOpenCompare}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {dataAvailable && selectedPlace && (
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

      {dataAvailable && showCompareModal && (
        <CompareModal
          comparePlaces={comparePlaces}
          year={selectedYear}
          onClose={() => setShowCompareModal(false)}
          onRemovePlace={handleRemoveCompare}
          onSelectPlace={handleSelectFromCompare}
          onAddMore={handleAddMorePlaces}
        />
      )}

      <OnboardingTourModal
        isOpen={dataAvailable && showTourModal}
        onClose={() => setShowTourModal(false)}
      />
    </div>
  );
}
