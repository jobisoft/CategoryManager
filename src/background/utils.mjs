export function expose(name, value) {
  globalThis[name] = value;
}
