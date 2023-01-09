/**
 * This module provides methods to update our caches. They are supposed to be used
 * by contact listeners to automatically keep the cache up-to-date.
 */

import {
  Category,
  categoryStringToArr,
  categoryArrToString,
  expandImplicitCategories,
  getParentCategoryStr,
  isSubcategoryOf,
  lookupCategory,
  removeImplicitCategories,
  removeSubCategories,
} from "./index.mjs";
import { printToConsole } from "../utils.mjs";

export async function createContactInCache(
  addressBook,
  virtualAddressBook,
  contact
) {
  addressBook.contacts.set(contact.id, contact);
  virtualAddressBook.contacts.set(contact.id, contact);
  // The function updateContactCategoryCache automatically handles implicit
  // categories, no need to add them individually. We also may not loop over
  // contact.categories directly, since we modify it in that function.
  for (const categoryStr of removeImplicitCategories([...contact.categories])) {
    await updateContactCategoryCache(addressBook, contact.id, categoryStr);
    await updateContactCategoryCache(virtualAddressBook, contact.id, categoryStr);
  }
  addressBook.contacts = sortContactsMap(addressBook.contacts);
  virtualAddressBook.contacts = sortContactsMap(virtualAddressBook.contacts);
}

export async function modifyContactInCache(
  addressBook,
  virtualAddressBook,
  newContact
) {
  const id = newContact.id;
  const oldContact = virtualAddressBook.contacts.get(id);
  // Expand the categories here, to properly detect additions and deletions of
  // categories and subcategories.
  const newCategories = expandImplicitCategories(newContact.categories);
  const oldCategories = expandImplicitCategories(oldContact.categories);
  printToConsole.debug("Old categories: ", JSON.stringify([...oldCategories]));
  printToConsole.debug("New categories: ", JSON.stringify([...newCategories]));

  // Update the contact (displayName, email, categories). The individual contact
  // object is stored by reference in all subcategories. Do not replace it, but
  // update it and keep the same object as a container (otherwise all references
  // will be disconnected).
  Object.keys(oldContact).forEach(key => {
    delete oldContact[key];
  });
  Object.keys(newContact).forEach(key => {
    oldContact[key] = newContact[key];
  });

  // Remove no longer existing categories from the cache.
  // The function removeCategoryFromCachedContact will remove the category and
  // all its sub categories, no need to remove them individually.
  const deletion = removeSubCategories(
    oldCategories.filter(o => !newCategories.includes(o))
  );
  printToConsole.debug("Deletion", deletion);
  for (const cat of deletion) {
    await removeCategoryFromCachedContact(addressBook, id, cat);
    await removeCategoryFromCachedContact(virtualAddressBook, id, cat);
  }

  // Update the category cache (we need to do this even if no category changed,
  // since the contact may have been changed and needs to be re-sorted.
  // The function updateContactCategoryCache automatically handles implicit
  // categories, so we can strip them here.
  const currentCategories = removeImplicitCategories(newCategories);
  printToConsole.debug("Current", currentCategories);
  for (const cat of currentCategories) {
    await updateContactCategoryCache(addressBook, id, cat);
    await updateContactCategoryCache(virtualAddressBook, id, cat);
  }
  addressBook.contacts = sortContactsMap(addressBook.contacts);
  virtualAddressBook.contacts = sortContactsMap(virtualAddressBook.contacts);
}

export async function deleteContactInCache(
  addressBook, 
  virtualAddressBook,
  contactId
) {
  const contact = virtualAddressBook.contacts.get(contactId);
  // Remove contact from  category cache.
  // The function removeCategoryFromCachedContact will remove the category and
  // all its sub categories. Strip away subcategories, since there is no need to
  // remove them individually.
  // Note: This removes all categories from contact.categories, since the virtual
  // address book and the individual address book reference the same contacts
  // object, both address books have to be handled in this loop.
  // Note: The addressBook parameter is optional, when the entire book is being
  // removed from cache - so we do not need to remove the individual contacts.
  for (const cat of removeSubCategories([...contact.categories])) {
    // This is usually used to remove a category from a contact, which will update
    // the contact cache. It removes the category from contact.categories and
    // removes the contact from the category cache. The first part is not really
    // needed, as the entire contact will be removed, but the second part is
    // important, to purge the contact from the category cache.
    if (addressBook) {
      await removeCategoryFromCachedContact(addressBook, contact.id, cat);
    }
    await removeCategoryFromCachedContact(virtualAddressBook, contact.id, cat);
  }
  // Remove contact from address books cache.
  if (addressBook) {
    addressBook.contacts.delete(contactId);
  }
  virtualAddressBook.contacts.delete(contactId);
}

