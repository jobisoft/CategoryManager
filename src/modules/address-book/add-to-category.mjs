import {
  Category,
  isLeafCategory,
  buildUncategorizedCategory,
  categoryArrToString,
  SUBCATEGORY_SEPARATOR,
} from "./category.mjs";
import { updateCategoriesForContact } from "../contact.mjs";

export async function addContactToCategory(
  addressBook,
  contactId,
  category,
  writeToThunderbird = false,
  updateContact = false
) {
  const contact = addressBook.contacts[contactId];
  const categoryStr = categoryArrToString(category);
  if (writeToThunderbird) {
    await updateCategoriesForContact(contact, [categoryStr], []);
  }
  if (updateContact) {
    // update contact data
    // check if the category is already in the contact
    let exist = false;
    for (const cat of contact.categories) {
      if (categoryArrToString(cat) === categoryStr) {
        // already in the contact.
        exist = true;
        break;
      }
    }
    if (!exist) {
      contact.categories.push(category);
      console.log("Categories data updated: ", contact.categories);
    }
  }

  // Several cases.
  // 1. If there are no new categories, it's easy.
  // 2. If there are some new categories:
  //    a. one old leaf node is no longer a leaf
  //     | we need to deal with uncategorized category
  //    b. the entire category path doesn't contain any old categories
  //     | this is a new path which only contains one contact, we don't need to deal with uncategorized category
  // state: a string that represents current state
  //        1, 2a, 2b, done(which means we already found the old leaf node)
  console.info("Adding", addressBook.contacts[contactId], "to", category);
  const rootName = category[0];
  // Assume there are no new categories first.
  let state = "1";
  if (addressBook.categories[rootName] == null) {
    // Case 2.b
    addressBook.categories[rootName] = new Category(rootName, rootName);
    state = "2b";
  }
  // Handle Corner case:
  //   add to uncategorized when category.length == 1, which skips the forEach loop
  const root = addressBook.categories[rootName];
  if (category.length === 1 && !isLeafCategory(root)) {
    console.log("The end node is not a leaf, adding to uncategorized!");
    root.uncategorized.contacts[contactId] = null;
  }
  let cur = addressBook.categories[rootName];
  cur.contacts[contactId] = null;
  let oldLeaf;
  let path = rootName;
  category.slice(1).forEach((cat, idx, arr) => {
    path += SUBCATEGORY_SEPARATOR + cat;
    if (cur.categories[cat] == null && state == "1") {
      // Case 2.a
      // this leaf node is no longer a leaf after this update
      state = "2a";
    }
    cur.categories[cat] ??= new Category(cat, path);
    cur.categories[cat].contacts[contactId] = null;
    if (state === "2a") {
      oldLeaf = cur;
      state = "done";
    }
    cur = cur.categories[cat];
    if (idx === arr.length - 1 && !isLeafCategory(cur)) {
      // If the last category is not a leaf, add this contact to uncategorized
      console.log("The end node is not a leaf, adding to uncategorized!");
      cur.uncategorized.contacts[contactId] = null;
    }
  });
  if (state === "done") {
    // Actually we do not need to recurse here.
    // TODO: optimize this.
    buildUncategorizedCategory(oldLeaf);
  }
}