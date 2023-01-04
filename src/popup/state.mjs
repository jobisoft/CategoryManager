import { initErrorHandler } from "./error-handler.mjs";

initErrorHandler();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

let addressBooks, allContactsVirtualAddressBook, currentAddressBook;

let elementForContextMenu,
  currentCategoryElement,
  currentDraggingOverCategoryElement,
  currentContactDataFromDragAndDrop,
  allowEdit = false;

async function load() {
  ({ addressBooks } = await browser.storage.local.get("addressBooks"));
  console.log(addressBooks);
  allContactsVirtualAddressBook = addressBooks.get("all-contacts");
  currentAddressBook = allContactsVirtualAddressBook;
  if (currentAddressBook == null)
    document.getElementById("info-text").style.display = "initial";
  allowEdit = true;
}

// ---------------------------
//  Communication with cache
// ---------------------------

let port = await browser.runtime.connect({ name: "sync" });

// Let the popup wait for the cache to be written into storage.local
await new Promise((resolve) => {
  async function requestCache() {
    port.onMessage.removeListener(requestCache);
    await load();
    resolve();
  }
  port.onMessage.addListener(requestCache);
  port.postMessage({ type: "requestCache" });
});

export default {
  addressBooks,
  elementForContextMenu,
  tab,
  isComposeAction,
  currentCategoryElement,
  currentDraggingOverCategoryElement,
  currentContactDataFromDragAndDrop,
  allContactsVirtualAddressBook,
  currentAddressBook,
  allowEdit,
};
