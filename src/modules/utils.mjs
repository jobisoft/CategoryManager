export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export function filterObjectByKeyToNull(obj, predicate) {
  return Object.keys(obj)
    .filter((key) => predicate(key))
    .reduce((res, key) => ((res[key] = null), res), {});
}

export function sortMapByKey(map) {
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export function mergeSortedArrayAndRemoveDuplicates(arr1, arr2, cmp) {
  // GitHub Copilot wrote this function, it looks OK.
  let i = 0;
  let j = 0;
  const res = [];
  while (i < arr1.length && j < arr2.length) {
    const c = cmp(arr1[i], arr2[j]);
    if (c < 0) {
      res.push(arr1[i]);
      i++;
    } else if (c > 0) {
      res.push(arr2[j]);
      j++;
    } else {
      res.push(arr1[i]);
      i++;
      j++;
    }
  }
  while (i < arr1.length) {
    res.push(arr1[i]);
    i++;
  }
  while (j < arr2.length) {
    res.push(arr2[j]);
    j++;
  }
  return res;
}
