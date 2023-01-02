import { initErrorHandler } from "./error-handler.mjs";

initErrorHandler();

let addressBooks = new Map();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

let elementForContextMenu,
  currentCategoryElement,
  currentDraggingOverCategoryElement,
  currentContactDataFromDragAndDrop,
  allContactsVirtualAddressBook,
  currentAddressBook,
  allowEdit = false;

// ---------------------------
//  Communication with cache
// ---------------------------

let messageHandlers = {
  fullUpdate(args) {
    addressBooks = args;
    allContactsVirtualAddressBook = addressBooks.get("all-contacts");
    currentAddressBook = allContactsVirtualAddressBook;
    if (currentAddressBook == null)
      document.getElementById("info-text").style.display = "initial";
    allowEdit = true;
  },
};

let port = browser.runtime.connect({ name: "sync" });

await new Promise((resolve) => {
  port.postMessage({ type: "fullUpdate" });
  port.onMessage.addListener(async ({ type, args }) => {
    console.log(`Received ${type}`, args);
    messageHandlers[type](args);
    resolve();
  });
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
