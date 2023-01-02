import {
  addContactToCategory as addContactToCategoryHelper,
  removeContactFromCategory as removeContactFromCategoryHelper,
  deleteCategory as deleteCategoryHelper,
} from "../modules/address-book/index.mjs";

export async function removeContactFromCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  categoryStr,
}) {
  await removeContactFromCategoryHelper(
    addressBook,
    contactId,
    categoryStr,
    true,
    true
  );
  return removeContactFromCategoryHelper(
    virtualAddressBook,
    contactId,
    categoryStr
  );
}

export async function addContactToCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  categoryStr,
}) {
  await addContactToCategoryHelper(
    addressBook,
    contactId,
    categoryStr,
    true,
    true
  );
  return addContactToCategoryHelper(
    virtualAddressBook,
    contactId,
    categoryStr,
    false,
    true
  );
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
    await deleteCategoryHelper(
      virtualAddressBook,
      categoryPath,
      isUncategorized,
      false,
      false
    );
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
  // The order matters! deleteCategoryHelper relies on the category info stored in contact
  // So we can't update the categories in contact when
  await deleteCategoryHelper(
    virtualAddressBook,
    categoryPath,
    isUncategorized,
    false,
    false
  );
  return deleteCategoryHelper(
    addressBook,
    categoryPath,
    isUncategorized,
    true,
    true
  );
}
