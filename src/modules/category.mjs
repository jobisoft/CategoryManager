import { isEmptyObject, filterObjectByKeyToNull } from "./utils.mjs";

export class Category {
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
    buildUncategorizedCategory(this);
  }
  isLeaf() {
    return isLeafCategory(this);
  }
}

export function categoryArrToString(cat) {
  return cat.join(" / ");
}

export function isLeafCategory(cat) {
  return isEmptyObject(cat.categories);
}

export function buildUncategorizedCategory(category) {
  // only call this method once
  if (isLeafCategory(category)) {
    // recursion base case
    return;
  }
  let contacts = {};
  for (let cat in category.categories) {
    // 1. build uncategorized for sub category
    buildUncategorizedCategory(category.categories[cat]);
    // 2. add contacts from subcategory to `contacts`
    Object.assign(contacts, category.categories[cat].contacts);
  }
  // Get the contacts that doesn't appear in any categories
  const filtered = filterObjectByKeyToNull(
    category.contacts,
    (x) => !(x in contacts)
  );
  if (!isEmptyObject(filtered)) {
    category.uncategorized = new Category("Uncategorized", filtered, {}, true);
  }
}
