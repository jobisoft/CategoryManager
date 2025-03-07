import {
  Component,
  escapeHtmlContent,
  escapeHtmlAttr,
} from "../modules/ui/ui.mjs";
import { showDetailModal } from "./modal.mjs";

export function createContactList(data) {
  let component = new Component({
    element: "#contacts",
    data,
    template(data) {
      let html = [];
      if (data?.addressBook != null) {
        data.contacts.forEach((contact, id) => {
          const { name, email, addressBookId } = contact;
          html.push(
            `<li class="contact-row" 
                 draggable="true" 
                 data-id="${escapeHtmlAttr(id)}" 
                 data-addressbook="${escapeHtmlAttr(addressBookId)}">
              <p class="contact-row__name">
                ${
                  name != null
                    ? escapeHtmlContent(name)
                    : '<span class="no-name">Unnamed</span>'
                }
              </p>
              <p class="contact-row__email">
                ${
                  email != null
                    ? escapeHtmlContent(email)
                    : '<span class="no-email">No email available</span>'
                }
              </p>
            </li>`
          );
        });
      }
      return `<ul> ${html.join("\n")} </ul>`;
    },
  });
  component.element.addEventListener("dragstart", (e) => {
    if (!window.state.allowEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "category-manager/contact",
      e.target.dataset.addressbook + "\n" + e.target.dataset.id
    );
  });
  component.element.addEventListener("click", (e) => {
    let target = e.target;
    if (target.dataset.id == null)
      // Possibly click on children elements
      target = target.parentElement;
    if (target.dataset.id == null)
      // Not a click on a contact
      return;
    showDetailModal(target.dataset.id);
  });
  return component;
}
