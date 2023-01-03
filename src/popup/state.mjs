import { initErrorHandler } from "./error-handler.mjs";

initErrorHandler();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

let elementForContextMenu,
  currentCategoryElement,
  currentDraggingOverCategoryElement,
  currentContactDataFromDragAndDrop,
  allowEdit = false;

// ---------------------------
//  Communication with cache
// ---------------------------

let bg = await browser.runtime.getBackgroundPage();
let addressBooks = bg.addressBooks;
let allContactsVirtualAddressBook = addressBooks.get("all-contacts");
let currentAddressBook = allContactsVirtualAddressBook;
if (currentAddressBook == null)
  document.getElementById("info-text").style.display = "initial";
allowEdit = true;

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
