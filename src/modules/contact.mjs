import { reduceCategories } from "./address-book/index.mjs";
import { setEqual } from "./set.mjs";
// global object: ICAL from external ical.js

const ERR_OPERATION_CANCEL = await browser.i18n.getMessage(
  "errors.operation-cancel"
);
const ERR_CONTACT_UPDATE_FAILURE = await browser.i18n.getMessage(
  "errors.contact-update-failure"
);
const ERR_OPCANCEL_UPDATE_FAILURE =
  ERR_OPERATION_CANCEL + " " + ERR_CONTACT_UPDATE_FAILURE;
const ERR_HINT_MOST_LIKELY = await browser.i18n.getMessage(
  "errors.hint.most-likely"
);
const ERR_HINT_COMMON_REASONS = await browser.i18n.getMessage(
  "errors.hint.common-reasons"
);
const ERR_REASON_ADDRESS_BOOK_READONLY = await browser.i18n.getMessage(
  "errors.reason.address-book-readonly"
);
const ERR_REASON_CONTACT_CHANGED = await browser.i18n.getMessage(
  "errors.reason.contact-changed"
);

export function getError(str, id) {
  const error = new Error(`${str}
  ${ERR_HINT_COMMON_REASONS}
  1. ${id === 1 ? ERR_HINT_MOST_LIKELY : ""}${ERR_REASON_ADDRESS_BOOK_READONLY}
  2. ${id === 2 ? ERR_HINT_MOST_LIKELY : ""}${ERR_REASON_CONTACT_CHANGED}`);
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
    throw getError(ERR_OPCANCEL_UPDATE_FAILURE, 2);
  }
  const newCategories = reduceCategories(
    [...oldCategories, ...addition].filter((x) => !deletion.includes(x))
  );
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
    throw getError(ERR_OPCANCEL_UPDATE_FAILURE, 1);
  }
  return null;
}

export function parseContact({
  id,
  parentId,
  properties: { vCard, DisplayName },
}) {
  const component = new ICAL.Component(ICAL.parse(vCard));
  const categories = component
    .getAllProperties("categories")
    .flatMap((x) => x.getValues());
  return {
    id,
    addressBookId: parentId,
    email: component.getFirstPropertyValue("email"),
    name: DisplayName,
    categories: new Set(categories),
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
