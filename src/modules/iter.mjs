export function* filterIter(source, predicate) {
  let c = 0;
  for (const value of source) {
    if (predicate(value, c++)) {
      yield value;
    }
  }
}
