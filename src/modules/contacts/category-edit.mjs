/**
 * This module provides convenient helper methods to update the categories of 
 * contacts in the Thunderbird backend.
 */

import { updateCategoriesForContact } from "./contact.mjs";
import {
  lookupCategory,
  isSubcategoryOf,
  expandImplicitCategories,
} from "../cache/index.mjs";

/** 
 * Remove the contact from this category and all its subcategories.
 */
export async function removeCategoryFromContactVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  let contact = addressBook.contacts.get(contactId);
  // Categories in cache always include all implicit categories.
  let newCategories = [...contact.categories].filter(
    cat => cat != categoryStr && !isSubcategoryOf(cat, categoryStr)
  );
  return updateCategoriesForContact(contact, newCategories);
}

export async function addCategoryToContactVCard({
  contactId,
  addressBook,
  categoryStr,
}) {
  let contact = addressBook.contacts.get(contactId);
  let newCategories = [...contact.categories];
  for (let cat of expandImplicitCategories([categoryStr])) {
    if (!newCategories.includes(cat)) {
      newCategories.push(cat);
    }
  }
  return updateCategoriesForContact(contact, newCategories);
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
    for (let [contactId, contact] of categoryObj.contacts) {
      let newCategories = [...contact.categories].filter(
        cat => cat != oldCategoryStr && !isSubcategoryOf(cat, oldCategoryStr)
      );
      for (let cat of expandImplicitCategories([newCategoryStr])) {
        if (!newCategories.includes(cat)) {
          newCategories.push(cat);
        }
      }
      await updateCategoriesForContact(contact, newCategories);
    }
  }
}
