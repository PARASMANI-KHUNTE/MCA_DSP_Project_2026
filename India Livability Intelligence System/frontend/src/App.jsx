import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Map, SlidersHorizontal, Trophy } from "lucide-react";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import TechStack from "./components/TechStack";
import StatsSection from "./components/StatsSection";
import AboutView from "./components/AboutView";
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
import { BASELINE_YEAR, DATA_COVERAGE, calculateScores } from "./services/scoringService";
import { DATA } from "./data/realData";
import { PRESETS } from "./data/methodologyData";

const COMPOSITE_DEFAULT = PRESETS.find(preset => preset.id === "balanced") || {
  id: "balanced",
  weights: { air: 35, safety: 25, health: 25, economy: 15, col: 0 }
};

const MOBILE_PANELS = [
  { id: "map", label: "Map", icon: Map },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "weights", label: "Weights", icon: SlidersHorizontal }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedYear, setSelectedYear] = useState(BASELINE_YEAR);
  const [mobilePanel, setMobilePanel] = useState("map");

  const [weights, setWeights] = useState(() =>
    DATA_COVERAGE.compositeAvailable
      ? { ...COMPOSITE_DEFAULT.weights }
      : {
          air: DATA_COVERAGE.availableFactors?.includes("air") ? 100 : 0,
          safety: 0,
          health: 0,
          economy: 0,
          col: 0
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

  const [backendStatus, setBackendStatus] = useState("offline");
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
    if (value > 0) {
      const availableYear = DATA_COVERAGE.lastYearByFactor?.[factor];
      if (availableYear != null && selectedYear < DATA_COVERAGE.firstYearByFactor?.[factor]) {
        setSelectedYear(availableYear);
      }
    }
  };

  const handleSelectPreset = preset => {
    setSelectedPresetId(preset.id);
    setWeights(preset.weights);
    const factor = preset.id.endsWith("_only") ? preset.id.replace("_only", "") : null;
    const latestYear = factor && DATA_COVERAGE.lastYearByFactor?.[factor];
    if (latestYear != null) setSelectedYear(latestYear);
  };

  const handleChangeActiveFactor = factor => {
    setActiveFactor(factor);
    const firstYear = DATA_COVERAGE.firstYearByFactor?.[factor];
    const latestYear = DATA_COVERAGE.lastYearByFactor?.[factor];
    if (firstYear != null && latestYear != null && selectedYear < firstYear) {
      setSelectedYear(latestYear);
    }
  };

  const handleReset = () => {
    if (DATA_COVERAGE.compositeAvailable) {
      setSelectedPresetId(COMPOSITE_DEFAULT.id);
      setWeights({ ...COMPOSITE_DEFAULT.weights });
      return;
    }
    const defaultFactor = DATA_COVERAGE.availableFactors?.includes("air") ? "air" : DATA_COVERAGE.availableFactors?.[0];
    const resetWeights = { air: 0, safety: 0, health: 0, economy: 0, col: 0 };
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

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/health", { method: "GET" });
      const health = response.ok ? await response.json() : null;
      const status = health?.status === "ok" ? "ok" : "offline";
      setBackendStatus(status);
      return status;
    } catch {
      setBackendStatus("offline");
      return "offline";
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const probe = async () => {
      const online = await checkHealth();
      if (!mounted) return;
      setBackendStatus(online);
    };

    probe();
    const interval = window.setInterval(probe, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [checkHealth]);

  const handleRetryBackend = async () => {
    const status = await checkHealth();
    notify(
      status === "ok"
        ? "FastAPI backend connected."
        : "Backend offline. The embedded scoring engine continues running.",
      status === "offline" ? "info" : "success"
    );
  };


  return (
    <div className="min-h-screen bg-[#F5F5F2] p-2 sm:p-4 lg:p-6 text-[#111111] flex flex-col font-sans">
      {/* Centered Portfolio Container */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col rounded-2xl sm:rounded-3xl border border-[#E5E5E5] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          backendStatus={backendStatus}
          onRetryBackend={handleRetryBackend}
          onOpenTour={() => setShowTourModal(true)}
          dataAvailable={dataAvailable}
        />

        {/* Main Content Surfaces */}
        <div className="flex-1 px-4 sm:px-8 lg:px-10 py-4 sm:py-6">
          {/* Interactive Views */}
          <main className="flex-1">
            {/* View 0: Portfolio Showcase */}
            {activeTab === "portfolio" && (
              <div className="flex flex-col animate-fade-in">
                <HeroSection
                  onExplore={() => setActiveTab("map")}
                  onOpenMethodology={() => setActiveTab("methodology")}
                />
                <TechStack />
                <StatsSection />

                {/* Featured Project Card */}
                {dataAvailable && (
                  <div className="mt-8 rounded-2xl border border-[#E5E5E5] bg-[#FAFAF8] p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-[11px] font-semibold text-[#666666]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#B51F3B]" />
                          Featured Project
                        </div>
                        <h3 className="mt-3 text-xl font-extrabold text-[#111111]">
                          India Livability Intelligence System
                        </h3>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#555555]">
                          Multi-criteria composite rankings across 61 Indian states and cities — air quality, public safety, healthcare, economy and cost of living — with OLS trend projections through 2033.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("map")}
                        className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#B51F3B] hover:shadow-md"
                      >
                        <Map size={14} />
                        <span>Open Explorer</span>
                        <ArrowUp size={14} className="rotate-90 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <AboutView
                    onOpenExplorer={() => setActiveTab("map")}
                    onOpenMethodology={() => setActiveTab("methodology")}
                  />
                </div>
              </div>
            )}

            {/* View 1: Explorer (Decision System) */}
            {dataAvailable && activeTab === "map" && (
              <div className="flex flex-col">
                <div className="mb-3 flex flex-col gap-1">
                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#E5E5E5] bg-[#FAFAF8] px-3 py-1 text-[11px] font-semibold text-[#666666]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B51F3B]" />
                    Interactive Decision Platform
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-[#111111] sm:text-2xl">
                    Spatial Explorer & Livability Rankings
                  </h2>
                  <p className="text-xs text-[#666666] sm:text-sm">
                    Rank places by available observations, inspect their coverage, and view eligible air trend projections.
                  </p>
                </div>

                <QuickStartBanner
                  onOpenTour={() => setShowTourModal(true)}
                  onSelectPreset={handleSelectPreset}
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:h-[calc(100dvh-13rem)] lg:min-h-[580px]">
                  {/* Left Column: Weights */}
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
                      onChangeActiveFactor={handleChangeActiveFactor}
                      selectedPresetId={selectedPresetId}
                      availableFactors={DATA_COVERAGE.availableFactors || []}
                      compositeAvailable={DATA_COVERAGE.compositeAvailable}
                    />
                  </div>

                  {/* Center Column: Interactive Map */}
                  <div
                    className={`h-[460px] sm:h-[540px] lg:col-span-6 lg:h-full flex flex-col min-h-0 ${
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
                    className={`h-[460px] sm:h-[540px] lg:col-span-3 lg:h-full flex flex-col min-h-0 ${
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

            {/* View 3: Methodology */}
            {activeTab === "methodology" && (
              <MethodologyView />
            )}

            {/* View 4: About & Code */}
            {activeTab === "about" && (
              <AboutView
                onOpenExplorer={() => setActiveTab("map")}
                onOpenMethodology={() => setActiveTab("methodology")}
              />
            )}
          </main>
        </div>


      </div>

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
