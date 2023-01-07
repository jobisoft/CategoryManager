import {
  AddressBook,
  registerCacheUpdateCallback,
} from "../modules/cache/index.mjs";

async function storeCache(addressBooks) {
  await browser.storage.local.set({ addressBooks });
}

console.info("Populating cache...");

// Disable action buttons while cache is being populated.
browser.browserAction.disable();
browser.browserAction.setBadgeText({ text: "🔄" });
browser.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
browser.composeAction.disable();
browser.composeAction.setBadgeText({ text: "🔄" });
browser.composeAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });

let abInfos = await browser.addressBooks.list();

// Add each single address book.
let abValues = await Promise.all(
  abInfos.map((ab) => AddressBook.fromTBAddressBook(ab))
);

// Add the virtual "All Contacts" address book and make it the first one.
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

// Re-enable our action buttons after cache has been populated.
browser.browserAction.enable();
browser.browserAction.setBadgeText({ text: null });
browser.composeAction.enable();
browser.composeAction.setBadgeText({ text: null });
