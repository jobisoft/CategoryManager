import {
  addContactToCategory as addContactToCategoryHelper,
  removeContactFromCategory as removeContactFromCategoryHelper,
} from "../modules/address-book.mjs";

export async function removeContactFromCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  category,
}) {
  return Promise.all([
    removeContactFromCategoryHelper(
      addressBook,
      contactId,
      category,
      true,
      true
    ),
    removeContactFromCategoryHelper(virtualAddressBook, contactId, category),
  ]);
}

export async function addContactToCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  category,
}) {
  return Promise.all([
    addContactToCategoryHelper(addressBook, contactId, category, true, true),
    addContactToCategoryHelper(virtualAddressBook, contactId, category),
  ]);
}
