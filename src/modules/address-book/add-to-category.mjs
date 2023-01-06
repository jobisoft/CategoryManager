import {
  Category,
  buildCategory,
  removeContactFromUncategorized,
} from "./category.mjs";
import { categoryStringToArr } from "./category-utils.mjs";
import { sortMapByKey, localeAwareContactComparator } from "../utils.mjs";
import { SortedContacts } from "../sorted-contacts.mjs";

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
    if (!(contactId in cur.contacts)) {
      cur.contacts[contactId] = null;
      SortedContacts.insert(
        cur.contactKeys,
        contactId,
        localeAwareContactComparator(addressBook)
      );
    }
  });
  // Now cur points to the last category in the path.
  console.log(state);
  if (state === "2") {
    buildCategory(addressBook, categoryNeedingUpdate, false, true);
  } else if (state === "1") {
    buildCategory(addressBook, cur, false, true);
  }
  // Two cases for Top level uncategorized:
  // 1. If this contact belongs to a category, we do not need to deal with top level uncategorized.
  // 2. If this contact does not belong to any category, and now it belongs to a category,
  //    we need to remove it from top level uncategorized.
  // Note that in other cases, for example, if contact Alice belongs to CatA, and now we add it to
  // catA / catB, we do not need to explicitly remove it from catA / Uncategorized.
  if (contact.categories.size === 1) {
    // This contact belongs to a category, so it should not be in the top level uncategorized.
    removeContactFromUncategorized(addressBook, addressBook, contactId);
  }
}
