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
/**
 * Remove an entire category by updating all affected contacts.
 */
export async function removeCategory({
  categoryStr,
  addressBook,
  addressBooks,
}) {
  let pendingAddressBooks = addressBook.id == "all-contacts"
    ? addressBooks.values()
    : [addressBook];
    for (const ab of pendingAddressBooks) {
      if (ab.id == "all-contacts") {
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

/**
 * Rename/Move an entire category by updating all affected contacts.
 */
export async function moveCategory({
  addressBook,
  addressBooks,
  oldCategoryStr,
  newCategoryStr,
}) {
  let pendingAddressBooks = addressBook.id == "all-contacts"
    ? addressBooks.values()
    : [addressBook];

  for (const ab of pendingAddressBooks) {
    if (ab.id == "all-contacts") {
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
