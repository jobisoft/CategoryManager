import { parseContact } from "../contact.mjs";
import { addContactToCategory } from "./add-to-category.mjs";

export async function createContact(addressBook, contactNode) {
  const id = contactNode.id;
  const contact = parseContact(contactNode);
  addressBook.contacts[id] = contact;
  if (contact.categories.size == 0) {
    // No category info. Just add it to uncategorized and return.
    addressBook.uncategorized[id] = null;
    return;
  }
  for (const categoryStr of contact.categories) {
    await addContactToCategory(addressBook, id, categoryStr, false, true);
  }
}
