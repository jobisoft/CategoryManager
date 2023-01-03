import {
  isLeafCategory,
  categoryStringToArr,
  isContactInAnySubcategory,
  shouldContactBeUncategorized,
  Category,
  buildUncategorizedCategory,
} from "./category.mjs";
import { isEmptyObject } from "../utils.mjs";
import { updateCategoriesForContact } from "../contact.mjs";

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
    return isEmptyObject(categoryObj.contacts);
  }
  // Delete contact from this node only if
  // it does not belong to this category and any sub category.
  const nextCategoryName = remainingCategoryArr[0];
  const shouldDeleteCategory = removeContactFromCategoryHelper(
    addressBook,
    categoryObj.categories[nextCategoryName],
    remainingCategoryArr.slice(1),
    contactId,
    true
  );
  const isExplicitAssociated = addressBook.contacts[contactId].categories.has(
    categoryObj.categoryStr()
  );
  const shouldDeleteContact =
    contactDeletionEnabled &&
    !isExplicitAssociated &&
    !isContactInAnySubcategory(categoryObj, contactId);
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
    categoryObj.categories[nextCategoryName],
    "from",
    addressBook,
    ":",
    shouldDeleteCategory
  );
  if (shouldDeleteCategory) {
    delete categoryObj.categories[nextCategoryName];
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
    buildUncategorizedCategory(categoryObj, false);
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
  // returns: if this category should be deleted
  // Note that empty contacts imply a leaf node.
  return isEmptyObject(categoryObj.contacts);
}

export async function removeContactFromCategory(
  addressBook,
  contactId,
  categoryStr,
  writeToThunderbird = false,
  updateContact = false
) {
  console.info(
    "removeContactFromCategory",
    addressBook,
    contactId,
    categoryStr,
    writeToThunderbird,
    updateContact
  );

  const contact = addressBook.contacts[contactId];
  if (writeToThunderbird) {
    await updateCategoriesForContact(contact, [], [categoryStr]);
  }
  if (updateContact) {
    // update contact data
    // remove category from contact.
    if (contact.categories.has(categoryStr)) {
      contact.categories.delete(categoryStr);
    } else {
      console.error("Category not found in contact", categoryStr, contact);
    }
  }
  // Note that this function is different from `deleteContactRecursively`.
  // Consider this case:
  //     Contact AAA belongs to a/b/c and a/b/d. Now we delete a/b/d.
  // `deleteContactRecursively` would remove this contact from a, b and d.
  // But `removeContactFromCategory` should only remove this contact from d.
  //
  // Implementation Note:
  // If there are no other subcategories containing this contact, we can remove it from this category.
  removeContactFromCategoryHelper(
    addressBook,
    addressBook,
    categoryStringToArr(categoryStr),
    contactId,
    false
  );
}
