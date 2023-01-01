import { isEmptyObject, filterObjectByKeyToNull } from "../utils.mjs";

export const SUBCATEGORY_SEPARATOR = " / ";

export class Category {
  categories;
  name;
  path;
  contacts;
  isUncategorized;
  uncategorized;
  constructor(
    name,
    path,
    contacts = {},
    subCategories = {},
    isUncategorized = false
  ) {
    this.name = name;
    this.path = path;
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
  return cat.join(SUBCATEGORY_SEPARATOR);
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
    category.uncategorized = new Category(
      "Uncategorized",
      category.path + SUBCATEGORY_SEPARATOR + "Uncategorized",
      filtered,
      {},
      true
    );
  }
}

export function validateCategoryString(s) {
  if (s == null || s.trim() === "") {
    return "Category should not be empty.";
  }
  const splitted = s.split(SUBCATEGORY_SEPARATOR);
  for (const cat of splitted) {
    if (cat.trim() == "") {
      return "Subcategory should not be empty.";
    }
  }
  return "LGTM";
}
