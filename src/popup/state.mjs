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
  // TODO : Before loading the cache, ping the background if it has written the
  //        cache already. The listener for the former port based communication
  //        used here was created only after it was written, so if this script run
  //        first, it would just fail to connect and die. Instead - if we want to
  //        catch this case - we should set a flag in the background and simply
  //        poll it here with runtime.sendMessage() and wait until it comes back
  //        as true.
  const { addressBooks } = await browser.storage.local.get("addressBooks");
  state.addressBooks = addressBooks;
  console.log(addressBooks);
  state.allContactsVirtualAddressBook = state.addressBooks.get("all-contacts");
  state.currentAddressBook = state.allContactsVirtualAddressBook;
  if (state.currentAddressBook == null)
    document.getElementById("info-text").style.display = "initial";
  state.allowEdit = true;
}

await load();

export default state;
