export function* filterIter(source, predicate) {
  let c = 0;
  for (const value of source) {
    if (predicate(value, c++)) {
      yield value;
    }
  }
}

export function* mapIter(iterator, mapping) {
  // map on an iterator without turning it into an array
  for (let i of iterator) {
    yield mapping(i);
  }
}
