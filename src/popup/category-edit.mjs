import {
  addContactToCategory as addContactToCategoryHelper,
  removeContactFromCategory as removeContactFromCategoryHelper,
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
