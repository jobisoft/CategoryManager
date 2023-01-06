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
    addressBook.contacts.get(contactId),
    [getParentCategoryStr(categoryStr)], // toBeAdded
    [categoryStr], // toBeDeleted
  );
}

export async function addCategoryToContactVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  return updateCategoriesForContact(
    addressBook.contacts.get(contactId),
    [categoryStr], // toBeAdded
    [] // toBeDeleted
  );
}

export async function removeCategory({
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
      // Loop over all contacts of that category.
      const categoryObj = lookupCategory(
        ab,
        categoryStr
      );
      if (!categoryObj) {
        continue;
      }
      for (let [contactId] of categoryObj.contacts) {
        await removeCategoryFromContactVCard({
          contactId,
          addressBook: ab,
          categoryStr,
        })
      }
    }
}

export async function moveCategory({
  addressBook,
  addressBooks, // TODO : This seems to be a constant global, do we have to pass it around?
  oldCategoryStr,
  newCategoryStr,
}) {
  const virtualAddressBook = addressBooks.get("all-contacts");
  let pendingAddressBooks = addressBook === virtualAddressBook
    ? addressBooks.values()
    : [addressBook];

  for (const ab of pendingAddressBooks) {
    if (ab == virtualAddressBook) {
      continue;
    }
    // Loop over all contacts of that category.
    const categoryObj = lookupCategory(
      ab,
      oldCategoryStr
    );
    if (!categoryObj) {
      continue;
    }
    for (let [contactId] of categoryObj.contacts) {
      await removeCategoryFromContactVCard({
        contactId,
        addressBook: ab,
        categoryStr: oldCategoryStr,
      });
      await addCategoryToContactVCard({
        contactId,
        addressBook: ab,
        categoryStr: newCategoryStr,
      });
    }
  }
}
