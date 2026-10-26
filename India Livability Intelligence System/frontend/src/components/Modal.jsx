import { useRef } from "react";
import { createPortal } from "react-dom";
import useModalBehavior from "../hooks/useModalBehavior";

export default function Modal({ onClose, children, className = "", label = "Dialog" }) {
  const panelRef = useRef(null);
  useModalBehavior(panelRef, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md animate-fade-in sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`surface relative flex max-h-[92dvh] w-full flex-col overflow-hidden animate-scale-in ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
