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
  static createUncategorizedCategory(baseCategoryStr, contacts = {}) {
    const newPath =
      baseCategoryStr == null
        ? "Uncategorized"
        : baseCategoryStr + SUBCATEGORY_SEPARATOR + "Uncategorized";
    return new Category("Uncategorized", newPath, contacts, {}, true);
  }
  static createSubcategory(parentCategoryObj, name, contacts = {}) {
    const newPath =
      parentCategoryObj.path == null
        ? name
        : parentCategoryObj.path + SUBCATEGORY_SEPARATOR + name;
    return new Category(name, newPath, contacts);
  }
}

export function categoryObjToString(cat) {
  return categoryPathToString(cat.path, cat.isUncategorized);
}

export function categoryArrToString(cat) {
  return cat.join(SUBCATEGORY_SEPARATOR);
}

export function categoryStringToArr(cat) {
  return cat.split(SUBCATEGORY_SEPARATOR);
}

export function isLeafCategory(cat) {
  return isEmptyObject(cat.categories);
}

export function isSubcategoryOf(childStr, parentStr) {
  return childStr.startsWith(parentStr + SUBCATEGORY_SEPARATOR);
}

export function categoryPathToString(categoryPath, isUncategorized) {
  if (!isUncategorized) return categoryPath;
  const idx = categoryPath.lastIndexOf(SUBCATEGORY_SEPARATOR);
  return idx !== -1
    ? categoryPath.substring(0, categoryPath.lastIndexOf(SUBCATEGORY_SEPARATOR))
    : categoryPath; // Top Level Uncategorized category
}

export function buildUncategorizedCategory(category, recursive = true) {
  // only call this method once
  if (isLeafCategory(category) && category.path != null) {
    // recursion base case
    return;
  }
  let contacts = {};
  for (let cat in category.categories) {
    // 1. build uncategorized for sub category
    if (recursive) buildUncategorizedCategory(category.categories[cat]);
    // 2. add contacts from subcategory to `contacts`
    Object.assign(contacts, category.categories[cat].contacts);
  }
  // Get the contacts that doesn't appear in any categories
  const filtered = filterObjectByKeyToNull(
    category.contacts,
    (x) => !(x in contacts)
  );
  const newPath =
    category.path === null
      ? "Uncategorized"
      : category.path + SUBCATEGORY_SEPARATOR + "Uncategorized";
  if (!isEmptyObject(filtered)) {
    category.uncategorized = new Category(
      "Uncategorized",
      newPath,
      filtered,
      {},
      true
    );
  } else {
    category.uncategorized = null;
  }
}

export function validateCategoryString(s) {
  if (s == null || s.trim() === "") {
    return "Category should not be empty.";
  }
  const splitted = categoryStringToArr(s);
  for (const cat of splitted) {
    if (cat.trim() == "") {
      return "Subcategory should not be empty.";
    }
  }
  return "LGTM";
}

export function isContactInCategory(categoryObj, contactId) {
  return contactId in categoryObj.contacts;
}

export function isContactInAnySubcategory(categoryObj, contactId) {
  let result = false;
  for (const categoryName in categoryObj.categories) {
    const subcategory = categoryObj.categories[categoryName];
    if (isContactInCategory(subcategory, contactId)) {
      result = true;
      break;
    }
  }
  return result;
}

export function shouldContactBeUncategorized(categoryObj, contactId) {
  let uncategorized = true;
  for (const catName in categoryObj.categories) {
    const subcategory = categoryObj.categories[catName];
    if (isContactInCategory(subcategory, contactId)) {
      uncategorized = false;
      break;
    }
  }
  return uncategorized;
}
