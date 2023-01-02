import { categoryArrToString } from "./category.mjs";
import { parseContact } from "../contact.mjs";
import { addContactToCategory } from "./add-to-category.mjs";
import { removeContactFromCategory } from "./remove-from-category.mjs";

export async function updateContact(
  addressBook,
  contactNode,
  changedProperties
) {
  // We only care about email, name and categories
  // if (changedProperties.DisplayName != null) {
  //   addressBook.contacts[contactNode.id].name = changedProperties.DisplayName.newValue;
  // }

  // changedProperties only tells us whether Primary/SecondaryEmail changes.
  // it won't tell us if categories or other email address got updated.
  // Let's just parse the vCard again so that nothing is left behind!
  const id = contactNode.id;
  const newContact = parseContact(contactNode);
  const oldContact = addressBook.contacts[id];
  // TODO: we could do some optimization here:
  const newCategories = new Set(newContact.categories.map(categoryArrToString));
  const oldCategories = new Set(oldContact.categories.map(categoryArrToString));
  console.log("Old categories: ", JSON.stringify([...oldCategories]));
  console.log("New categories: ", JSON.stringify([...newCategories]));
  if (
    newCategories.size != oldCategories.size ||
    [...newCategories].some((value) => !oldCategories.has(value))
  ) {
    // Categories changed.
    console.log("changed contact:", newContact, changedProperties);
    const addition = [...newCategories].filter((x) => !oldCategories.has(x));
    const deletion = [...oldCategories].filter((x) => !newCategories.has(x));
    console.log("Addition", addition);
    await Promise.all(
      addition.map((cat) =>
        addContactToCategory(addressBook, id, cat, false, true)
      )
    );
    console.log("Deletion", deletion);
    await Promise.all(
      deletion.map((cat) =>
        removeContactFromCategory(addressBook, id, cat, false, true)
      )
    );
  }
  addressBook.contacts[id] = newContact;
}
