import data from "../modules/fake-data-provider.mjs";
import { AddressBook } from "../modules/category.mjs";
import { createContactList } from "./contact-list.mjs";
import { mapIterator } from "../modules/utils.mjs";
import { createAddressBookList } from "./address-book-list.mjs";

let addressBooks = data.map(AddressBook.fromFakeData);

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";
let contactList = createContactList(addressBooks[0].contacts);
const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = addressBooks[0].name;

let elementForContextMenu;

document.addEventListener("contextmenu", (e) => {
  browser.menus.overrideContext({ context: "tab", tabId: tab.id });
  elementForContextMenu = e.target;
  console.log("contextmenu");
});

browser.menus.onShown.addListener((info, tab) => {
  // Extra Sugar: Logic to detect if mouse was over a category and enable/disable
  // via menus.update menus (see info.menuIds)
  // You can even change visibility of entries

  // Maybe: https://www.sitepoint.com/community/t/determine-if-mouse-is-over-an-element/4239/4
  console.log(info, elementForContextMenu);
});

browser.menus.onClicked.addListener((info, tab) => {
  console.log(info);
});

let addressBookList = createAddressBookList({
  data: addressBooks,
  click(event) {
    if (event.detail > 1) {
      // Disable click event on double click
      event.preventDefault();
      return false;
    }
    console.log(event.target, event.target.dataset);
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    contactList.data = addressBook.lookup(categoryKey).contacts;
    categoryTitle.innerText = categoryKey;
    contactList.render();
  },
  async doubleClick(event) {
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    contactList.data = addressBook.lookup(categoryKey).contacts;
    // open a new messageCompose window
    await browser.compose.beginNew(null, {
      bcc: contactList.data.map(({ email, name }) =>
        name ? `${name} <${email}>` : email
      ),
    });
    window.close();
  },
});
addressBookList.render();

contactList.render();
