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
  browser.addressBooks.onCreated.addListener((node) => {
    // This listener must be synchronous, because the "onCreated" listener for
    // contacts will fire after this one, and we need to have the address book
    // in the cache already.
    updateCacheOnAddressBookCreation(addressBooks, node);
    callback(addressBooks);
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
  let addressBookId = node.parentId;
  await createContactInCache(addressBooks.get(addressBookId), node);
  await createContactInCache(addressBooks.get("all-contacts"), node);
}

async function updateCacheOnContactUpdate(
  addressBooks,
  node,
  changedProperties
) {
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
  await deleteContactInCache(addressBooks.get(addressBookId), contactId);
  await deleteContactInCache(addressBooks.get("all-contacts"), contactId);
}

function updateCacheOnAddressBookCreation(addressBooks, { name, id }) {
  // Create the new address book
  // We don't deal with the contacts here, because the "onCreated" event for
  // contacts will fire for each contact in the address book.
  const newAddressBook = new AddressBook(name, new Map(), id);
  addressBooks.set(id, newAddressBook);
}

async function updateCacheOnAddressBookUpdate(addressBooks, { id, name }) {
  // This event is only fired if the name of the address book has been changed.
  addressBooks.get(id).name = name;
}

async function updateCacheOnAddressBookDeletion(addressBooks, addressBookId) {
  // 1. Update the "all-contacts" address book
  const deletedAddressBook = addressBooks.get(addressBookId);
  let allContacts = addressBooks.get("all-contacts");
  for (const contactId of deletedAddressBook.contacts.keys()) {
    await deleteContactInCache(allContacts, contactId);
  }
  // 2. Delete the address book
  addressBooks.delete(addressBookId);
}