/**
 * Sort the contacts Map(), unknown names and/or unknown emails to the top.
 */
export function sortContactsMap(contacts) {
  return new Map([...contacts.values()]
    .sort((a, b) => {
      let _a = a.name ? `3_${a.name}` : a.email ? `2_${a.email}` : `1_${a.id}`
      let _b = b.name ? `3_${b.name}` : b.email ? `2_${b.email}` : `1_${a.id}`
      return _a.localeCompare(_b);
    })
    .map(e => [e.id, e])
  );
}

/**
 * Sort the categories map by its keys, which are the categories name. 
 */
export function sortCategoriesMap(map) {
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Updates the category cache of the given contact. The provided categoryStr will
 * be expanded and all implicit parent categories will be handled automatically.
 * 
 * @param {*} addressBook 
 * @param {*} contactId 
 * @param {*} categoryStr
 */
async function updateContactCategoryCache(
  addressBook,
  contactId,
  categoryStr,
) {
  printToConsole.info(
    "updateContactCategoryCache",
    addressBook,
    contactId,
    categoryStr,
  );

  // Walk through the full category name, level by level, and update contact and
  // category cache for each level.
  const contact = addressBook.contacts.get(contactId);
  const pendingCategoryLevels = categoryStringToArr(categoryStr);
  let categoryLevels = [];
  let categoryObject = addressBook;
  while (pendingCategoryLevels.length > 0) {
    let categoryPart = pendingCategoryLevels.shift();
    categoryLevels.push(categoryPart);
    let categoryName = categoryArrToString(categoryLevels);

    // Update cached contact data.
    if (!contact.categories.has(categoryName)) {
      contact.categories.add(categoryName);
    }

    // Update cached categories.
    if (!categoryObject.categories.has(categoryPart)) {
      categoryObject.categories.set(
        categoryPart, Category.createSubcategory(categoryObject, categoryPart)
      );
      categoryObject.categories = sortCategoriesMap(categoryObject.categories);
    }
    categoryObject = categoryObject.categories.get(categoryPart);
    categoryObject.contacts.set(contactId, addressBook.contacts.get(contactId));
    categoryObject.contacts = sortContactsMap(categoryObject.contacts);
  }
  printToConsole.info("Categories data updated: ", contact.categories);
}

/**
 * Removes a category and all its subcategories from the cache.
 * 
 * @param {*} addressBook 
 * @param {*} contactId 
 * @param {*} categoryStr
 * @returns 
 */
async function removeCategoryFromCachedContact(
  addressBook,
  contactId,
  categoryStr,
) {
  printToConsole.info(
    "removeCategoryFromCachedContact",
    addressBook,
    contactId,
    categoryStr,
  );

  // Update contact cache: Remove category and all subcategories from
  // contact.categories
  const contact = addressBook.contacts.get(contactId);
  contact.categories.forEach(category => {
    if (category == categoryStr || isSubcategoryOf(category, categoryStr)) {
      contact.categories.delete(category);
    }
  })

  // Update category cache: Remove this contact from categoryObj.contacts and
  // all subcategories.
  let parentCategoryStr = getParentCategoryStr(categoryStr);
  let parentCategoryObj = parentCategoryStr
    ? lookupCategory(addressBook, parentCategoryStr)
    : addressBook;

  if (!parentCategoryObj) {
    return;
  }

  function recursiveRemove(parentCategoryObj, category, contactId) {
    if (!parentCategoryObj.categories.has(category)) {
      return;
    }

    let categoryObject = parentCategoryObj.categories.get(category);
    categoryObject.contacts.delete(contactId);
    if (categoryObject.contacts.size == 0) {
      // If this was the last contact in that category, remove the entire category.
      parentCategoryObj.categories.delete(category);
    } else {
      // Loop over all subcategories.
      categoryObject.categories.forEach((value, subCategory) => {
        recursiveRemove(categoryObject, subCategory, contactId);
      });
    }
  }

  recursiveRemove(parentCategoryObj, categoryStringToArr(categoryStr).pop(), contactId);
  printToConsole.info("Categories data updated: ", contact.categories);
}
