import { parseContact } from "../contact.mjs";
import { SortedContacts } from "../sorted-contacts.mjs";
import { addContactToCategory } from "./add-to-category.mjs";
import { insertContactIntoUncategorized } from "./category.mjs";
import { localeAwareContactComparator } from "../utils.mjs";

export async function createContactInCache(addressBook, contactNode) {
  const id = contactNode.id;
  const contact = parseContact(contactNode);
  addressBook.contacts[id] = contact;
  SortedContacts.insert(
    addressBook.contactKeys,
    id,
    localeAwareContactComparator(addressBook)
  );
  if (contact.categories.size == 0) {
    // No category info. Just add it to uncategorized and return.
    insertContactIntoUncategorized(addressBook, addressBook, id);
    return;
  }
  for (const categoryStr of contact.categories) {
    await addContactToCategory(addressBook, id, categoryStr, true);
  }
}
