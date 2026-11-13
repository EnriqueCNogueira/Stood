import { type RefObject, useEffect } from "react";

// Fecha o menu aberto com clique fora do container ou Esc
export function useDismiss(containerRef: RefObject<HTMLElement | null>, isOpen: boolean, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [containerRef, isOpen, close]);
}
