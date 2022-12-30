import {
  Category,
  isLeafCategory,
  buildUncategorizedCategory,
} from "./category.mjs";
import { parseContact } from "./contact.mjs";
import { filterObjectByKeyToNull, isEmptyObject } from "./utils.mjs";

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
    this.uncategorized = new Category("Uncategorized", filtered, {}, true);
  }

  #addContactToCategoryWhenBuildingTree(contact, category) {
    let rootName = category[0];
    this.categories[rootName] ??= new Category(rootName);
    let cur = this.categories[rootName];
    cur.contacts[contact.id] = null;
    category.slice(1).forEach((cat) => {
      cur.categories[cat] ??= new Category(cat);
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
  let category = categoryKey.split(" / ");
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

function deleteContactRecursively(
  categoryObj,
  remainingCategoryPath,
  contactId
) {
  // Cases for cleaning up empty categories:
  // 1. A leaf category
  //   I.  Becomes empty(no contacts, which implies no sub categories).
  //     Remove it, then recurse:
  //     a. its parent becomes a leaf (We need to update uncategorized category)
  //     b. its parent does not become a leaf.
  //   II. Is still non-empty. Nothing needs to be done.
  // 2. Not a leaf category. It won't become an empty node. Nothing needs to be done
  if (remainingCategoryPath.length === 0) {
    // Recursion base case
    // If the category is a leaf, do nothing
    // Otherwise, delete the contact in uncategorized category
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
  } else {
    delete categoryObj.categories[remainingCategoryPath[0]].contacts[contactId];
    const nextCategoryName = remainingCategoryPath.shift();
    const shouldDelete = deleteContactRecursively(
      categoryObj.categories[nextCategoryName],
      remainingCategoryPath,
      contactId
    );
    if (shouldDelete) {
      delete categoryObj.categories[nextCategoryName];
      // Do we need to update uncategorized category?
      if (isLeafCategory(categoryObj)) {
        // This category becomes a leaf.
        // Uncategorized category is no longer needed
        categoryObj.uncategorized = undefined;
      }
    }
  }
  // returns: if this category should be deleted
  // Note that empty contacts imply a leaf node.
  return isEmptyObject(categoryObj.contacts);
}

export function deleteContact(addressBook, contactId) {
  const contact = addressBook.contacts[contactId];
  delete addressBook.contacts[contactId];
  for (const cat of contact.categories) {
    console.log("Delete", contact.name, "from", cat);
    deleteContactRecursively(addressBook, cat, contactId);
  }
}

export function updateContact(addressBook, contactNode, changedProperties) {
  // We only care about email, name and categories
  // if (changedProperties.DisplayName != null) {
  //   addressBook.contacts[contactNode.id].name = changedProperties.DisplayName.newValue;
  // }

  // changedProperties only tells us whether Primary/SecondaryEmail changes.
  // it won't tell us if categories or other email address got updated.
  // Let's just parse the vCard again so that nothing is left behind!
  const id = contactNode.id;
  const newContact = parseContact(contactNode);
  const oldContact = addressBook.contacts[id];
  if (newContact.categories !== oldContact.categories) {
    // Categories changed.
    console.log("changed contact:", newContact, changedProperties);
    console.log("Old categories: ", oldContact.categories);
    console.log("New categories: ", newContact.categories);
    // TODO: update the category tree.
    const newCategories = new Set(newContact.categories);
    const oldCategories = new Set(oldContact.categories);
    const addition = new Set(
      [...newCategories].filter((x) => !oldCategories.has(x))
    );
    const deletion = new Set(
      [...oldCategories].filter((x) => !newCategories.has(x))
    );
    console.log("Addition", [...addition]);
    console.log("Deletion", [...deletion]);
  }
  addressBook.contacts[id] = newContact;
}

export function createContact(addressBook, contactNode) {
  const id = contactNode.id;
  const contact = parseContact(contactNode);
  addressBook.contacts[id] = contact;
  if (contact.categories.length == 0) {
    // No category info. Just add it to uncategorized and return.
    addressBook.uncategorized[id] = null;
    return;
  }
  for (const category of contact.categories) {
    addContactToCategory(addressBook, contact, category);
  }
}

function removeContactFromCategoryRecursively(
  categoryObj,
  remainingCategoryPath,
  contactId,
  firstLevelDeletionEnabled = true
) {
  // See the docs of `removeContactFromCategory`
  let shouldDelete = true;
  if (remainingCategoryPath.length === 0) {
    // Recursion base case
    delete categoryObj.contacts[contactId];
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
  } else {
    const nextCategoryName = remainingCategoryPath.shift();
    for (const catName in categoryObj.categories) {
      if (catName == nextCategoryName) continue;
      if (contactId in categoryObj.categories[contactId]) {
        shouldDelete = false;
        break;
      }
    }
    console.log(
      "Should I remove contact for",
      categoryObj.name,
      ":",
      shouldDelete
    );
    if (firstLevelDeletionEnabled && shouldDelete)
      delete categoryObj.contacts[contactId];
    const shouldDeleteCategory = removeContactFromCategoryRecursively(
      categoryObj.categories[nextCategoryName],
      remainingCategoryPath,
      contactId
    );
    if (shouldDeleteCategory) {
      delete categoryObj.categories[nextCategoryName];
      // Do we need to update uncategorized category?
      if (isLeafCategory(categoryObj)) {
        // This category becomes a leaf.
        // Uncategorized category is no longer needed
        categoryObj.uncategorized = undefined;
      }
    }
  }
  // returns: if this category should be deleted
  // Note that empty contacts imply a leaf node.
  return isEmptyObject(categoryObj.contacts);
}

export function removeContactFromCategory(addressBook, contactId, category) {
  // Note that this function is different from `deleteContactRecursively`.
  // Consider this case:
  //     Contact AAA belongs to a/b/c and a/b/d. Now we delete a/b/d.
  // `deleteContactRecursively` would remove this contact from a, b and d.
  // But `removeContactFromCategory` should only remove this contact from d.
  //
  // Implementation Note:
  // If there are no other subcategories containing this contact, we can remove it from this category.
  removeContactFromCategoryRecursively(addressBook, category, contactId, false);
}

export function addContactToCategory(addressBook, contact, category) {
  // Several cases.
  // 1. If there are no new categories, it's easy.
  // 2. If there are some new categories:
  //    a. one old leaf node is no longer a leaf
  //     | we need to deal with uncategorized category
  //    b. the entire category path doesn't contain any old categories
  //     | this is a new path which only contains one contact, we don't need to deal with uncategorized category
  // state: a string that represents current state
  //        1, 2a, 2b, done(which means we already found the old leaf node)
  const rootName = category[0];
  // Assume there are no new categories first.
  let state = "1";
  if (addressBook.categories[rootName] == null) {
    // Case 2.b
    addressBook.categories[rootName] = new Category(rootName);
    state = "2b";
  }

  let cur = addressBook.categories[rootName];
  cur.contacts[contact.id] = null;
  let oldLeaf;
  category.slice(1).forEach((cat, idx, arr) => {
    if (cur.categories[cat] == null && state == "1") {
      // Case 2.a
      // this leaf node is no longer a leaf after this update
      state = "2a";
    }
    cur.categories[cat] ??= new Category(cat);
    cur.categories[cat].contacts[contact.id] = null;
    if (state === "2a") {
      oldLeaf = cur;
      state = "done";
    }
    cur = cur.categories[cat];
    if (idx === arr.length - 1 && !isLeafCategory(cur)) {
      // If the last category is not a leaf, add this contact to uncategorized
      cur.uncategorized[contact.id] = null;
    }
  });
  if (state === "done") {
    // Actually we do not need to recurse here.
    // TODO: optimize this.
    buildUncategorizedCategory(oldLeaf);
  }
}
