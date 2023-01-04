import { updateCategoriesForContact } from "../modules/contact.mjs";
import {
  lookupCategory,
  categoryPathToString,
  isSubcategoryOf,
  getParentCategoryStr,
} from "../modules/address-book/index.mjs";
import { getError } from "../modules/contact.mjs";
import { filterIter } from "../modules/iter.mjs";

/** Remove the contact from this category and any subcategory recursively
 *  and add it to the parent category.
 */
export async function removeContactFromCategory({
  contactId,
  addressBook,
  categoryStr,
}) {
  const contact = addressBook.contacts[contactId];
  const toBeDeleted = [
    ...filterIter(
      contact.categories,
      (x) => x == categoryStr || isSubcategoryOf(x, categoryStr)
    ),
  ];
  const parentCategoryStr = getParentCategoryStr(categoryStr);
  const toBeAdded = parentCategoryStr == null ? [] : [parentCategoryStr];
  // `updateCategoriesForContact` could handle duplicate categories.
  console.log(toBeAdded, toBeDeleted);
  return updateCategoriesForContact(
    addressBook.contacts[contactId],
    toBeAdded,
    toBeDeleted
  );
}

export async function addContactToCategory({
  contactId,
  addressBook,
  categoryStr,
}) {
  return updateCategoriesForContact(
    addressBook.contacts[contactId],
    [categoryStr],
    []
  );
}

const ERR_PARTIAL_DELETION = await browser.i18n.getMessage(
  "errors.partial-deletion"
);

async function deleteCategoryHelper(
  addressBook,
  categoryPath,
  isUncategorized
) {
  console.debug("deleteCategory", addressBook, categoryPath, isUncategorized);
  // delete this category and all of its subcategories
  const categoryObj = lookupCategory(
    addressBook,
    categoryPath,
    isUncategorized
  );
  if (categoryObj == null) {
    console.error(
      "Not found: category path:",
      categoryPath,
      ",isUncategorized:",
      isUncategorized,
      "in",
      addressBook
    );
    return;
  }
  const categoryStr = categoryPathToString(categoryPath, isUncategorized);
  try {
    for (const contactId in categoryObj.contacts) {
      const contact = addressBook.contacts[contactId];
      const toBeDeleted = [
        ...filterIter(
          contact.categories,
          (x) => x == categoryStr || isSubcategoryOf(x, categoryStr)
        ),
      ];
      await updateCategoriesForContact(contact, [], toBeDeleted);
    }
  } catch (e) {
    console.error("Error occurred when deleting category", categoryStr, e);
    throw getError(ERR_PARTIAL_DELETION, e.id);
  }
}

export async function deleteCategory({
  categoryPath,
  isUncategorized,
  addressBook,
  addressBooks,
}) {
  const virtualAddressBook = addressBooks.get("all-contacts");
  if (addressBook === virtualAddressBook) {
    // delete a category in "All contacts"
    // Delete it for every addressBook.
    for (const ab of addressBooks.values()) {
      if (ab !== virtualAddressBook) {
        await deleteCategoryHelper(
          ab,
          categoryPath,
          isUncategorized,
          true,
          true
        );
      }
    }
  }
  return deleteCategoryHelper(
    addressBook,
    categoryPath,
    isUncategorized,
    true,
    true
  );
}
