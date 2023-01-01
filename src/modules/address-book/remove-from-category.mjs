import { isLeafCategory, categoryArrToString } from "./category.mjs";
import { isEmptyObject } from "../utils.mjs";

function removeContactFromCategoryHelper(
  addressBook,
  categoryObj,
  remainingCategoryPath,
  contactId,
  firstLevelDeletionEnabled = true
) {
  // See the docs of `removeContactFromCategory`
  let shouldDelete = true;
  if (remainingCategoryPath.length === 0) {
    // Recursion base case
    console.log("Delete", contactId, "from", categoryObj);
    delete categoryObj.contacts[contactId];
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
  } else {
    // Delete contact from this node only if
    // it does not belong to this category and any sub category.
    const nextCategoryName = remainingCategoryPath[0];
    for (const catArr of addressBook.contacts[contactId].categories) {
      if (categoryArrToString(catArr).startsWith(categoryObj.name)) {
        shouldDelete = false;
        break;
      }
    }
    console.log(
      "Should I remove",
      contactId,
      "from",
      categoryObj,
      ":",
      firstLevelDeletionEnabled && shouldDelete
    );
    if (firstLevelDeletionEnabled && shouldDelete)
      delete categoryObj.contacts[contactId];
    const shouldDeleteCategory = removeContactFromCategoryHelper(
      addressBook,
      categoryObj.categories[nextCategoryName],
      remainingCategoryPath.slice(1),
      contactId
    );
    if (shouldDeleteCategory) {
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

export async function removeContactFromCategory(
  addressBook,
  contactId,
  category,
  writeToThunderbird = false,
  updateContact = false
) {
  console.info(
    "removeContactFromCategory",
    addressBook,
    contactId,
    category,
    writeToThunderbird,
    updateContact
  );
  // update contact data
  const contact = addressBook.contacts[contactId];
  if (updateContact) {
    // remove category from contact.
    // convert it to string for easy comparison
    const categoryStr = categoryArrToString(category);
    let found = false;
    for (let i = 0; i < contact.categories.length; i++) {
      if (categoryArrToString(contact.categories[i]) === categoryStr) {
        contact.categories.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      console.error("Category not found in contact", category, contact);
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
    category,
    contactId,
    false
  );
}
