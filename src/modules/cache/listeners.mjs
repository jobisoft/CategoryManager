/**
 * This module provides a method to register all the required listeners in order
 * to keep our caches up-to-date, if any of the contacts have been changed in the
 * backend.
 *
 * This also includes changes which are caused by this add-on, so there is no need
 * to manually update the cache at all.
 */

import { AddressBook } from "./addressbook.mjs";
import {
  createContactInCache,
  createContactsInCache,
  modifyContactInCache,
  deleteContactInCache,
} from "./update.mjs";

/**
 * Main cache update listener registration. The callback can be used to store
 * the updated cache or to update the UI.
 */
export function registerCacheUpdateCallback(addressBooks, callback) {
  browser.contacts.onCreated.addListener(async (node) => {
    await updateCacheOnContactCreation(addressBooks, node);
    await callback(addressBooks);
  });
  browser.contacts.onUpdated.addListener(async (node, changedProperties) => {
    await updateCacheOnContactUpdate(addressBooks, node, changedProperties);
    await callback(addressBooks);
  });
  browser.contacts.onDeleted.addListener(async (addressBookId, contactId) => {
    await updateCacheOnContactDeletion(addressBooks, addressBookId, contactId);
    await callback(addressBooks);
  });
  browser.addressBooks.onCreated.addListener(async (node) => {
    await updateCacheOnAddressBookCreation(addressBooks, node);
    await callback(addressBooks);
  });
  browser.addressBooks.onUpdated.addListener(async (node) => {
    await updateCacheOnAddressBookUpdate(addressBooks, node);
    await callback(addressBooks);
  });
  browser.addressBooks.onDeleted.addListener(async (node) => {
    await updateCacheOnAddressBookDeletion(addressBooks, node);
    await callback(addressBooks);
  });
}

async function updateCacheOnContactCreation(addressBooks, node) {
  console.log("updateCacheOnContactCreation", node.id);
  return;
  
  let addressBookId = node.parentId;
  await createContactInCache(addressBooks.get(addressBookId), node);
  await createContactInCache(addressBooks.get("all-contacts"), node);
}

async function updateCacheOnContactUpdate(
  addressBooks,
  node,
  changedProperties
) {
  console.log("updateCacheOnContactUpdate", node.id);
  return;

  await modifyContactInCache(
    addressBooks.get(node.parentId),
    addressBooks.get("all-contacts"),
    node,
    changedProperties
  );
}

async function updateCacheOnContactDeletion(
  addressBooks,
  addressBookId,
  contactId
) {
  console.log("updateCacheOnContactDeletion", contactId);
  return;

  await deleteContactInCache(addressBooks.get(addressBookId), contactId);
  await deleteContactInCache(addressBooks.get("all-contacts"), contactId);
}

async function updateCacheOnAddressBookCreation(addressBooks, node) {
  console.log("updateCacheOnAddressBookCreation", node.name);
  return;

  // 1. Create the new address book
  const newAddressBook = await AddressBook.fromTBAddressBook(node);
  addressBooks.set(node.id, newAddressBook);
  // 2. Update the "all-contacts" address book
  let allContacts = addressBooks.get("all-contacts");
  await createContactsInCache(allContacts, newAddressBook.contacts);
}

async function updateCacheOnAddressBookUpdate(addressBooks, { id, name }) {
  console.log("updateCacheOnAddressBookUpdate", node.name);
  return;

  // This event is only fired if the name of the address book has been changed.
  addressBooks.get(id).name = name;
}

async function updateCacheOnAddressBookDeletion(addressBooks, addressBookId) {
  console.log("updateCacheOnAddressBookDeletion", addressBookId);
  return;

  // 1. Update the "all-contacts" address book
  const deletedAddressBook = addressBooks.get(addressBookId);
  let allContacts = addressBooks.get("all-contacts");
  for (const contactId of deletedAddressBook.contacts.keys()) {
    await deleteContactInCache(allContacts, contactId);
  }
  // 2. Delete the address book
  addressBooks.delete(addressBookId);
}
