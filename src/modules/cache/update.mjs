/**
 * This module provides methods to update our caches. They are supposed to be used
 * by contact listeners to automatically keep the cache up-to-date.
 */

import { parseContact } from "../contacts/contact.mjs";
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

/**
 * Add multiple contacts to the cache and sort them after all have been added.
 * 
 * @param {*} addressBook 
 * @param {*} contactNodes - a Map() or a Map()-like array of key-value-arrays 
 */
export async function createContactsInCache(addressBook, contactNodes) {
  for (let [contactId, contactNode] of contactNodes) {
    const contact = parseContact(contactNode);
    addressBook.contacts.set(contactId, contact);
    for (const categoryStr of contact.categories) {
      await addCategoryToCachedContact(addressBook, contactId, categoryStr);
    }
  }
  addressBook.contacts = sortContactsMap(addressBook.contacts);
}

/**
 * A convenient wrapper for createContactsInCache.
 * 
 * @param {*} addressBook 
 * @param {*} contactNode
 */
export async function createContactInCache(addressBook, contactNode) {
  return createContactsInCache(addressBook, [[contactNode.id, contactNode]])
}

export async function modifyContactInCache(
  addressBook,
  virtualAddressBook,
  contactNode,
  changedProperties
) {
  // We only care about email, name and categories
  // changedProperties only tells us whether Primary/SecondaryEmail changes.
  // it won't tell us if categories or other email address got updated.
  // Let's just parse the vCard again so that nothing is left behind!
  const id = contactNode.id;
  const newContact = parseContact(contactNode);
  const oldContact = addressBook.contacts.get(id);
  // Expand the categories here, to properly detect additions and deletions of
  // categories and subcategories.
  const newCategories = expandImplicitCategories(newContact.categories);
  const oldCategories = expandImplicitCategories(oldContact.categories);
  console.debug("Old categories: ", JSON.stringify([...oldCategories]));
  console.debug("New categories: ", JSON.stringify([...newCategories]));
  if (
    newCategories.length != oldCategories.length ||
    newCategories.some((value) => !oldCategories.includes(value))
  ) {
    // Categories changed.
    console.debug("changed contact:", newContact, changedProperties);

    // The function addCategoryToCachedContact automatically handles implicit
    // categories, no need to add them individually.
    const addition = removeImplicitCategories(
      newCategories.filter(n => !oldCategories.includes(n))
    );
    // The function removeCategoryFromCachedContact will remove the category and
    // all its sub categories, no need to remove them individually.
    const deletion = removeSubCategories(
      oldCategories.filter(o => !newCategories.includes(o))
    );

    console.debug("Addition", addition);
    for (const cat of addition) {
      await addCategoryToCachedContact(addressBook, id, cat);
      await addCategoryToCachedContact(virtualAddressBook, id, cat);
    }
    console.debug("Deletion", deletion);
    for (const cat of deletion) {
      await removeCategoryFromCachedContact(addressBook, id, cat);
      await removeCategoryFromCachedContact(virtualAddressBook, id, cat);
    }
  }
  addressBook.contacts.set(id, newContact);
  addressBook.contacts = sortContactsMap(addressBook.contacts);
}

export async function deleteContactInCache(addressBook, contactId) {
  // Remove contact from  category cache.
  const contact = addressBook.contacts.get(contactId);
  for (const cat of contact.categories) {
    // This is usually used to remove a category from a contact, which will update
    // the contact cache. It removes the category from contact.categories and
    // removes the contact from the category cache. The first part is not really
    // needed, as the entire contact will be removed, but the second part is
    // important, to purge the contact from the category cache.
    await removeCategoryFromCachedContact(addressBook, contact.id, cat);
  }
  // Remove contact from address book cache.
  addressBook.contacts.delete(contactId);
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
 * Adds a category and any implicit parent category along the way to the cache.
 * It is sufficient to call this function only for the deepest category level.
 * e.g. adding "A / B / C" automatically adds "A" and " A / B"
 * 
 * @param {*} addressBook 
 * @param {*} contactId 
 * @param {*} categoryStr
 */
async function addCategoryToCachedContact(
  addressBook,
  contactId,
  categoryStr,
) {
  console.info(
    "addCategoryToCachedContact",
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
  console.info("Categories data updated: ", contact.categories);
}

/**
 * Removes a category and all subcategories from the cache. It is sufficient to
 * call this function only for the highest category level.
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
  console.info(
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
  console.info("Categories data updated: ", contact.categories);
}
