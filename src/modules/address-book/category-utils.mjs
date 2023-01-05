export const SUBCATEGORY_SEPARATOR = " / ";
export const UNCATEGORIZED_CATEGORY_NAME = await browser.i18n.getMessage(
  "tree.category.none"
);

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
  return cat.categories.size === 0;
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
const VALIDATION_ERR_EMPTY_CATEGORY = await browser.i18n.getMessage(
  "validation-error.empty-category"
);

const VALIDATION_ERR_EMPTY_SUBCATEGORY = await browser.i18n.getMessage(
  "validation-error.empty-subcategory"
);

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
  return contactId in categoryObj.contacts;
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

export function shouldContactBeUncategorized(categoryObj, contactId) {
  let uncategorized = true;
  for (const subcategory of categoryObj.categories.values()) {
    if (isContactInCategory(subcategory, contactId)) {
      uncategorized = false;
      break;
    }
  }
  return uncategorized;
}

export function reduceCategories(categoriesArray) {
  return categoriesArray.reduce((acc, cur) => {
    if (!categoriesArray.find((e) => e.trim().startsWith(cur + " /"))) {
      acc.push(cur);
    }
    return acc;
  }, []);
}

export function getParentCategoryStr(categoryStr) {
  const idx = categoryStr.lastIndexOf(SUBCATEGORY_SEPARATOR);
  return idx !== -1
    ? categoryStr.substring(0, categoryStr.lastIndexOf(SUBCATEGORY_SEPARATOR))
    : null; // Return null if no parent category
}
