import { X } from 'lucide-react';
import {
  ChipId,
  SUBSYSTEM_SPECS,
  SubsystemId,
  WORKLOAD_PROFILES,
  WorkloadId,
} from '../data/socSpecs';

interface ComparisonModalProps {
  open: boolean;
  onClose: () => void;
  activeChip: ChipId;
  activeWorkload: WorkloadId;
}

const COMPARE_IDS: SubsystemId[] = ['cpu', 'gpu', 'npu', 'cache', 'transistor', 'substrate'];

export function ComparisonModal({
  open,
  onClose,
  activeChip,
  activeWorkload,
}: ComparisonModalProps) {
  if (!open) return null;

  const statsG81 = WORKLOAD_PROFILES[activeWorkload].specs['helio-g81'];
  const statsElite = WORKLOAD_PROFILES[activeWorkload].specs['sd-8-elite'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المواصفات الكاملة لمعالج Helio G81 والمقارنة مع 8 Elite"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0d121c] border border-white/15 rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              مواصفات ميدياتك هيليو G81 مقابل Snapdragon 8 Elite
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              مقارنة الأداء تحت حمل: {WORKLOAD_PROFILES[activeWorkload].labelAr}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المواصفات"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Workload Numerical Comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-white/10">
          <div>
            <p className="text-xs text-slate-400">معدل الإطارات</p>
            <p className="font-mono text-lg font-semibold text-sky-300 mt-1">
              {statsG81.fps} FPS
            </p>
            <p className="font-mono text-xs text-slate-500">
              مقابل {statsElite.fps} في 8 Elite
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">تردد المعالج</p>
            <p className="font-mono text-lg font-semibold text-sky-300 mt-1">
              {statsG81.clockGhz.toFixed(2)} GHz
            </p>
            <p className="font-mono text-xs text-slate-500">
              مقابل {statsElite.clockGhz.toFixed(2)} GHz
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">استهلاك الطاقة</p>
            <p className="font-mono text-lg font-semibold text-emerald-400 mt-1">
              {statsG81.powerWatts} W
            </p>
            <p className="font-mono text-xs text-slate-500">
              مقابل {statsElite.powerWatts} W
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">درجة الحرارة</p>
            <p className="font-mono text-lg font-semibold text-slate-100 mt-1">
              {statsG81.tempCelsius}°C
            </p>
            <p className="font-mono text-xs text-slate-500">
              مقابل {statsElite.tempCelsius}°C
            </p>
          </div>
        </div>

        {/* Subsystem Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-2.5 pl-3 font-medium">الوحدة المعمارية</th>
                <th
                  className={`py-2.5 px-3 font-medium ${
                    activeChip === 'helio-g81' ? 'text-sky-300' : ''
                  }`}
                >
                  Helio G81 (12nm)
                </th>
                <th
                  className={`py-2.5 pr-3 font-medium ${
                    activeChip === 'sd-8-elite' ? 'text-amber-400' : ''
                  }`}
                >
                  8 Elite (3nm)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {COMPARE_IDS.map((id) => {
                const item = SUBSYSTEM_SPECS[id];
                return (
                  <tr key={id}>
                    <td className="py-3 pl-3 font-medium text-slate-100">
                      {item.metricLabelAr}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-sky-300">
                      {item.specsByChip['helio-g81'].metricValue}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-amber-400">
                      {item.specsByChip['sd-8-elite'].metricValue}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
