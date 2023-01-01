import { parseContact } from "../contact.mjs";
import { addContactToCategory } from "./add-to-category.mjs";

export function createContact(addressBook, contactNode) {
  const id = contactNode.id;
  const contact = parseContact(contactNode);
  addressBook.contacts[id] = contact;
  if (contact.categories.length == 0) {
    // No category info. Just add it to uncategorized and return.
    addressBook.uncategorized[id] = null;
    return;
  }
  for (const category of contact.categories) {
    addContactToCategory(addressBook, id, category);
  }
}
