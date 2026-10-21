"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { useDoorPhase, onDoorsClosed, onDoorsOpened, markRouteSettled } from "@/lib/door-transition";

const EASE = [0.76, 0, 0.24, 1] as const;

export function DoorOverlay() {
  const phase = useDoorPhase();
  const pathname = usePathname();
  const covering = phase === "closing" || phase === "closed";

  // Fires after the new route has actually committed and painted (not on a
  // fixed timer) -- this is what tells the doors it's safe to open without
  // revealing the previous page underneath.
  useEffect(() => {
    markRouteSettled();
  }, [pathname]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ pointerEvents: phase === "idle" ? "none" : "auto" }}
      aria-hidden
    >
      <motion.div
        className="h-1/2 w-full bg-black"
        initial={false}
        animate={{ y: covering ? "0%" : "-100%" }}
        transition={{ duration: 0.55, ease: EASE }}
        onAnimationComplete={() => {
          if (phase === "closing") onDoorsClosed();
          if (phase === "opening") onDoorsOpened();
        }}
      />
      <motion.div
        className="h-1/2 w-full bg-black"
        initial={false}
        animate={{ y: covering ? "0%" : "100%" }}
        transition={{ duration: 0.55, ease: EASE }}
      />

      <AnimatePresence>
        {phase === "closed" && (
          <motion.div
            key="door-seal-badge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex size-14 items-center justify-center rounded-xl bg-white text-black shadow-lg shadow-black/40">
              <ShieldCheck className="size-7" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
