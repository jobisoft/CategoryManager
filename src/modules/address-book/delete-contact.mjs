import { SortedContacts } from "../sorted-contacts.mjs";
import { removeContactFromCategory } from "./remove-from-category.mjs";
import { localeAwareContactComparator } from "../utils.mjs";

export function deleteContactInCache(addressBook, contactId) {
  // Remove all categories and delete it from addressBook.
  const contact = addressBook.contacts[contactId];
  for (const cat of contact.categories) {
    console.log("Delete", contact.name, "from", cat);
    removeContactFromCategory(addressBook, contact.id, cat, true);
  }
  delete addressBook.contacts[contactId];
  SortedContacts.remove(
    addressBook.contactKeys,
    contactId,
    localeAwareContactComparator(addressBook)
  );
}
