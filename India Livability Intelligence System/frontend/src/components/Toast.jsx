import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const TONES = {
  info: {
    icon: Info,
    shell: "border-cyan-400/30 bg-cyan-950/80 text-cyan-100",
    iconClass: "text-cyan-300"
  },
  success: {
    icon: CheckCircle2,
    shell: "border-emerald-400/30 bg-emerald-950/80 text-emerald-100",
    iconClass: "text-emerald-300"
  },
  warning: {
    icon: AlertTriangle,
    shell: "border-amber-400/30 bg-amber-950/80 text-amber-100",
    iconClass: "text-amber-300"
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
        className={`pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-xl animate-slide-down ${tone.shell}`}
      >
        <Icon size={16} className={`mt-0.5 shrink-0 ${tone.iconClass}`} />
        <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-current/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
