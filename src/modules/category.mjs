class Category {
  subCategory;
  name;
  contacts;
  constructor(name, contacts = [], subCategory = null) {
    this.name = name;
    this.subCategory = subCategory;
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
    for (let contact of addressBook.contacts) {
      for (let category of contact.categories) {
        col.addContactToCategory(
          {
            name: contact.name,
            email: contact.email,
          },
          category
        );
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
      cur.subCategory ??= new Category(cat);
      cur = cur.subCategory;
      cur.contacts.push(contact);
    });
  }
}

export { Category, CategoryCollection };
