import { ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import {
  CAMERA_PRESETS,
  CameraPresetId,
  CHIP_META,
  ChipId,
  WORKLOAD_PROFILES,
  WorkloadId,
} from '../data/socSpecs';

interface ControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  explode: number;
  onExplodeChange: (val: number) => void;
  chip: ChipId;
  onChipChange: (chip: ChipId) => void;
  workload: WorkloadId;
  onWorkloadChange: (w: WorkloadId) => void;
  activePreset: CameraPresetId | null;
  onSelectPreset: (id: CameraPresetId) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}

const WORKLOAD_ORDER: WorkloadId[] = ['idle', 'gaming', 'ai', 'multitasking'];

export function ControlDock({
  collapsed,
  onToggleCollapse,
  explode,
  onExplodeChange,
  chip,
  onChipChange,
  workload,
  onWorkloadChange,
  activePreset,
  onSelectPreset,
  autoRotate,
  onToggleAutoRotate,
}: ControlDockProps) {
  return (
    <div
      className="fixed bottom-5 left-1/2 z-20 w-[min(940px,94vw)] transition-transform duration-300 ease-out pointer-events-none"
      style={{
        transform: collapsed
          ? 'translate(-50%, calc(100% + 20px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Collapse / Expand Toggle attached to top center of dock */}
      <div className="flex justify-center mb-2 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'إظهار لوحة التحكم' : 'إخفاء لوحة التحكم'}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-slate-200 bg-[#0d121c]/95 border border-white/15 rounded-lg hover:border-amber-400/50 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          style={{
            transform: collapsed ? 'translateY(-44px)' : 'translateY(0)',
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>إظهار التحكم (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              <span>إخفاء التحكم (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Unified Bottom Control Surface (solid/rgba without backdrop-filter over WebGL) */}
      <div className="pointer-events-auto bg-[#0d121c]/92 border border-white/12 rounded-xl px-4 py-3.5 shadow-2xl">
        <div className="flex flex-col gap-3">
          {/* Top Row: Chip Selector + Exploded Slider + Auto-Rotate */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                المعالج:
              </span>
              <div
                role="group"
                aria-label="اختيار المعالج"
                className="flex items-center gap-1 p-1 bg-[#070a10] border border-white/10 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => onChipChange('helio-g81')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chip === 'helio-g81'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {CHIP_META['helio-g81'].shortLabelAr}
                </button>
                <button
                  type="button"
                  onClick={() => onChipChange('sd-8-elite')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chip === 'sd-8-elite'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {CHIP_META['sd-8-elite'].shortLabelAr}
                </button>
              </div>
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-xs">
              <label
                htmlFor="explode-slider"
                className="text-xs text-slate-300 whitespace-nowrap shrink-0"
              >
                تفكيك الطبقات
              </label>
              <input
                id="explode-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => onExplodeChange(parseFloat(e.target.value))}
                className="soc-slider w-full"
              />
              <span className="font-mono text-xs text-amber-400 w-9 text-left shrink-0">
                {Math.round(explode * 100)}%
              </span>
            </div>

            {/* Auto Rotate Button */}
            <button
              type="button"
              onClick={onToggleAutoRotate}
              aria-pressed={autoRotate}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoRotate
                  ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                  : 'bg-[#070a10] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>دوران تلقائي</span>
            </button>
          </div>

          {/* Bottom Row: Workload Selector & Camera Viewpoints */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Workload Mode Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                حمل العمل:
              </span>
              <div className="flex items-center gap-1">
                {WORKLOAD_ORDER.map((wId) => {
                  const profile = WORKLOAD_PROFILES[wId];
                  const active = workload === wId;
                  return (
                    <button
                      key={wId}
                      type="button"
                      onClick={() => onWorkloadChange(wId)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {profile.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Viewpoint Presets */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                الكاميرا:
              </span>
              <div className="flex items-center gap-1">
                {CAMERA_PRESETS.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {preset.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
