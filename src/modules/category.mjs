class Category {
  subCategories;
  name;
  contacts;
  constructor(name, contacts = [], subCategories = {}) {
    this.name = name;
    this.subCategories = subCategories;
    this.contacts = contacts;
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
      cur.subCategories[cat] ??= new Category(cat);
      cur = cur.subCategories[cat];
      cur.contacts.push(contact);
    });
  }
}

export { Category, CategoryCollection };
