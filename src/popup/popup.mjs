import {
  AddressBook,
  lookupCategory,
  id2contact,
} from "../modules/address-book.mjs";
import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import {
  toRFC5322EmailAddress,
  addContactsToComposeDetails,
} from "../modules/contact.mjs";
import {
  createMenuForCategoryTree,
  createMenuForContactList,
  destroyAllMenus,
} from "../modules/context-menu.mjs";
// global object: emailAddresses, ICAL from popup.html

let addressBooks = new Map();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

// currentCategoryElement is only used for highlighting current selection
let elementForContextMenu, currentCategoryElement;

// Default to all contacts
let currentAddressBook = addressBooks.get("all-contacts");

function fullUpdateUI() {
  currentAddressBook = addressBooks.get("all-contacts");
  if (currentAddressBook == null)
    document.getElementById("info-text").style.display = "initial";
  categoryTitle.innerText = currentAddressBook?.name ?? "";
  addressBookList.update([...addressBooks.values()]);
  categoryTree.update(currentAddressBook);
  contactList.update({
    addressBook: currentAddressBook,
    contacts: currentAddressBook?.contacts ?? {},
  });
}

function lookupContactsByCategoryElement(element) {
  // find contacts by an category html element
  const categoryKey = element.dataset.category;
  const isUncategorized = element.dataset.uncategorized != null;
  return lookupCategory(currentAddressBook, categoryKey, isUncategorized)
    .contacts;
}

function makeMenuEventHandler(fieldName) {
  return async () => {
    const contacts = lookupContactsByCategoryElement(elementForContextMenu);
    if (isComposeAction) {
      await addContactsToComposeDetails(fieldName, tab, contacts);
    } else {
      // Do a filterMap(using a flatMap) to remove contacts that do not have an email address
      // and map the filtered contacts to rfc 5322 email address format.
      const emailList = Object.keys(contacts).flatMap((c) => {
        const contact = id2contact(currentAddressBook, c);
        return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
      });
      await browser.compose.beginNew(null, { [fieldName]: emailList });
    }
    window.close();
  };
}

function overrideMenuForCategoryTree() {
  destroyAllMenus();
  createMenuForCategoryTree();
}

function overrideMenuForContactList() {
  destroyAllMenus();
  createMenuForContactList();
}

document.addEventListener("contextmenu", (e) => {
  browser.menus.overrideContext({ context: "tab", tabId: tab.id });
  elementForContextMenu = e.target;
  console.log(elementForContextMenu);
  // Check if the right click originates from contact list
  if (elementForContextMenu.parentNode.dataset.id != null) {
    // Right click on contact info
    console.log("CONTACT");
    elementForContextMenu = elementForContextMenu.parentNode;
    overrideMenuForContactList();
    return;
  } else if (elementForContextMenu.dataset.id != null) {
    console.log("CONTACT");
    overrideMenuForContactList();
    return;
  }
  overrideMenuForCategoryTree();
  // Check if the right click originates from category tree
  if (elementForContextMenu.nodeName === "I")
    // Right click on the expander icon. Use the parent element
    elementForContextMenu = elementForContextMenu.parentNode;
  if (elementForContextMenu.dataset.category == null)
    // No context menu outside category tree
    e.preventDefault();
});

const contextMenuHandlers = {
  add_to: makeMenuEventHandler("to"),
  add_cc: makeMenuEventHandler("cc"),
  add_bcc: makeMenuEventHandler("bcc"),
};

browser.menus.onShown.addListener((info, tab) => {
  console.log(info, elementForContextMenu);
});

browser.menus.onClicked.addListener(async ({ menuItemId }, tab) => {
  const handler = contextMenuHandlers[menuItemId];
  if (handler != null) {
    handler();
  } else {
    console.error("No handler for", menuItemId);
  }
});

let contactList = createContactList({
  addressBook: currentAddressBook,
  contacts: currentAddressBook?.contacts ?? {},
});

const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = currentAddressBook?.name ?? "";
let categoryTree = createCategoryTree({
  data: currentAddressBook,
  click(event) {
    console.log("Click", event);
    if (event.detail > 1) {
      // Disable click event on double click
      event.preventDefault();
      return false;
    }
    if (event.target.nodeName === "I")
      // A click on the expander
      return;
    event.preventDefault();

    const categoryKey = event.target.dataset.category;
    if (categoryKey == null)
      // Not a click on category
      return;

    if (currentCategoryElement != null)
      currentCategoryElement.classList.remove("active");
    currentCategoryElement = event.target;
    currentCategoryElement.classList.add("active");
    const newData = {
      addressBook: currentAddressBook,
      contacts: lookupContactsByCategoryElement(currentCategoryElement),
    };
    categoryTitle.innerText = categoryKey;
    contactList.update(newData);
  },
  async doubleClick(event) {
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    const contacts = lookupContactsByCategoryElement(event.target);
    if (isComposeAction) {
      await addContactsToComposeDetails("bcc", tab, contacts);
    } else {
      // open a new messageCompose window
      await browser.compose.beginNew(null, {
        bcc: Object.keys(contacts).flatMap((c) => {
          const contact = id2contact(currentAddressBook, c);
          return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
        }),
      });
    }
    window.close();
  },
});

let addressBookList = createAddressBookList({
  data: [...addressBooks.values()],
  click(event) {
    const addressBookId = event.target.dataset.addressBook;
    if (addressBookId == null) return;
    currentAddressBook = addressBooks.get(addressBookId);
    categoryTitle.innerText = currentAddressBook.name;
    categoryTree.update(currentAddressBook);
    contactList.update({
      addressBook: currentAddressBook,
      contacts: currentAddressBook.contacts,
    });
  },
});

addressBookList.render();
categoryTree.render();
contactList.render();

let myPort = browser.runtime.connect({ name: "sync" });
myPort.postMessage({ type: "fullUpdate" });
myPort.onMessage.addListener(({ type, args }) => {
  console.log(`Received ${type}`, args);
  messageHandlers[type](args);
});

let messageHandlers = {
  fullUpdate(args) {
    addressBooks = args;
    // The addressBooks lose their prototype in communication
    for (let value of addressBooks.values()) {
      Object.setPrototypeOf(value, AddressBook.prototype);
    }
    fullUpdateUI();
  },
};
