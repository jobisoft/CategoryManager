import {
  AddressBook,
  registerCacheUpdateCallback,
} from "../modules/cache/index.mjs";

async function storeCache(addressBooks) {
  await browser.storage.local.set({ addressBooks });
}

// Populating Cache
console.info("Populating cache...");

let abInfos = await browser.addressBooks.list();
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);

// Make "All Contacts" the first one.
const allContactsVirtualAddressBook = AddressBook.fromAllContacts(
  abValues,
  await browser.i18n.getMessage("tree.category.all")
);
abValues.unshift(allContactsVirtualAddressBook);
let addressBooks = new Map(abValues.map((ab) => [ab.id, ab]));

// Store the newly created cache to extension's local storage. Note: This
// removes all additional prototypes of our AddressBook and Category classes.
await storeCache(addressBooks);

console.info("Done populating cache!");

// Register listener to update cache on backend changes.
registerCacheUpdateCallback(addressBooks, storeCache)
