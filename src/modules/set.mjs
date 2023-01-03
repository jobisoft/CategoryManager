export function setEqual(xs, ys) {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}

// Set intersection for ES6 Set.
export function setIntersection(a, b) {
  return new Set([...a].filter((x) => b.has(x)));
}
