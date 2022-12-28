import { Component, escapeHtml } from "../modules/ui.mjs";

export function createContactList(data) {
  return new Component({
    element: "#contacts",
    data,
    template(data) {
      return `<ul>
            ${
              data?.addressBook != null
                ? Object.keys(data.contacts)
                    .map((id) => {
                      const { name, email } = data.addressBook.contacts[id];
                      return `<li class="contact-row">
                      <p class="contact-row__name">
                        ${escapeHtml(name)}
                      </p>
                      <p class="contact-row__email">
                        ${
                          email != null
                            ? escapeHtml(email)
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
}
