import {
  AddressBook,
  createContact,
  deleteContact,
  updateContact,
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
// Map guarantees the order of keys is the insertion order
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

console.info("Done populating cache!");

console.log(abValues);

// Synchronization

browser.contacts.onCreated.addListener(async (node) => {
  console.log("Create", node);
  let addressBookId = node.parentId;
  await createContact(addressBooks.get(addressBookId), node);
  await createContact(allContactsVirtualAddressBook, node);
});

browser.contacts.onUpdated.addListener(async (node, changedProperties) => {
  let addressBookId = node.parentId;
  console.log(node, changedProperties);
  await updateContact(addressBooks.get(addressBookId), node, changedProperties);
  await updateContact(allContactsVirtualAddressBook, node, changedProperties);
});

browser.contacts.onDeleted.addListener(async (addressBookId, id) => {
  let ab = addressBooks.get(addressBookId);
  await deleteContact(ab, id);
  await deleteContact(allContactsVirtualAddressBook, id);
});

// Communication

let port;

let messageHandlers = {
  fullUpdate() {
    return addressBooks;
  },
};

function connected(p) {
  port = p;
  port.onMessage.addListener(({ type, args }) => {
    port.postMessage({ type, args: messageHandlers[type](args) });
  });
}

browser.runtime.onConnect.addListener(connected);
