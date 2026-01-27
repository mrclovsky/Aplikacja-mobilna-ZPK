type Listener = (ids: Set<string>) => void;

class VisitedPointsStore {
  private points = new Map<string, Set<string>>();
  private subs = new Map<string, Set<Listener>>();

  private ensure(routeName: string) {
    if (!this.points.has(routeName)) this.points.set(routeName, new Set());
    if (!this.subs.has(routeName)) this.subs.set(routeName, new Set());
  }

  private notify(routeName: string) {
    const listeners = this.subs.get(routeName);
    if (!listeners || listeners.size === 0) return;
    const snapshot = new Set(this.points.get(routeName) ?? []);
    for (const fn of listeners) fn(snapshot);
  }

  add(routeName: string | null | undefined, pointId: string) {
    if (!routeName || !pointId) return;
    this.ensure(routeName);
    const set = this.points.get(routeName)!;
    const before = set.size;
    set.add(pointId);
    if (set.size !== before) this.notify(routeName);
  }

  has(routeName: string | null | undefined, pointId: string) {
    if (!routeName || !pointId) return false;
    return this.points.get(routeName)?.has(pointId) ?? false;
  }

  clear(routeName: string | null | undefined) {
    if (!routeName) return;
    this.ensure(routeName);
    const set = this.points.get(routeName)!;
    if (set.size > 0) {
      set.clear();
      this.notify(routeName);
    }
  }

  subscribe(routeName: string | null | undefined, listener: Listener) {
    if (!routeName || typeof listener !== "function") return () => {};
    this.ensure(routeName);
    const bucket = this.subs.get(routeName)!;
    bucket.add(listener);
    return () => {
      bucket.delete(listener);
      if (bucket.size === 0) this.subs.delete(routeName);
    };
  }
}

export const visitedStore = new VisitedPointsStore();
