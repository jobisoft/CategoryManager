/**
 * This module provides convenient helper methods to update the categories of 
 * contacts in the Thunderbird backend.
 */

import { updateCategoriesForContact } from "./contact.mjs";
import {
  lookupCategory,
  getParentCategoryStr,
} from "../cache/index.mjs";

/** 
 * Remove the contact from this category and any subcategory recursively, but
 * keep it in the parent category.
 */
export async function removeCategoryFromContactVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  return updateCategoriesForContact(
    addressBook.contacts[contactId],
    [getParentCategoryStr(categoryStr)], // toBeAdded,
    [categoryStr], // toBeDeleted - TODO : still needed?
  );
}

export async function addCategoryToContactVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  return updateCategoriesForContact(
    addressBook.contacts[contactId],
    [categoryStr], // toBeAdded,
    [] // toBeDeleted
  );
}

export async function removeCategoryFromAllContactVcards({
  categoryStr,
  addressBook,
  addressBooks, // TODO : This seems to be a constant global, do we have to pass it around?
}) {
  const virtualAddressBook = addressBooks.get("all-contacts");
  let pendingAddressBooks = addressBook === virtualAddressBook
    ? addressBooks.values()
    : [addressBook];
    for (const ab of pendingAddressBooks) {
      if (ab == virtualAddressBook) {
        continue;
      }
      console.log(ab.name);
      // Loop over all contacts of that category.
      const categoryObj = lookupCategory(
        ab,
        categoryStr
      );
      if (!categoryObj) {
        continue;
      }
      for (const contactId in categoryObj.contacts) {
        console.log(ab.name, contactId);
        await removeCategoryFromContactVCard({
          contactId,
          addressBook: ab,
          categoryStr,
        })
      }
    }
}
