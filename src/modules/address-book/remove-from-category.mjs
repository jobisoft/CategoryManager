import {
  isLeafCategory,
  categoryStringToArr,
  isContactInAnySubcategory,
  shouldContactBeUncategorized,
  categoryObjToString,
} from "./category-utils.mjs";
import { Category, buildCategory } from "./category.mjs";
import { isEmptyObject } from "../utils.mjs";

function removeContactFromCategoryHelper(
  addressBook,
  categoryObj,
  remainingCategoryArr,
  contactId,
  contactDeletionEnabled = true
) {
  // See the docs of `removeContactFromCategory`
  if (remainingCategoryArr.length === 0) {
    // Recursion base case
    console.log("Delete", contactId, "from", categoryObj);
    delete categoryObj.contacts[contactId];
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
    return;
  }
  const contact = addressBook.contacts[contactId];
  // Delete contact from this node only if
  // it does not belong to this category and any sub category.
  const nextCategoryName = remainingCategoryArr[0];
  const nextCategoryObj = categoryObj.categories.get(nextCategoryName);
  removeContactFromCategoryHelper(
    addressBook,
    nextCategoryObj,
    remainingCategoryArr.slice(1),
    contactId,
    true
  );
  const shouldDeleteCategory = isEmptyObject(nextCategoryObj.contacts);
  const shouldDeleteContact =
    contactDeletionEnabled &&
    !contact.categories.has(categoryObjToString(categoryObj)) && // not explicitly associated
    !isContactInAnySubcategory(categoryObj, contactId); // not in any of the subcategories
  console.log(
    "Should I remove",
    contactId,
    "from",
    categoryObj,
    ":",
    shouldDeleteContact
  );
  if (shouldDeleteContact) delete categoryObj.contacts[contactId];
  console.warn(
    "Should I delete category",
    nextCategoryObj,
    "from",
    addressBook,
    ":",
    shouldDeleteCategory
  );
  if (shouldDeleteCategory) {
    categoryObj.categories.delete(nextCategoryName);
    console.log("Deleted category", nextCategoryName, "from", categoryObj);
  }
  // After deleting this contact in the subcategory,
  // if it still exists in this category, we need to check
  // whether we need to add it to uncategorized or not.
  if (
    !shouldDeleteContact &&
    shouldContactBeUncategorized(categoryObj, contactId)
  ) {
    categoryObj.uncategorized ??= Category.createUncategorizedCategory(
      categoryObj.path
    );
    buildCategory(categoryObj, false);
  }
  if (
    categoryObj.uncategorized != null &&
    isEmptyObject(categoryObj.uncategorized.contacts) &&
    categoryObj.path != null
  ) {
    // This category becomes a leaf.
    // Uncategorized category is no longer needed
    categoryObj.uncategorized = null;
  }
}

export async function removeContactFromCategory(
  addressBook,
  contactId,
  categoryStr,
  updateContact = false
) {
  console.info(
    "removeContactFromCategory",
    addressBook,
    contactId,
    categoryStr,
    updateContact
  );

  const contact = addressBook.contacts[contactId];
  if (updateContact) {
    // update contact data
    // remove category from contact.
    if (contact.categories.has(categoryStr)) {
      contact.categories.delete(categoryStr);
    } else {
      console.error("Category not found in contact", categoryStr, contact);
    }
  }
  // Implementation Note:
  // If there are no other subcategories containing this contact, we can remove it from this category.
  const categoryArr = categoryStringToArr(categoryStr);
  removeContactFromCategoryHelper(
    addressBook,
    addressBook,
    categoryArr,
    contactId,
    false
  );
}
