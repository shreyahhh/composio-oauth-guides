"use client";

import { useSyncExternalStore } from "react";

// Two vertical panels that slide in from the left/right edges to meet in
// the middle (closing), hide the route swap underneath, then slide back out
// (opening) -- a horizontal "double doors" page transition. Lives as a
// module-level store (not React context) because the overlay is mounted
// once in the root layout, which persists across the landing -> dashboard
// navigation, while the trigger (the landing page's Start button) and the
// overlay are otherwise unrelated components in the tree.
export type DoorPhase = "idle" | "closing" | "closed" | "opening";

let phase: DoorPhase = "idle";
let pendingNavigate: (() => void) | null = null;
const listeners = new Set<() => void>();

function setPhase(next: DoorPhase) {
  phase = next;
  listeners.forEach((l) => l());
}

export function runDoorTransition(navigate: () => void) {
  if (phase !== "idle") return;
  pendingNavigate = navigate;
  setPhase("closing");
}

/** Called by the overlay once the closing slide finishes. */
export function onDoorsClosed() {
  if (phase !== "closing") return;
  setPhase("closed");
  pendingNavigate?.();
  pendingNavigate = null;
  // Don't guess how long the destination route takes to render (it's a
  // Server Component hitting the DB, so this varies) -- wait for
  // markRouteSettled() to fire once the new route has actually committed.
  // This timeout is only a safety net in case that never happens.
  setTimeout(() => {
    if (phase === "closed") setPhase("opening");
  }, 4000);
}

/** Called once the destination route has actually rendered (see DoorOverlay's
 * pathname effect) -- only then is it safe to slide the doors back open
 * without revealing a stale previous page underneath. */
export function markRouteSettled() {
  if (phase !== "closed") return;
  // Two rAFs: the first fires before the browser's next paint of the new
  // route content, the second confirms that paint has happened.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => setPhase("opening"));
  });
}

/** Called by the overlay once the opening slide finishes. */
export function onDoorsOpened() {
  if (phase !== "opening") return;
  setPhase("idle");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DoorPhase {
  return phase;
}

function getServerSnapshot(): DoorPhase {
  return "idle";
}

export function useDoorPhase(): DoorPhase {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
