// Unused
export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

// Unused
export function filterObjectByKeyToNull(obj, predicate) {
  return Object.keys(obj)
    .filter((key) => predicate(key))
    .reduce((res, key) => ((res[key] = null), res), {});
}

export function sortMapByKey(map) {
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
