import {
  Category,
  isLeafCategory,
  buildUncategorizedCategory,
  categoryArrToString,
  SUBCATEGORY_SEPARATOR,
  categoryStringToArr,
  shouldContactBeUncategorized,
} from "./category.mjs";
import { updateCategoriesForContact } from "../contact.mjs";

export async function addContactToCategory(
  addressBook,
  contactId,
  categoryStr,
  writeToThunderbird = false,
  updateContact = false
) {
  const categoryArr = categoryStringToArr(categoryStr);
  const contact = addressBook.contacts[contactId];
  console.info("add", contact, "to", categoryArr, "in", addressBook);
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
      contact.categories.push(categoryArr);
      console.log("Categories data updated: ", contact.categories);
    }
  }

  // Several cases.
  // 1. If there are no new categories, it's easy.
  // 2. If there are some new categories:
  //    one old leaf node is no longer a leaf. (Consider the address book as a virtual category)
  //    2a. a leaf is no longer a leaf.
  //    2b. the root Uncategorized category need to be updated.
  // state: a string that represents current state
  //        1, 2, done(which means we already found the old leaf node)
  console.info("Adding", addressBook.contacts[contactId], "to", categoryArr);
  const rootName = categoryArr[0];
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
  if (
    categoryArr.length === 1 &&
    !isLeafCategory(root) &&
    shouldContactBeUncategorized(root, contactId)
  ) {
    console.log("The end node is not a leaf, adding to uncategorized!");
    root.uncategorized ??= Category.createUncategorizedCategory(null);
    root.uncategorized.contacts[contactId] = null;
  }
  let cur = addressBook.categories[rootName];
  cur.contacts[contactId] = null;
  let oldLeaf;
  let path = rootName;
  categoryArr.slice(1).forEach((cat, idx, arr) => {
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
    if (
      idx === arr.length - 1 &&
      cur != null && // The last iteration makes cur undefined.
      !isLeafCategory(cur) &&
      shouldContactBeUncategorized(cur, contactId)
    ) {
      // If the last category is not a leaf
      // and this contact does not appear in any of the subcategories,
      // then add this contact to uncategorized
      console.log("The end node is not a leaf, adding to uncategorized!");
      cur.uncategorized ??= Category.createUncategorizedCategory(cur.path);
      cur.uncategorized.contacts[contactId] = null;
    }
  });
  if (state === "done") {
    // Actually we do not need to recurse here.
    // TODO: optimize this.
    buildUncategorizedCategory(oldLeaf);
  } else if (state === "2b") {
    buildUncategorizedCategory(addressBook);
  }
}
