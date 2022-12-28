import { AddressBook } from "../modules/address-book.mjs";
import data from "../modules/fake-data-provider.mjs"

// Populating Cache

console.info("Populating cache...");

let abInfos = await browser.addressBooks.list();
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);
abValues.unshift(AddressBook.fromFakeData(data[2]));
// Make "All Contacts" the first one
abValues.unshift(AddressBook.fromAllContacts(abValues));
// Map guarantees the order of keys is the insertion order
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

console.info("Done populating cache!");

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
