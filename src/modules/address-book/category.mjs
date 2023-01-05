import {
  isEmptyObject,
  filterObjectByKeyToNull,
  mergeSortedArrayAndRemoveDuplicates,
} from "../utils.mjs";
import {
  SUBCATEGORY_SEPARATOR,
  isLeafCategory,
  UNCATEGORIZED_CATEGORY_NAME,
} from "./category-utils.mjs";

export class Category {
  categories;
  name;
  path;
  contacts;
  contactKeys;
  isUncategorized;
  uncategorized;
  constructor(
    name,
    path,
    contacts = {},
    subCategories = new Map(),
    isUncategorized = false
  ) {
    this.name = name;
    this.path = path;
    this.categories = subCategories;
    this.contacts = contacts;
    this.isUncategorized = isUncategorized;
  }
  buildUncategorized() {
    buildCategory(this);
  }
  isLeaf() {
    return isLeafCategory(this);
  }
  static createUncategorizedCategory(baseCategoryStr, contacts = {}) {
    const newPath =
      baseCategoryStr == null
        ? UNCATEGORIZED_CATEGORY_NAME
        : baseCategoryStr + SUBCATEGORY_SEPARATOR + UNCATEGORIZED_CATEGORY_NAME;
    return new Category(
      UNCATEGORIZED_CATEGORY_NAME,
      newPath,
      contacts,
      new Map(),
      true
    );
  }
  static createSubcategory(parentCategoryObj, name, contacts = {}) {
    const newPath =
      parentCategoryObj.path == null
        ? name
        : parentCategoryObj.path + SUBCATEGORY_SEPARATOR + name;
    return new Category(name, newPath, contacts);
  }
}

export function buildCategory(
  addressBook,
  category,
  recursive = true,
  buildContactKeys = false
) {
  if (isLeafCategory(category) && category.path != null) {
    // recursion base case
    if (buildContactKeys) {
      category.contactKeys = Object.keys(category.contacts).sort((a, b) =>
        addressBook.contacts[a].name.localeCompare(addressBook.contacts[b].name)
      );
    }
    return;
  }
  let contacts = {};
  let contactKeysFromSubcats = [];
  for (const catObj of category.categories.values()) {
    // 1. build uncategorized for sub category
    if (recursive)
      buildCategory(addressBook, catObj, recursive, buildContactKeys);
    // 2. add contacts from subcategory to `contacts`
    Object.assign(contacts, catObj.contacts);
    contactKeysFromSubcats.push(catObj.contactKeys);
  }

  // Get the contacts that doesn't appear in any categories
  const filtered = filterObjectByKeyToNull(
    category.contacts,
    (x) => !(x in contacts)
  );
  const newPath =
    category.path === null
      ? UNCATEGORIZED_CATEGORY_NAME
      : category.path + SUBCATEGORY_SEPARATOR + UNCATEGORIZED_CATEGORY_NAME;
  if (!isEmptyObject(filtered)) {
    category.uncategorized = new Category(
      UNCATEGORIZED_CATEGORY_NAME,
      newPath,
      filtered,
      {},
      true
    );
    if (buildContactKeys)
      category.uncategorized.contactKeys = Object.keys(filtered).sort((a, b) =>
        addressBook.contacts[a].name.localeCompare(addressBook.contacts[b].name)
      );
  } else {
    category.uncategorized = null;
  }
  if (buildContactKeys) {
    // Merge all the sorted array together.
    // It should be faster than a re-sort but we haven't done any benchmark.
    category.contactKeys = contactKeysFromSubcats.reduce(
      (acc, cur) =>
        mergeSortedArrayAndRemoveDuplicates(acc, cur, (a, b) =>
          addressBook.contacts[a].name.localeCompare(
            addressBook.contacts[b].name
          )
        ),
      category.uncategorized?.contactKeys ?? []
    );
  }
}
