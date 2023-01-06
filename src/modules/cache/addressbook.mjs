import {
  buildUncategorizedCategory,
  Category,
  categoryStringToArr,
  SUBCATEGORY_SEPARATOR,
} from "./category.mjs";
import { parseContact } from "../contacts/contact.mjs";
import { sortMapByKey } from "../utils.mjs";

export class AddressBook {
  constructor(name, contacts, id) {
    this.name = name;
    this.categories = new Map();
    this.contacts = contacts;
    this.id = id ?? name;
  }

  static fromFakeData(addressBook) {
    let ab = new AddressBook(addressBook.name, addressBook.contacts);
    ab.#build();
    return ab;
  }

  static async fromTBAddressBook({ name, id }) {
    const rawContacts = await browser.contacts.list(id);
    const contacts = Object.fromEntries(
      rawContacts.map((contact) => {
        const parsed = parseContact(contact);
        return [parsed.id, parsed];
      })
    );
    let ab = new AddressBook(name, contacts, id);
    ab.#build();
    return ab;
  }

  static fromAllContacts(addressBooks, name) {
    let contacts = {};
    for (const ab of addressBooks) {
      for (const contactId in ab.contacts) {
        contacts[contactId] = structuredClone(ab.contacts[contactId]);
      }
    }
    let ret = new AddressBook(name, contacts, "all-contacts");
    ret.#build();
    return ret;
  }

  #build() {
    for (const id in this.contacts) {
      const contact = this.contacts[id];
      for (const category of contact.categories) {
        this.#addContactToCategoryWhenBuildingTree(contact, category);
      }
    }
  }

  #addContactToCategoryWhenBuildingTree(contact, categoryStr) {
    const category = categoryStringToArr(categoryStr);
    let rootName = category[0];
    if (!this.categories.has(rootName)) {
      this.categories.set(rootName, new Category(rootName, rootName));
      this.categories = sortMapByKey(this.categories);
    }
    let cur = this.categories.get(rootName);
    cur.contacts[contact.id] = this.contacts[contact.id];
    let path = rootName;
    category.slice(1).forEach((cat) => {
      path += SUBCATEGORY_SEPARATOR + cat;
      if (!cur.categories.has(cat)) {
        cur.categories.set(cat, new Category(cat, path));
        cur.categories = sortMapByKey(cur.categories);
      }
      cur = cur.categories.get(cat);
      cur.contacts[contact.id] = this.contacts[contact.id];
    });
  }
}

export function lookupCategory(
  addressBook,
  categoryKey,
  getUncategorized = false
) {
  // look up a category using a key like `A / B`
  console.log("Looking up", categoryKey);
  const category = categoryStringToArr(categoryKey);
  if (getUncategorized) {
    // remove the last sub category
    // TODO : Correct ?
    category.pop();
  }
  let cur = addressBook;
  for (const cat of category) {
    if (!cur.categories.has(cat)) return null;
    cur = cur.categories.get(cat);
  }
  return getUncategorized 
    ? buildUncategorizedCategory(cur)
    : cur;
}

export function id2contact(addressBook, contactId) {
  return addressBook.contacts[contactId];
}
