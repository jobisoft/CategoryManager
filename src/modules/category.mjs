import { isEmptyObject } from "./utils.mjs";

class Category {
  categories;
  name;
  contacts;
  isUncategorized;
  constructor(
    name,
    contacts = [],
    subCategories = {},
    isUncategorized = false
  ) {
    this.name = name;
    this.categories = subCategories;
    this.contacts = contacts;
    this.isUncategorized = isUncategorized;
  }
  toTreeData(prefix = "") {
    let children = [];
    let id = prefix + this.name;
    for (const cat in this.categories) {
      children.push(this.categories[cat].toTreeData(id + " / "));
    }
    return {
      id,
      text: this.name,
      children,
      attributes: this.isUncategorized ? { class: "is-uncategrized" } : {},
    };
  }
  buildUncategorized() {
    // only call this method once
    if (isEmptyObject(this.categories)) {
      // recursion base case
      return this.contacts;
    }
    let contacts = new Set();
    for (let cat in this.categories) {
      this.categories[cat]
        .buildUncategorized() // 1. build uncategorized for sub category
        .forEach(contacts.add, contacts); // 2. add contacts from subcategory to `contacts`
    }
    this.categories["Uncategorized"] = new Category(
      "Uncategorized",
      this.contacts.filter((x) => !contacts.has(x)),
      {},
      true
    );
    return this.contacts;
  }
}

class AddressBook {
  categories = {};
  contacts;
  name;

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
    this.categories["Uncategorized"] = new Category(
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

  lookup(categoryKey) {
    // look up a category using a key like `A / B`
    const category = categoryKey.split(" / ");
    let cur = this;
    for (const cat of category) {
      if (cur.categories[cat] == null) return null;
      cur = cur.categories[cat];
    }
    return cur;
  }

  toTreeData() {
    let data = [];
    for (const cat in this.categories) {
      data.push(this.categories[cat].toTreeData());
    }
    return data;
  }
}

export { Category, AddressBook };
