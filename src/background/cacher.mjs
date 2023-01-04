import {
  AddressBook,
  updateCacheOnContactCreation,
  updateCacheOnContactDeletion,
  updateCacheOnContactUpdate,
} from "../modules/address-book/index.mjs";
// Populating Cache

console.info("Populating cache...");

let abInfos = await browser.addressBooks.list();
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);
// Make "All Contacts" the first one
const allContactsVirtualAddressBook = AddressBook.fromAllContacts(abValues);
abValues.unshift(allContactsVirtualAddressBook);
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

async function store(addressBooks) {
  // Store the fresh cache to extension's local storage
  await browser.storage.local.set({ addressBooks });
}

await store(addressBooks);
console.info("Done populating cache!");

// Synchronization

browser.contacts.onCreated.addListener(async (node) => {
  console.log("Create", node);
  await updateCacheOnContactCreation(addressBooks, node);
  await store(addressBooks);
});

browser.contacts.onUpdated.addListener(async (node, changedProperties) => {
  console.debug(node, changedProperties);
  await updateCacheOnContactUpdate(addressBooks, node, changedProperties);
  await store(addressBooks);
  console.debug("Updated cache", addressBooks);
});

browser.contacts.onDeleted.addListener(async (addressBookId, contactId) => {
  await updateCacheOnContactDeletion(addressBooks, addressBookId, contactId);
  await store(addressBooks);
});

// Communication

let port;

let messageHandlers = {
  requestCache() {
    // Let the popup wait for the cache to be written into storage.local
    // Just returns. When we can handle the request in the bg page, the
    // cache is already written.
    return;
  },
};

function connected(p) {
  port = p;
  port.onMessage.addListener(({ type, args }) => {
    port.postMessage({ type, args: messageHandlers[type](args) });
  });
}

browser.runtime.onConnect.addListener(connected);
