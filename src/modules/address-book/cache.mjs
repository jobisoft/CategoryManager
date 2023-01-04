import { createContactInCache } from "./create-contact.mjs";
import { updateContactInCache } from "./update-contact.mjs";
import { deleteContactInCache } from "./delete-contact.mjs";

export async function updateCacheOnContactCreation(addressBooks, node) {
  let addressBookId = node.parentId;
  await createContactInCache(addressBooks.get(addressBookId), node);
  await createContactInCache(addressBooks.get("all-contacts"), node);
}

export async function updateCacheOnContactUpdate(
  addressBooks,
  node,
  changedProperties
) {
  await updateContactInCache(
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
  await deleteContactInCache(addressBooks.get(addressBookId), contactId);
  await deleteContactInCache(addressBooks.get("all-contacts"), contactId);
}

export function registerCacheUpdateCallback(addressBooks, callback) {
  browser.contacts.onCreated.addListener(async (node) => {
    await updateCacheOnContactCreation(addressBooks, node);
    await callback(addressBooks);
  });
  browser.contacts.onUpdated.addListener(async (node, changedProperties) => {
    await updateCacheOnContactUpdate(addressBooks, node, changedProperties);
    await callback(addressBooks);
  });
  browser.contacts.onDeleted.addListener(async (addressBookId, contactId) => {
    await updateCacheOnContactDeletion(addressBooks, addressBookId, contactId);
    await callback(addressBooks);
  });
}
