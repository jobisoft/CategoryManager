import {
  Category,
  buildCategory,
} from "./category.mjs";
import { categoryStringToArr } from "./category-utils.mjs";
import { sortMapByKey } from "../utils.mjs";

export async function addContactToCategory(
  addressBook,
  contactId,
  categoryStr,
  updateContact = false
) {
  const categoryArr = categoryStringToArr(categoryStr);
  const contact = addressBook.contacts[contactId];
  if (updateContact) {
    // update contact data
    // check if the category is already in the contact
    let exist = false;
    for (const cat of contact.categories) {
      if (cat === categoryStr) {
        // already in the contact.
        exist = true;
        break;
      }
    }
    if (!exist) {
      contact.categories.add(categoryStr);
      console.log("Categories data updated: ", contact.categories);
    }
  }

  // Several cases.
  // 1. If there are no new categories, it's easy.
  // 2. If there are some new categories:
  //    2a: one old leaf node is no longer a leaf. (Consider the address book as a virtual category)
  //        We need to build uncategorized category
  //    2b: one old non-leaf node get a new child
  //        We also need to build uncategorized category
  // state: a string that represents current state
  //        1, 2, done(which means we already found the old leaf node)
  console.info(
    "Adding",
    addressBook.contacts[contactId],
    "to",
    categoryArr,
    "in",
    addressBook
  );
  // Assume there are no new categories first.
  let state = "1";
  let cur = addressBook;
  let categoryNeedingUpdate;
  categoryArr.forEach((cat) => {
    if (!cur.categories.has(cat)) {
      if (state == "1") {
        state = "2";
        categoryNeedingUpdate = cur;
      }
      cur.categories.set(cat, Category.createSubcategory(cur, cat));
      cur.categories = sortMapByKey(cur.categories);
    }
    cur = cur.categories.get(cat);
    cur.contacts[contactId] = null;
  });
  // Now cur points to the last category in the path.
  if (state === "2") {
    buildCategory(categoryNeedingUpdate);
  } else if (state === "1") {
    buildCategory(cur);
  }
}
