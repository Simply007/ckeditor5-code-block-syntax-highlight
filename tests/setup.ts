/**
 * jsdom has no ResizeObserver, and a real editor will not start without one. Assigned
 * directly rather than with `vi.stubGlobal`, which `unstubGlobals` would undo.
 */
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = NoopResizeObserver;
