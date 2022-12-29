import {
  AddressBook,
  createContact,
  deleteContact,
  updateContact,
} from "../modules/address-book.mjs";
// import data from "../modules/fake-data-provider.mjs";

// Populating Cache

console.info("Populating cache...");

let abInfos = await browser.addressBooks.list();
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);
// abValues.unshift(AddressBook.fromFakeData(data[2]));
// Make "All Contacts" the first one
abValues.unshift(AddressBook.fromAllContacts(abValues));
// Map guarantees the order of keys is the insertion order
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

console.info("Done populating cache!");

console.log(abValues);

// Synchronization

browser.contacts.onCreated.addListener((node) => {
  console.log("Create", node);
  let addressBookId = node.parentId;
  createContact(addressBooks.get(addressBookId), node);
});

browser.contacts.onUpdated.addListener((node, changedProperties) => {
  let addressBookId = node.parentId;
  console.log(node, changedProperties);
  updateContact(addressBooks.get(addressBookId), node, changedProperties);
});

browser.contacts.onDeleted.addListener((addressBookId, id) => {
  let ab = addressBooks.get(addressBookId);
  deleteContact(ab, id);
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
