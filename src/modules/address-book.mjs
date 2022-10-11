import { uncategorized, Category } from "./category.mjs";

class AddressBook {
  categories = {};
  contacts;
  name;
  id;

  constructor(name, contacts) {
    this.name = name;
    this.contacts = contacts;
  }

  static fromFakeData(addressBook) {
    let ab = new AddressBook(addressBook.name, addressBook.contacts);
    for (const contact of addressBook.contacts) {
      for (const category of contact.categories) {
        ab.addContactToCategory(contact, category);
      }
    }
    ab.buildUncategorized();
    return ab;
  }

  buildUncategorized() {
    // only call this method once
    let contacts = new Set();
    for (const cat in this.categories) {
      this.categories[cat].buildUncategorized().forEach(contacts.add, contacts);
    }
    const filtered = this.contacts.filter((x) => !contacts.has(x));
    if (filtered.length === 0) return;
    this.categories[uncategorized] = new Category(
      "Uncategorized",
      filtered,
      {},
      true
    );
  }

  addContactToCategory(contact, category) {
    let rootName = category[0];
    this.categories[rootName] ??= new Category(rootName);
    let cur = this.categories[rootName];
    cur.contacts.push(contact);
    category.slice(1).forEach((cat) => {
      cur.categories[cat] ??= new Category(cat);
      cur = cur.categories[cat];
      cur.contacts.push(contact);
    });
  }

  lookup(categoryKey, isUncategorized = false) {
    // look up a category using a key like `A / B`
    let category = categoryKey.split(" / ");
    if (isUncategorized) {
      // remove the last sub category
      category.pop();
    }
    let cur = this;
    for (const cat of category) {
      if (cur.categories[cat] == null) return null;
      cur = cur.categories[cat];
    }
    return isUncategorized ? cur.categories[uncategorized] : cur;
  }

  toTreeData() {
    let data = [];
    for (const cat in this.categories) {
      data.push(this.categories[cat].toTreeData());
    }
    return data;
  }
}

export { AddressBook };
