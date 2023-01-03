import { removeContactFromCategory } from "./remove-from-category.mjs";

export function deleteContact(addressBook, contactId) {
  // Remove all categories and delete it from addressBook.
  const contact = addressBook.contacts[contactId];
  for (const cat of contact.categories) {
    console.log("Delete", contact.name, "from", cat);
    removeContactFromCategory(addressBook, contact.id, cat, false, true);
  }
  delete addressBook.contacts[contactId];
}
