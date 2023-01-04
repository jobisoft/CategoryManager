import { initErrorHandler } from "./error-handler.mjs";

initErrorHandler();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";
const spinnerElement = document.getElementById("spinner");

let state = {
  addressBooks: undefined,
  elementForContextMenu: undefined,
  tab,
  isComposeAction,
  currentCategoryElement: undefined,
  currentDraggingOverCategoryElement: undefined,
  currentContactDataFromDragAndDrop: undefined,
  allContactsVirtualAddressBook: undefined,
  currentAddressBook: undefined,
  __allowEdit: false,
  get allowEdit() {
    return this.__allowEdit;
  },
  set allowEdit(value) {
    this.__allowEdit = value;
    if (this.__allowEdit) {
      spinnerElement.classList.remove("show");
    } else {
      spinnerElement.classList.add("show");
    }
  },
};

async function load() {
  const { addressBooks } = await browser.storage.local.get("addressBooks");
  state.addressBooks = addressBooks;
  console.log(addressBooks);
  state.allContactsVirtualAddressBook = state.addressBooks.get("all-contacts");
  state.currentAddressBook = state.allContactsVirtualAddressBook;
  if (state.currentAddressBook == null)
    document.getElementById("info-text").style.display = "initial";
  state.allowEdit = true;
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

export default state;
