export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export function filterObjectByKeyToNull(obj, predicate) {
  return Object.keys(obj)
    .filter((key) => predicate(key))
    .reduce((res, key) => ((res[key] = null), res), {});
}
