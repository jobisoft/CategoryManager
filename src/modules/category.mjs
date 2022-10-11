import { isEmptyObject } from "./utils.mjs";

export const uncategorized = Symbol("Uncategorized");

class Category {
  categories;
  name;
  contacts;
  isUncategorized;
  constructor(
    name,
    contacts = [],
    subCategories = {},
    isUncategorized = false
  ) {
    this.name = name;
    this.categories = subCategories;
    this.contacts = contacts;
    this.isUncategorized = isUncategorized;
  }
  buildUncategorized() {
    // only call this method once
    if (isEmptyObject(this.categories)) {
      // recursion base case
      return this.contacts;
    }
    let contacts = new Set();
    for (let cat in this.categories) {
      this.categories[cat]
        .buildUncategorized() // 1. build uncategorized for sub category
        .forEach(contacts.add, contacts); // 2. add contacts from subcategory to `contacts`
    }
    const filtered = this.contacts.filter((x) => !contacts.has(x));
    if (filtered.length > 0) {
      this.categories[uncategorized] = new Category(
        "Uncategorized",
        filtered,
        {},
        true
      );
    }
    return this.contacts;
  }
}

export { Category };
