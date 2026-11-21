import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  CHIP_META,
  ChipId,
  SUBSYSTEM_SPECS,
  SubsystemId,
  WORKLOAD_PROFILES,
  WorkloadId,
} from './data/socSpecs';
import {
  initSocScene,
  SceneControllerHandle,
} from './three/sceneController';
import { ControlDock } from './components/ControlDock';
import { SubsystemInspector } from './components/SubsystemInspector';
import { ComparisonModal } from './components/ComparisonModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<SceneControllerHandle | null>(null);

  const [explode, setExplode] = useState<number>(0.35);
  const [chip, setChip] = useState<ChipId>('helio-g81');
  const [workload, setWorkload] = useState<WorkloadId>('gaming');
  const [activePreset, setActivePreset] = useState<CameraPresetId | null>('overview');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemId | null>(null);
  const [hoveredSubsystem, setHoveredSubsystem] = useState<SubsystemId | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);

  // Mount Three.js scene once in an isolated ref container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const controller = initSocScene(
      container,
      {
        explode: 0.35,
        chip: 'helio-g81',
        workload: 'gaming',
        selectedSubsystem: null,
        autoRotate: true,
      },
      {
        onSelectSubsystem: (id) => setSelectedSubsystem(id),
        onHoverSubsystem: (id) => setHoveredSubsystem(id),
        onContextLostChange: (lost) => setContextLost(lost),
      },
    );

    sceneControllerRef.current = controller;

    return () => {
      controller.dispose();
      sceneControllerRef.current = null;
    };
  }, []);

  // Push React control state into Three.js without recreating canvas
  useEffect(() => {
    sceneControllerRef.current?.syncState({
      explode,
      chip,
      workload,
      selectedSubsystem,
      autoRotate,
    });
  }, [explode, chip, workload, selectedSubsystem, autoRotate]);

  // Keyboard shortcuts: 'H' toggles Cinema/Zen mode, 'Escape' closes modals/inspector
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H' || e.key === 'ا') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (comparisonOpen) {
          setComparisonOpen(false);
        } else if (selectedSubsystem) {
          setSelectedSubsystem(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [comparisonOpen, selectedSubsystem]);

  const handleSelectPreset = useCallback((presetId: CameraPresetId) => {
    setActivePreset(presetId);
    const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (preset && typeof preset.suggestedExplode === 'number') {
      setExplode(preset.suggestedExplode);
    }
    if (presetId === 'transistor') {
      setSelectedSubsystem('transistor');
    }
    sceneControllerRef.current?.goToPreset(presetId);
  }, []);

  const handleExplodeChange = useCallback((val: number) => {
    setExplode(val);
    setActivePreset(null);
  }, []);

  const activeStats = WORKLOAD_PROFILES[workload].specs[chip];
  const chipMeta = CHIP_META[chip];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090C12] select-none">
      {/* Isolated Full-Bleed WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 z-0 w-full h-full"
        aria-label={`نموذج ثلاثي الأبعاد لمعالج ${chipMeta.nameAr}`}
      />

      {/* Graceful WebGL Context Loss Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090C12] p-6 text-center">
          <div className="max-w-md bg-[#0d121c] border border-white/15 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">
              تم إيقاف محرك العرض ثلاثي الأبعاد مؤقتاً
            </h2>
            <p className="text-sm text-slate-400">
              يجري استعادة سياق WebGL لعرض معمارية {chipMeta.nameAr}. يمكنك تحديث الصفحة إذا لم تستأنف المحاكاة تلقائياً.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Top Bar: Single-line title + unboxed tabular readout + 1 primary action */}
      <header className="fixed top-0 inset-x-0 z-10 flex items-center justify-between gap-6 px-5 py-3.5 pointer-events-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pointer-events-auto">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            {chipMeta.nameAr}
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-mono whitespace-nowrap shrink-0">
            <span className={chip === 'helio-g81' ? 'text-sky-300 font-semibold' : 'text-amber-400 font-semibold'}>
              {chipMeta.nodeLabel}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{activeStats.fps} FPS</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{activeStats.clockGhz.toFixed(2)} GHz</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{activeStats.powerWatts.toFixed(2)} W</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{activeStats.tempCelsius}°C</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>سلاسة {activeStats.smoothnessPct}%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setComparisonOpen(true)}
          className="pointer-events-auto px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
        >
          المواصفات والمقارنة
        </button>
      </header>

      {/* Subtle Hover Hint above bottom dock */}
      {hoveredSubsystem && !dockCollapsed && (
        <div className="fixed bottom-[134px] left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:block">
          <p className="text-xs text-slate-200 bg-[#0d121c]/92 border border-white/12 rounded-lg px-3 py-1.5 whitespace-nowrap">
            انقر للفحص: {SUBSYSTEM_SPECS[hoveredSubsystem].specsByChip[chip].titleAr}
          </p>
        </div>
      )}

      {/* Dismissible Raycast Inspector Card (only visible when user selects a 3D subsystem) */}
      {selectedSubsystem && (
        <SubsystemInspector
          subsystemId={selectedSubsystem}
          activeChip={chip}
          onClose={() => setSelectedSubsystem(null)}
        />
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      <ControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        explode={explode}
        onExplodeChange={handleExplodeChange}
        chip={chip}
        onChipChange={setChip}
        workload={workload}
        onWorkloadChange={setWorkload}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
      />

      {/* Technical Comparison Modal */}
      <ComparisonModal
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        activeChip={chip}
        activeWorkload={workload}
      />
    </div>
  );
}
