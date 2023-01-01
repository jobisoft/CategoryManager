import {
  addContactToCategory as addContactToCategoryHelper,
  removeContactFromCategory as removeContactFromCategoryHelper,
} from "../modules/address-book/index.mjs";

export async function removeContactFromCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  category,
}) {
  await removeContactFromCategoryHelper(
    addressBook,
    contactId,
    category,
    true,
    true
  );
  return removeContactFromCategoryHelper(
    virtualAddressBook,
    contactId,
    category
  );
}

export async function addContactToCategory({
  contactId,
  addressBook,
  virtualAddressBook,
  category,
}) {
  await addContactToCategoryHelper(
    addressBook,
    contactId,
    category,
    true,
    true
  );
  return addContactToCategoryHelper(
    virtualAddressBook,
    contactId,
    category,
    false,
    true
  );
}
