import { isEmptyObject, filterObjectByKeyToNull } from "./utils.mjs";

class Category {
  categories;
  name;
  contacts;
  isUncategorized;
  uncategorized;
  constructor(
    name,
    contacts = {},
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
      return;
    }
    let contacts = {};
    for (let cat in this.categories) {
      // 1. build uncategorized for sub category
      this.categories[cat].buildUncategorized();
      // 2. add contacts from subcategory to `contacts`
      Object.assign(contacts, this.categories[cat].contacts);
    }
    // Get the contacts that doesn't appear in any categories
    const filtered = filterObjectByKeyToNull(this.contacts, (x) => !(x in contacts));
    if (!isEmptyObject(filtered)) {
      this.uncategorized = new Category("Uncategorized", filtered, {}, true);
    }
  }
}

export { Category };
