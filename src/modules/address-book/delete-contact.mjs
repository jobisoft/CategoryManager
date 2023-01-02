import { isLeafCategory } from "./category.mjs";
import { isEmptyObject } from "../utils.mjs";

function deleteContactHelper(categoryObj, remainingCategoryPath, contactId) {
  // Cases for cleaning up empty categories:
  // 1. A leaf category
  //   I.  Becomes empty(no contacts, which implies no sub categories).
  //     Remove it, then recurse:
  //     a. its parent becomes a leaf (We need to update uncategorized category)
  //     b. its parent does not become a leaf.
  //   II. Is still non-empty. Nothing needs to be done.
  // 2. Not a leaf category. It won't become an empty node. Nothing needs to be done
  if (remainingCategoryPath.length === 0) {
    // Recursion base case
    // If the category is a leaf, do nothing
    // Otherwise, delete the contact in uncategorized category
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
  } else {
    const nextCategoryName = remainingCategoryPath[0];
    delete categoryObj.categories[nextCategoryName].contacts[contactId];
    const shouldDelete = deleteContactHelper(
      categoryObj.categories[nextCategoryName],
      remainingCategoryPath.slice(1),
      contactId
    );
    console.log(
      "Should I remove",
      contactId,
      "from",
      categoryObj,
      ":",
      shouldDelete
    );
    if (shouldDelete) {
      delete categoryObj.categories[nextCategoryName];
      // Do we need to update uncategorized category?
      if (isLeafCategory(categoryObj)) {
        // This category becomes a leaf.
        // Uncategorized category is no longer needed
        categoryObj.uncategorized = undefined;
      }
    }
  }
  // returns: if this category should be deleted
  // Note that empty contacts imply a leaf node.
  return isEmptyObject(categoryObj.contacts);
}

export function deleteContact(addressBook, contactId) {
  const contact = addressBook.contacts[contactId];
  delete addressBook.contacts[contactId];
  for (const cat of contact.categories) {
    console.log("Delete", contact.name, "from", cat);
    deleteContactHelper(addressBook, cat, contactId);
  }
}
