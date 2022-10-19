import { mapIterator } from "./utils.mjs";
// global object: ICAL from external ical.js

function parseCategory(str) {
  return str.split(" / ");
}

export function parseContact({ id, properties: { vCard, DisplayName } }) {
  const component = new ICAL.Component(ICAL.parse(vCard));
  return {
    id,
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
    if (!map.has(email)) map.set(email, name);
  });
  const emailList = [...mapIterator(map.entries(), toRFC5322EmailAddress)];
  // set compose details
  await browser.compose.setComposeDetails(tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}
