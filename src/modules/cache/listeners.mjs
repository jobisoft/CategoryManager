/**
 * This module provides a method to register all the required listeners in order
 * to keep our caches up-to-date, if any of the contacts have been changed in the
 * backend.
 *
 * This also includes changes which are caused by this add-on, so there is no need
 * to manually update the cache at all.
 */

import { AddressBook } from "./addressbook.mjs";
import { parseContact } from "../contacts/contact.mjs";
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
    await updateCacheOnContactUpdate(addressBooks, node);
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
  const contact = parseContact(node);
  await createContactInCache(
    addressBooks.get(addressBookId),
    addressBooks.get("all-contacts"),
    contact
  );
}

async function updateCacheOnContactUpdate(
  addressBooks,
  node
) {
  const newContact = parseContact(node);
  await modifyContactInCache(
    addressBooks.get(node.parentId),
    addressBooks.get("all-contacts"),
    newContact
  );
}

async function updateCacheOnContactDeletion(
  addressBooks,
  addressBookId,
  contactId
) {
  await deleteContactInCache(
    addressBooks.get(addressBookId),
    addressBooks.get("all-contacts"),
    contactId
  );
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
  const addressBook = addressBooks.get(addressBookId);
  const virtualAddressBook = addressBooks.get("all-contacts");
  for (const contactId of addressBook.contacts.keys()) {
    await deleteContactInCache(
      null,  // We are going to delete the entire cache, so no need to delete the contacts.
      virtualAddressBook, 
      contactId
    );
  }
  // 2. Delete the address book
  addressBooks.delete(addressBookId);
}
