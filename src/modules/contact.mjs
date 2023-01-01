import { mapIterator } from "./utils.mjs";
import { categoryArrToString } from "./address-book/index.mjs";
// global object: ICAL from external ical.js

function parseCategory(str) {
  return str.split(" / ");
}

export async function updateCategoriesForContact(contact, addition, deletion) {
  const {
    properties: { vCard },
  } = await browser.contacts.get(contact.id);
  const component = new ICAL.Component(ICAL.parse(vCard));
  const oldCategories = component
    .getAllProperties("categories")
    .flatMap((x) => x.getValues())
    .sort();
  const oldCategoriesFromInput = contact.categories.map(categoryArrToString);
  if (
    oldCategories.length !== oldCategoriesFromInput.length ||
    oldCategories.some((x) => !oldCategoriesFromInput.includes(x))
  ) {
    console.error("Categories have been changed outside category manager!");
    return false;
  }
  const newCategories = new Set(
    [...oldCategories, ...addition].filter((x) => !deletion.includes(x))
  );
  component.removeAllProperties("categories");
  for (const cat of newCategories) {
    component.addPropertyWithValue("categories", cat);
  }
  const newVCard = component.toString();
  console.log("new vCard:", newVCard);
  await browser.contacts.update(contact.id, { vCard: newVCard });
  return true;
}

export function parseContact({
  id,
  parentId,
  properties: { vCard, DisplayName },
}) {
  const component = new ICAL.Component(ICAL.parse(vCard));
  return {
    id,
    addressBookId: parentId,
    email: component.getFirstPropertyValue("email"),
    name: DisplayName,
    categories: component
      .getAllProperties("categories")
      .flatMap((x) => x.getValues().map(parseCategory)),
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

export async function addContactsToComposeDetails(fieldName, tab, contacts) {
  const details = await browser.compose.getComposeDetails(tab.id);
  const addresses = details[fieldName];
  let map = new Map();
  addresses.forEach((addr) => {
    const { address, name } = emailAddresses.parseOneAddress(addr);
    map.set(address, name);
  });
  contacts.forEach(({ email, name }) => {
    // Add this contact if it doesn't exist in the map
    if (email != null && !map.has(email)) map.set(email, name);
  });
  const emailList = [...mapIterator(map.entries(), toRFC5322EmailAddress)];
  // set compose details
  await browser.compose.setComposeDetails(tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}
