import {
  Category,
  isLeafCategory,
  buildUncategorizedCategory,
  categoryArrToString,
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

function deleteContactHelper(categoryObj, remainingCategoryPath, contactId) {
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
    const shouldDelete = deleteContactHelper(
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
    deleteContactHelper(addressBook, cat, contactId);
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
  // TODO: we could do some optimization here:
  const newCategories = new Set(newContact.categories.map(categoryArrToString));
  const oldCategories = new Set(oldContact.categories.map(categoryArrToString));
  console.log("Old categories: ", JSON.stringify([...newCategories]));
  console.log("New categories: ", JSON.stringify([...oldCategories]));
  if (
    newCategories.size != oldCategories.size ||
    [...newCategories].some((value) => !oldCategories.has(value))
  ) {
    // Categories changed.
    console.log("changed contact:", newContact, changedProperties);
    const addition = [...newCategories].flatMap((x) =>
      !oldCategories.has(x) ? [x.split(" / ")] : []
    );
    const deletion = [...oldCategories].flatMap((x) =>
      !newCategories.has(x) ? [x.split(" / ")] : []
    );
    console.log("Addition", addition);
    addition.forEach((cat) => addContactToCategory(addressBook, id, cat));
    console.log("Deletion", deletion);
    deletion.forEach((cat) => removeContactFromCategory(addressBook, id, cat));
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
    addContactToCategory(addressBook, id, category);
  }
}

function removeContactFromCategoryHelper(
  categoryObj,
  remainingCategoryPath,
  contactId,
  firstLevelDeletionEnabled = true
) {
  // See the docs of `removeContactFromCategory`
  let shouldDelete = true;
  if (remainingCategoryPath.length === 0) {
    // Recursion base case
    console.log("Delete", contactId, "from", categoryObj);
    delete categoryObj.contacts[contactId];
    if (!isLeafCategory(categoryObj)) {
      delete categoryObj.uncategorized.contacts[contactId];
    }
  } else {
    const nextCategoryName = remainingCategoryPath[0];
    for (const catName in categoryObj.categories) {
      if (catName == nextCategoryName) continue;
      if (contactId in categoryObj.categories[catName].contacts) {
        shouldDelete = false;
        break;
      }
    }
    console.log(
      "Should I remove",
      contactId,
      "from",
      categoryObj,
      ":",
      firstLevelDeletionEnabled && shouldDelete
    );
    if (firstLevelDeletionEnabled && shouldDelete)
      delete categoryObj.contacts[contactId];
    const shouldDeleteCategory = removeContactFromCategoryHelper(
      categoryObj.categories[nextCategoryName],
      remainingCategoryPath.slice(1),
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

export function removeContactFromCategory(
  addressBook,
  contactId,
  category,
  writeToThunderbird = false,
  updateContact = false
) {
  console.info(
    "removeContactFromCategory",
    addressBook,
    contactId,
    category,
    writeToThunderbird,
    updateContact
  );
  // update contact data
  const contact = addressBook.contacts[contactId];
  if (updateContact) {
    // remove category from contact.
    // convert it to string for easy comparison
    const categoryStr = categoryArrToString(category);
    let found = false;
    for (let i = 0; i < contact.categories.length; i++) {
      if (categoryArrToString(contact.categories[i]) === categoryStr) {
        contact.categories.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      console.error("Category not found in contact", category, contact);
    }
  }
  // Note that this function is different from `deleteContactRecursively`.
  // Consider this case:
  //     Contact AAA belongs to a/b/c and a/b/d. Now we delete a/b/d.
  // `deleteContactRecursively` would remove this contact from a, b and d.
  // But `removeContactFromCategory` should only remove this contact from d.
  //
  // Implementation Note:
  // If there are no other subcategories containing this contact, we can remove it from this category.
  removeContactFromCategoryHelper(addressBook, category, contactId, false);
}

export function addContactToCategory(
  addressBook,
  contactId,
  category,
  writeToThunderbird = false,
  updateContact = false
) {
  // update contact data
  const contact = addressBook.contacts[contactId];
  if (updateContact) {
    // check if the category is already in the contact
    const categoryStr = categoryArrToString(category);
    for (const cat of contact.categories) {
      if (categoryArrToString(cat) === categoryStr) {
        // already in the contact.
        return;
      }
      contact.categories.push(category);
    }
  }

  // Several cases.
  // 1. If there are no new categories, it's easy.
  // 2. If there are some new categories:
  //    a. one old leaf node is no longer a leaf
  //     | we need to deal with uncategorized category
  //    b. the entire category path doesn't contain any old categories
  //     | this is a new path which only contains one contact, we don't need to deal with uncategorized category
  // state: a string that represents current state
  //        1, 2a, 2b, done(which means we already found the old leaf node)
  console.info("Adding", addressBook.contacts[contactId], "to", category);
  const rootName = category[0];
  // Assume there are no new categories first.
  let state = "1";
  if (addressBook.categories[rootName] == null) {
    // Case 2.b
    addressBook.categories[rootName] = new Category(rootName);
    state = "2b";
  }
  // Handle Corner case:
  //   add to uncategorized when category.length == 1, which skips the forEach loop
  const root = addressBook.categories[rootName];
  if (category.length === 1 && !isLeafCategory(root)) {
    console.log("The end node is not a leaf, adding to uncategorized!");
    root.uncategorized.contacts[contactId] = null;
  }
  let cur = addressBook.categories[rootName];
  cur.contacts[contactId] = null;
  let oldLeaf;
  category.slice(1).forEach((cat, idx, arr) => {
    if (cur.categories[cat] == null && state == "1") {
      // Case 2.a
      // this leaf node is no longer a leaf after this update
      state = "2a";
    }
    cur.categories[cat] ??= new Category(cat);
    cur.categories[cat].contacts[contactId] = null;
    if (state === "2a") {
      oldLeaf = cur;
      state = "done";
    }
    cur = cur.categories[cat];
    if (idx === arr.length - 1 && !isLeafCategory(cur)) {
      // If the last category is not a leaf, add this contact to uncategorized
      console.log("The end node is not a leaf, adding to uncategorized!");
      cur.uncategorized.contacts[contactId] = null;
    }
  });
  if (state === "done") {
    // Actually we do not need to recurse here.
    // TODO: optimize this.
    buildUncategorizedCategory(oldLeaf);
  }
}
