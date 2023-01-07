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

async function updateCacheOnAddressBookCreation(addressBooks, node) {
  addressBooks.set(node.id, await AddressBook.fromTBAddressBook(node));
}

async function updateCacheOnAddressBookUpdate(addressBooks, { id, name }) {
  addressBooks.get(id).name = name;
}

async function updateCacheOnAddressBookDeletion(addressBooks, node) {
  addressBooks.delete(node.id);
}
