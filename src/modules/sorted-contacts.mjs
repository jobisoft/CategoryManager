/******************************************************************
 * js-sorted-set from https://github.com/adamhooper/js-sorted-set *
 * license: Public Domain                                         *
 * This is a modified version of the original code.               *
 * Modifications:                                                 *
 * - Remove other strategies and only keep ArrayStrategy.         *
 * - Use onInsertConflictIgnore by default                        *
 * - Rename it to SortedContacts                                  *
 * - Fix a bug in `ArrayStrategy.contains()`                      *
 * - Remove useless Iterator(which is not ES6 iter) related code  *
 * - Change the code to directly use an array, which is           *
 *   serializable.                                                *
 ******************************************************************/

/**********************************************************************************
 * According to some simple jsPerf tests, you should use ArrayStrategy            *
 * if you plan on maintaining about 100 to 1,000 items in your set. At that size, *
 * ArrayStrategy's insert() and remove() are fastest in today's browsers;         *
 * and ArrayStrategy's iteration is faster at all sizes.                          *
 *                                                                                *
 * Let's use array strategy for now because I don't think we'll have more         *
 * than 1000 contacts in the contact list.                                        *
 **********************************************************************************/

const binarySearchForIndex = (array, value, comparator) => {
  let low = 0;
  let high = array.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (comparator(array[mid], value) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
};

export class SortedContacts {
  constructor() {
    if (this instanceof SortedContacts) {
      throw Error("This is a static class");
    }
  }

  static insert(data, value, comparator) {
    const index = binarySearchForIndex(data, value, comparator);
    if (data[index] !== void 0 && comparator(data[index], value) === 0) {
      // Modification: do nothing if the value is already in the set.
      return;
    } else {
      return data.splice(index, 0, value);
    }
  }

  static remove(data, value, comparator) {
    const index = binarySearchForIndex(data, value, comparator);
    if (comparator(data[index], value) !== 0) {
      throw "Value not in set";
    }
    return data.splice(index, 1);
  }

  static clear(data) {
    return (data.length = 0);
  }

  static contains(data, value, comparator) {
    const index = binarySearchForIndex(data, value, comparator);
    return index !== data.length && comparator(data[index], value) === 0;
  }
}
