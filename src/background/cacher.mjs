import {
  AddressBook,
  registerCacheUpdateCallback,
} from "../modules/address-book/index.mjs";

// Populating Cache

console.info("Populating cache...");

let abInfos = await browser.addressBooks.list();
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);
// Make "All Contacts" the first one
const allContactsVirtualAddressBook = AddressBook.fromAllContacts(
  abValues,
  await browser.i18n.getMessage("tree.category.all")
);
abValues.unshift(allContactsVirtualAddressBook);
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

async function storeCache(addressBooks) {
  await browser.storage.local.set({ addressBooks });
}

// Store the newly created cache to extension's local storage
await storeCache(addressBooks);

console.info("Done populating cache!");

// Register listener to update cache on address book changes
registerCacheUpdateCallback(addressBooks, storeCache)
