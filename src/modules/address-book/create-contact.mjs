import { parseContact } from "../contact.mjs";
import { addContactToCategory } from "./add-to-category.mjs";
import { categoryArrToString } from "./category.mjs";

export async function createContact(addressBook, contactNode) {
  const id = contactNode.id;
  const contact = parseContact(contactNode);
  addressBook.contacts[id] = contact;
  if (contact.categories.length == 0) {
    // No category info. Just add it to uncategorized and return.
    addressBook.uncategorized[id] = null;
    return;
  }
  return Promise.all(
    contact.categories.map((categoryArr) =>
      addContactToCategory(
        addressBook,
        id,
        categoryArrToString(categoryArr),
        false,
        true
      )
    )
  );
}
