/**
 * This module provides convenient helper methods to update the categories of 
 * contacts in the Thunderbird backend.
 */

import { updateCategoriesForVCard } from "./contact.mjs";
import {
  lookupCategory,
  mergeCategory,
  stripCategory,
} from "../cache/index.mjs";

/** 
 * Remove a vCard from this category and all its subcategories.
 */
export async function removeCategoryFromVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  let contact = addressBook.contacts.get(contactId);
  let newCategories = stripCategory([...contact.categories], categoryStr);
  return updateCategoriesForVCard(contact, newCategories);
}

/** 
 * Add a vCard to this category and all its parent categories.
 */
export async function addCategoryToVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  let contact = addressBook.contacts.get(contactId);
  let newCategories = mergeCategory([...contact.categories], categoryStr);
  return updateCategoriesForVCard(contact, newCategories);
}

/**
 * Replace a category name in all affected vCards (move/rename/remove).
 */
export async function replaceCategoryInVCards({
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
    for (let [contactId, contact] of categoryObj.contacts) {
      let newCategories = stripCategory([...contact.categories], oldCategoryStr);
      mergeCategory(newCategories, newCategoryStr);
      await updateCategoriesForVCard(contact, newCategories);
    }
  }
}
