import { parseContact } from "../contact.mjs";
import { addContactToCategory } from "./add-to-category.mjs";
import { removeContactFromCategory } from "./remove-from-category.mjs";

export async function updateContactInCache(
  addressBook,
  virtualAddressBook,
  contactNode,
  changedProperties
) {
  // We only care about email, name and categories
  // changedProperties only tells us whether Primary/SecondaryEmail changes.
  // it won't tell us if categories or other email address got updated.
  // Let's just parse the vCard again so that nothing is left behind!
  const id = contactNode.id;
  const newContact = parseContact(contactNode);
  const oldContact = addressBook.contacts[id];
  // TODO: we could do some optimization here:
  const newCategories = newContact.categories;
  const oldCategories = oldContact.categories;
  console.debug("Old categories: ", JSON.stringify([...oldCategories]));
  console.debug("New categories: ", JSON.stringify([...newCategories]));
  if (
    newCategories.size != oldCategories.size ||
    [...newCategories].some((value) => !oldCategories.has(value))
  ) {
    // Categories changed.
    console.debug("changed contact:", newContact, changedProperties);
    const addition = [...newCategories].filter((x) => !oldCategories.has(x));
    const deletion = [...oldCategories].filter((x) => !newCategories.has(x));
    console.debug("Addition", addition);
    for (const cat of addition) {
      await addContactToCategory(addressBook, id, cat, false, true);
      await addContactToCategory(virtualAddressBook, id, cat, false, true);
    }
    console.debug("Deletion", deletion);
    for (const cat of deletion) {
      await removeContactFromCategory(addressBook, id, cat, false, true);
      await removeContactFromCategory(virtualAddressBook, id, cat, false, true);
    }
  }
  addressBook.contacts[id] = newContact;
}
