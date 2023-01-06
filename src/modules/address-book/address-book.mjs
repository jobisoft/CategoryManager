import { buildUncategorizedCategory, Category } from "./category.mjs";
import {
  categoryStringToArr,
  SUBCATEGORY_SEPARATOR,
} from "./category-utils.mjs";
import { parseContact } from "../contact.mjs";
import { sortMapByKey } from "../utils.mjs";

export class AddressBook {
  categories = new Map();
  uncategorized;
  contacts; // For O(1) Lookup/Delete/Add
  contactKeys; // Keep it sorted. O(log n) Lookup and O(n) Add/Delete
  name;
  id;
  path = null; // For compatibility with class Category,
  // especially when building uncategorized category

  constructor(name, contacts, id) {
    this.name = name;
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
    buildUncategorizedCategory(this);
  }

  #addContactToCategoryWhenBuildingTree(contact, categoryStr) {
    const category = categoryStringToArr(categoryStr);
    let rootName = category[0];
    if (!this.categories.has(rootName)) {
      this.categories.set(rootName, new Category(rootName, rootName));
      this.categories = sortMapByKey(this.categories);
    }
    let cur = this.categories.get(rootName);
    cur.contacts[contact.id] = null;
    let path = rootName;
    category.slice(1).forEach((cat) => {
      path += SUBCATEGORY_SEPARATOR + cat;
      if (!cur.categories.has(cat)) {
        cur.categories.set(cat, new Category(cat, path));
        cur.categories = sortMapByKey(cur.categories);
      }
      cur = cur.categories.get(cat);
      cur.contacts[contact.id] = null;
    });
  }

  lookup(categoryKey, isUncategorized = false) {
    return lookupCategory(this, categoryKey, isUncategorized);
  }
}

export function lookupCategory(
  addressBook,
  categoryKey,
  isUncategorized = false
) {
  // look up a category using a key like `A / B`
  console.log("Looking up", categoryKey);
  const category = categoryStringToArr(categoryKey);
  if (isUncategorized) {
    // remove the last sub category
    category.pop();
  }
  let cur = addressBook;
  for (const cat of category) {
    if (!cur.categories.has(cat)) return null;
    cur = cur.categories.get(cat);
  }
  const categoryResult = isUncategorized ? cur.uncategorized : cur;
  return categoryResult;
}

export function id2contact(addressBook, contactId) {
  return addressBook.contacts[contactId];
}
