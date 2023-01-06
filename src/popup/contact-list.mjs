import {
  Component,
  escapeHtmlContent,
  escapeHtmlAttr,
} from "../modules/ui.mjs";

export function createContactList(data) {
  let component = new Component({
    element: "#contacts",
    data,
    template(data) {
      return `<ul>
            ${
              data?.addressBook != null
                ? data.contacts
                    .map((id) => {
                      const { name, email, addressBookId } =
                        data.addressBook.contacts[id];
                      return `<li class="contact-row" draggable="true" data-id="${escapeHtmlAttr(
                        id
                      )}" data-addressbook="${escapeHtmlAttr(addressBookId)}">
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
                  </li>`;
                    })
                    .join("\n")
                : ""
            }
            </ul>`;
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
  return component;
}
