import {
  categoryStringToArr,
  reduceCategories,
} from "./address-book/index.mjs";
import { setEqual } from "./set.mjs";
// global object: ICAL from external ical.js

const ERR_OPERATION_CANCEL = "Operation Canceled. Failed to update contact!";

export function getError(str, id) {
  const error = new Error(`${str}
  Common reasons for this error are:
  1. ${id === 1 ? "(Most Likely)" : ""}The address book is readonly.
  2. ${
    id === 2 ? "(Most Likely)" : ""
  }The contact has been changed outside Category Manager.`);
  error.id = id;
  return error;
}
export async function updateCategoriesForContact(contact, addition, deletion) {
  const {
    properties: { vCard },
  } = await browser.contacts.get(contact.id);
  const component = new ICAL.Component(ICAL.parse(vCard));
  const oldCategories = new Set(
    component.getAllProperties("categories").flatMap((x) => x.getValues())
  );
  const oldCategoriesFromInput = contact.categories;
  if (!setEqual(oldCategories, oldCategoriesFromInput)) {
    console.error("Categories have been changed outside category manager!");
    console.log("Old Categories", JSON.stringify(oldCategories));
    console.log(
      "Old Categories From Input",
      JSON.stringify(oldCategoriesFromInput)
    );
    throw getError(ERR_OPERATION_CANCEL, 2);
  }
  const newCategories = reduceCategories([
    ...oldCategories,
    ...addition,
  ]).filter((x) => !deletion.includes(x));
  if (
    newCategories.length === oldCategories.size &&
    newCategories.every((x) => oldCategories.has(x))
  ) {
    // No change, return
    console.warn("No change made to the vCard!");
    return;
  }
  component.removeAllProperties("categories");
  for (const cat of newCategories) {
    component.addPropertyWithValue("categories", cat);
  }
  const newVCard = component.toString();
  console.log("new vCard:", newVCard);
  try {
    await browser.contacts.update(contact.id, { vCard: newVCard });
  } catch (e) {
    console.error("Error when updating contact: ", e);
    throw getError(ERR_OPERATION_CANCEL, 1);
  }
  return null;
}

const identity = (x) => x;

export function parseContact(
  { id, parentId, properties: { vCard, DisplayName } },
  categoryFormat = "array"
) {
  const component = new ICAL.Component(ICAL.parse(vCard));
  const categories = component
    .getAllProperties("categories")
    .flatMap((x) =>
      x
        .getValues()
        .map(categoryFormat === "array" ? categoryStringToArr : identity)
    );
  return {
    id,
    addressBookId: parentId,
    email: component.getFirstPropertyValue("email"),
    name: DisplayName,
    categories: categoryFormat === "set" ? new Set(categories) : categories,
  };
}

export function toRFC5322EmailAddress(value) {
  // Accepts: [email, name] or { email, name }
  let email, name;
  if (Array.isArray(value)) {
    [email, name] = value;
  } else {
    ({ email, name } = value);
  }
  return name ? `${name} <${email}>` : email;
}
