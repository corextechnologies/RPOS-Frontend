/**
 * Connectivity signals for the drain trigger and the offline affordance.
 *
 * `navigator.onLine` is a hint, not the truth — it reports "connected to *a*
 * network", which a captive-portal Wi-Fi or a dead uplink both pass. So the
 * seam never trusts it to *decide* online vs offline; that decision is made by
 * actually trying the request and catching `PosNetworkError`. What `onLine` is
 * good for is the reverse edge: the `online` event is a reliable "the network
 * just came back — try draining now" nudge, and `offline` flips the badge.
 */

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/** Subscribe to the browser regaining connectivity. Returns an unsubscribe fn. */
export function onOnline(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", fn);
  return () => window.removeEventListener("online", fn);
}

/** Subscribe to either connectivity edge — for the "offline" indicator. */
export function onConnectivityChange(fn: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const up = () => fn(true);
  const down = () => fn(false);
  window.addEventListener("online", up);
  window.addEventListener("offline", down);
  return () => {
    window.removeEventListener("online", up);
    window.removeEventListener("offline", down);
  };
}
