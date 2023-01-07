export const SUBCATEGORY_SEPARATOR = " / ";
export const UNCATEGORIZED_CATEGORY_NAME = await browser.i18n.getMessage(
  "tree.category.none"
);

const VALIDATION_ERR_EMPTY_CATEGORY = await browser.i18n.getMessage(
  "validation-error.empty-category"
);

const VALIDATION_ERR_EMPTY_SUBCATEGORY = await browser.i18n.getMessage(
  "validation-error.empty-subcategory"
);

export class Category {
  constructor(
    name,
    path,
    contacts = new Map(),
    subCategories = new Map(),
    isUncategorized = false
  ) {
    this.name = name;
    this.path = path;
    this.categories = subCategories;
    this.contacts = contacts;
    this.isUncategorized = isUncategorized;
  }
    
  static createSubcategory(parentCategoryObj, name, contacts) {
    const newPath =
      parentCategoryObj.path == null
        ? name
        : parentCategoryObj.path + SUBCATEGORY_SEPARATOR + name;
    return new Category(name, newPath, contacts);
  }
}

// In an ideal world, we would place this as a method on our Category class,
// but since we need to store the entire cache object which removes all extra
// prototypes, we need to have this extra function.
// We do not store the uncategorized elements in the cache, since it is a simple
// filter operation and it requires much more complex logic to update cached
// uncategorized elements.
export function buildUncategorizedCategory (cat) {
    if (cat.isUncategorized) {
      return null;
    }
    let basePath = "";
    let contacts = new Map();
    if (cat.path) {
      // This is a real category.
      basePath = cat.path + SUBCATEGORY_SEPARATOR;
      cat.contacts.forEach(contact => {
        if (![...contact.categories].some(category => category.startsWith(basePath))) {
          contacts.set(contact.id, contact);
        }
      });
    } else {
      // This is an address book.
      cat.contacts.forEach(contact => {
        if (contact.categories.size == 0) {
          contacts.set(contact.id, contact);
        }
      });
    }

    if (contacts.size == 0) {
      return null;
    }

    return new Category(
      UNCATEGORIZED_CATEGORY_NAME,
      basePath + UNCATEGORIZED_CATEGORY_NAME,
      contacts,
      new Map(),
      true
    );
}

/**
 * Joins the individual nested category names to a full category string:
 * * e.g. ["A","B"] -> "A / B"
 */
export function categoryArrToString(cat) {
  return cat.join(SUBCATEGORY_SEPARATOR);
}

/**
 * Splits a category string into its individual nested category names:
 * e.g. "A / B" -> ["A","B"]
 */
export function categoryStringToArr(cat) {
  return cat.split(SUBCATEGORY_SEPARATOR);
}

export function isLeafCategory(cat) {
  return cat.categories.size === 0;
}

export function isSubcategoryOf(categoryStr, parentStr) {
  return categoryStr.startsWith(parentStr + SUBCATEGORY_SEPARATOR);
}

/**
 * Convert a category path(a string like "A / B / Uncategorized")
 * to a category string("A / B").
 */
export function categoryPathToString(categoryPath, isUncategorized) {
  if (!isUncategorized) return categoryPath;
  const idx = categoryPath.lastIndexOf(SUBCATEGORY_SEPARATOR);
  return idx !== -1
    ? categoryPath.substring(0, categoryPath.lastIndexOf(SUBCATEGORY_SEPARATOR))
    : categoryPath; // Top Level Uncategorized category
}

export function validateCategoryString(s) {
  if (s == null || s.trim() === "") {
    return VALIDATION_ERR_EMPTY_CATEGORY;
  }
  const splitted = categoryStringToArr(s);
  for (const cat of splitted) {
    if (cat.trim() == "") {
      return VALIDATION_ERR_EMPTY_SUBCATEGORY;
    }
  }
  return "LGTM";
}

export function isContactInCategory(categoryObj, contactId) {
  return categoryObj.contacts.has(contactId);
}

export function isContactInAnySubcategory(categoryObj, contactId) {
  let result = false;
  for (const subcategory of categoryObj.categories.values()) {
    if (isContactInCategory(subcategory, contactId)) {
      result = true;
      break;
    }
  }
  return result;
}

/**
 * Remove all implicit parent categories.
 * 
 */
export function removeImplicitCategories(categoriesArray) {
  let reducedCategories = categoriesArray.reduce((acc, cur) => {
    if (!categoriesArray.find((e) => e.trim().startsWith(cur + SUBCATEGORY_SEPARATOR))) {
      acc.push(cur);
    }
    return acc;
  }, []);
  // Remove duplicates.
  return [...new Set(reducedCategories)]
}

/**
 * Return only parent categories.
 * e.g. ["A / B", "C", "A / B / X"] -> ["A / B", "C"]
 */
export function removeSubCategories(categoriesArray) {
  const byLength = (a,b) => a.length - b.length;
 
  let reducedCategories = [];
  for (let categoryStr of [...categoriesArray].sort(byLength)) {
    let cat = categoryStr.trim();
    if (!reducedCategories.find(e => cat == e || cat.startsWith(e + SUBCATEGORY_SEPARATOR))) {
      reducedCategories.push(cat);
    }
  }
  return reducedCategories;
}

/**
 * Expand the categories to include all implicit parent categories.
 */
export function expandImplicitCategories(categoriesArray) {
  let expandedCategories = [];
  for (let categoryStr of categoriesArray) {
    const pendingCategoryLevels = categoryStringToArr(categoryStr);
    let categoryLevels = [];
    while (pendingCategoryLevels.length > 0)  {
      let categoryPart = pendingCategoryLevels.shift();
      categoryLevels.push(categoryPart);
      expandedCategories.push(categoryArrToString(categoryLevels));
    }
  }
  // Remove duplicates.
  return [...new Set(expandedCategories)];
}

/**
 * Get the parent category string of a category string.
 * If the category string is already a top level category, 
 * this function returns null.
 */
export function getParentCategoryStr(categoryStr) {
  const idx = categoryStr.lastIndexOf(SUBCATEGORY_SEPARATOR);
  return idx !== -1
    ? categoryStr.substring(0, categoryStr.lastIndexOf(SUBCATEGORY_SEPARATOR))
    : null; // Return null if no parent category
}
