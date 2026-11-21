import { X } from 'lucide-react';
import { ChipId, SUBSYSTEM_SPECS, SubsystemId } from '../data/socSpecs';

interface SubsystemInspectorProps {
  subsystemId: SubsystemId;
  activeChip: ChipId;
  onClose: () => void;
}

export function SubsystemInspector({
  subsystemId,
  activeChip,
  onClose,
}: SubsystemInspectorProps) {
  const container = SUBSYSTEM_SPECS[subsystemId];
  const spec = container.specsByChip[activeChip];
  const g81Metric = container.specsByChip['helio-g81'].metricValue;
  const eliteMetric = container.specsByChip['sd-8-elite'].metricValue;

  return (
    <aside
      aria-label={spec.titleAr}
      className="fixed top-20 left-5 z-20 w-[min(350px,calc(100vw-40px))] bg-[#0d121c]/94 border border-white/12 rounded-xl p-4 shadow-2xl pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-amber-400 font-medium">{spec.subtitleAr}</p>
          <h2 className="text-base font-bold text-white leading-snug mt-0.5">
            {spec.titleAr}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق التفاصيل"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {spec.summaryAr}
      </p>

      <div className="pt-3 border-t border-white/10 mb-3">
        <p className="text-xs font-semibold text-sky-300 mb-1">
          السلاسة والكفاءة في المهام الفعلية
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          {spec.insightAr}
        </p>
      </div>

      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">{container.metricLabelAr}</span>
        <div className="flex items-center gap-2 font-mono">
          <span
            className={
              activeChip === 'helio-g81'
                ? 'text-sky-300 font-semibold'
                : 'text-slate-500'
            }
          >
            {g81Metric}
          </span>
          <span className="text-slate-600">/</span>
          <span
            className={
              activeChip === 'sd-8-elite'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-500'
            }
          >
            {eliteMetric}
          </span>
        </div>
      </div>
    </aside>
  );
}
