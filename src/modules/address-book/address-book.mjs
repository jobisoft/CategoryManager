import { Category, SUBCATEGORY_SEPARATOR } from "./category.mjs";
import { parseContact } from "../contact.mjs";
import { filterObjectByKeyToNull, isEmptyObject } from "../utils.mjs";

export class AddressBook {
  categories = {};
  uncategorized;
  contacts;
  name;
  id;

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

  static fromAllContacts(addressBooks) {
    let contacts = {};
    for (const ab of addressBooks) {
      Object.assign(contacts, ab.contacts);
    }
    let ret = new AddressBook("All Contacts", contacts, "all-contacts");
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
    this.#buildUncategorized();
  }

  #buildUncategorized() {
    // only call this method once
    let contacts = {};
    for (const cat in this.categories) {
      this.categories[cat].buildUncategorized();
      Object.assign(contacts, this.categories[cat].contacts);
    }
    const filtered = filterObjectByKeyToNull(
      this.contacts,
      (x) => !(x in contacts)
    );
    if (isEmptyObject(filtered)) return;
    this.uncategorized = new Category(
      "Uncategorized",
      "Uncategorized",
      filtered,
      {},
      true
    );
  }

  #addContactToCategoryWhenBuildingTree(contact, category) {
    let rootName = category[0];
    this.categories[rootName] ??= new Category(rootName, rootName);
    let cur = this.categories[rootName];
    cur.contacts[contact.id] = null;
    let path = rootName;
    category.slice(1).forEach((cat) => {
      path += SUBCATEGORY_SEPARATOR + cat;
      cur.categories[cat] ??= new Category(cat, path);
      cur = cur.categories[cat];
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
  let category = categoryKey.split(SUBCATEGORY_SEPARATOR);
  if (isUncategorized) {
    // remove the last sub category
    category.pop();
  }
  let cur = addressBook;
  for (const cat of category) {
    if (cur.categories[cat] == null) return null;
    cur = cur.categories[cat];
  }
  return isUncategorized ? cur.uncategorized : cur;
}

export function id2contact(addressBook, contactId) {
  return addressBook.contacts[contactId];
}
