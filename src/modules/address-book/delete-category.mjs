import { getError } from "../contact.mjs";
import { lookupCategory } from "./address-book.mjs";
import { categoryArrToString, categoryPathToString } from "./category.mjs";
import { removeContactFromCategory } from "./remove-from-category.mjs";

const ERR_PARTIAL_DELETION =
  "An error occurred while deleting this category. Some contacts are still in this category.";

export async function deleteCategory(
  addressBook,
  categoryPath,
  isUncategorized,
  writeToThunderBird = false,
  updateContact = false
) {
  console.debug(
    "deleteCategory",
    addressBook,
    categoryPath,
    isUncategorized,
    writeToThunderBird,
    updateContact
  );
  // delete this category and all of its subcategories
  // Implementation note:
  //   Instead of traversing the category tree recursively,
  //   we can use the info from contact.categories and thus
  //   reuse `removeContactFromCategory`.
  const categoryObj = lookupCategory(
    addressBook,
    categoryPath,
    isUncategorized
  );
  if (categoryObj == null) {
    console.info(
      "Skipped deletion for category path:",
      categoryPath,
      ",isUncategorized:",
      isUncategorized,
      "because it doesn't exist in",
      addressBook
    );
    return;
  }
  const categoryStr = categoryPathToString(categoryPath, isUncategorized);
  try {
    for (const contactId in categoryObj.contacts) {
      const contact = addressBook.contacts[contactId];

      const categoryStrs = contact.categories.map(categoryArrToString);
      // Note: the following for loop might modifies `contact.categories` so we can't directly
      //       loop over it.
      for (const currentCategoryStr of categoryStrs) {
        if (currentCategoryStr.startsWith(categoryStr)) {
          await removeContactFromCategory(
            addressBook,
            contactId,
            currentCategoryStr,
            writeToThunderBird,
            updateContact
          );
        }
      }
    }
  } catch (e) {
    console.error("Error occurred when deleting category", categoryStr, e);
    throw getError(ERR_PARTIAL_DELETION, e.id);
  }
}
