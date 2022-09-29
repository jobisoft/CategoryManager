class Category {
  categories;
  name;
  contacts;
  constructor(name, contacts = [], subCategories = {}) {
    this.name = name;
    this.categories = subCategories;
    this.contacts = contacts;
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
    };
  }
}

class CategoryCollection {
  categories = {};
  addressBookName;

  constructor(addressBookName) {
    this.addressBookName = addressBookName;
  }

  static fromFakeData(addressBook) {
    let col = new CategoryCollection(addressBook.name);
    for (const contact of addressBook.contacts) {
      const contactData = {
        name: contact.name,
        email: contact.email,
      };
      for (const category of contact.categories) {
        col.addContactToCategory(contactData, category);
      }
    }
    return col;
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
    // look up a category using a key like `A/B`
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

export { Category, CategoryCollection };
