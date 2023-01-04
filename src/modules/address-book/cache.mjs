import { createContact } from "./create-contact.mjs";
import { updateContact } from "./update-contact.mjs";
import { deleteContact } from "./delete-contact.mjs";

export async function updateCacheOnContactCreation(addressBooks, node) {
  let addressBookId = node.parentId;
  await createContact(addressBooks.get(addressBookId), node);
  await createContact(addressBooks.get("all-contacts"), node);
}

export async function updateCacheOnContactUpdate(
  addressBooks,
  node,
  changedProperties
) {
  await updateContact(
    addressBooks.get(node.parentId),
    addressBooks.get("all-contacts"),
    node,
    changedProperties
  );
}

export async function updateCacheOnContactDeletion(
  addressBooks,
  addressBookId,
  contactId
) {
  await deleteContact(addressBooks.get(addressBookId), contactId);
  await deleteContact(addressBooks.get("all-contacts"), contactId);
}

export function registerCacheUpdateCallback(addressBooks, callback) {
  browser.contacts.onCreated.addListener(async (node) => {
    await updateCacheOnContactCreation(addressBooks, node);
    await callback();
  });
  browser.contacts.onUpdated.addListener(async (node, changedProperties) => {
    await updateCacheOnContactUpdate(addressBooks, node, changedProperties);
    await callback();
  });
  browser.contacts.onDeleted.addListener(async (addressBookId, contactId) => {
    await updateCacheOnContactDeletion(addressBooks, addressBookId, contactId);
    await callback();
  });
}
