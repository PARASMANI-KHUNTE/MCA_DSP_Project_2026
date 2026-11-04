import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const TONES = {
  info: {
    icon: Info,
    shell: "border-[#E5E5E5] bg-white text-[#111111] shadow-xl",
    iconClass: "text-[#B51F3B]"
  },
  success: {
    icon: CheckCircle2,
    shell: "border-emerald-200 bg-white text-[#111111] shadow-xl",
    iconClass: "text-emerald-700"
  },
  warning: {
    icon: AlertTriangle,
    shell: "border-amber-200 bg-white text-[#111111] shadow-xl",
    iconClass: "text-amber-700"
  }
};

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.icon;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[90] flex justify-center px-3 sm:top-24">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl animate-slide-down ${tone.shell}`}
      >
        <Icon size={16} className={`mt-0.5 shrink-0 ${tone.iconClass}`} />
        <p className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</p>
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-[#888888] transition-colors hover:bg-[#FAFAF8] hover:text-[#111111]"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
