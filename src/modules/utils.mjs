export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export function* mapIterator(iterator, mapping) {
  // map on an iterator without turning it into an array
  for (let i of iterator) {
    yield mapping(i);
  }
}

export function filterObject(obj, predicate) {
  return Object.keys(obj)
    .filter((key) => predicate(obj[key]))
    .reduce((res, key) => ((res[key] = obj[key]), res), {});
}
