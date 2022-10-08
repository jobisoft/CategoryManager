import data from "../modules/fake-data-provider.mjs";
import { AddressBook } from "../modules/category.mjs";
import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import { mapIterator } from "../modules/utils.mjs";
import { toRFC5322EmailAddress } from "../modules/contact.mjs";

let addressBooks = Object.fromEntries(
  data.map((d) => [d.name, AddressBook.fromFakeData(d)])
);

console.log(addressBooks);
const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

// currentCategoryElement is only used for highlighting current selection
let elementForContextMenu, currentCategoryElement;

// TODO: handling special case: no address book available
let currentAddressBook = Object.values(addressBooks)[0];

document.addEventListener("contextmenu", (e) => {
  browser.menus.overrideContext({ context: "tab", tabId: tab.id });
  elementForContextMenu = e.target;
  console.log("contextmenu");
});

browser.menus.onShown.addListener((info, tab) => {
  console.log(info, elementForContextMenu);
});

browser.menus.onClicked.addListener((info, tab) => {
  console.log(info);
});

let contactList = createContactList(currentAddressBook.contacts);
const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = currentAddressBook.name;
let categoryTree = createCategoryTree({
  data: currentAddressBook,
  click(event) {
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
    const isUncategorized = currentCategoryElement.dataset.uncategorized;

    let newData = currentAddressBook.lookup(
      categoryKey,
      isUncategorized != null
    ).contacts;
    categoryTitle.innerText = categoryKey;
    contactList.update(newData);
  },
  async doubleClick(event) {
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    const contacts = currentAddressBook.lookup(categoryKey).contacts;
    if (isComposeAction) {
      await addContactsToComposeDetails("bcc", contacts);
    } else {
      // open a new messageCompose window
      await browser.compose.beginNew(null, {
        bcc: contacts.map(toRFC5322EmailAddress),
      });
    }
    window.close();
  },
});

let addressBookList = createAddressBookList({
  data: Object.values(addressBooks),
  click(event) {
    const addressBookName = event.target.dataset.addressBook;
    if (addressBookName == null) return;
    currentAddressBook = addressBooks[addressBookName];
    categoryTitle.innerText = currentAddressBook.name;
    categoryTree.update(currentAddressBook);
    contactList.update(currentAddressBook.contacts);
  },
});

async function addContactsToComposeDetails(fieldName, contacts) {
  const details = await browser.compose.getComposeDetails(tab.id);
  const addresses = details[fieldName];
  let map = new Map();
  addresses.forEach((addr) => {
    const { address, name } = emailAddresses.parseOneAddress(addr);
    map.set(address, name);
  });
  contacts.forEach(({ email, name }) => {
    // Add this contact if it doesn't exist in the map
    if (!map.has(email)) map.set(email, name);
  });
  const emailList = [...mapIterator(map.entries(), toRFC5322EmailAddress)];
  // set compose details
  await browser.compose.setComposeDetails(tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}

addressBookList.render();
categoryTree.render();
contactList.render();
