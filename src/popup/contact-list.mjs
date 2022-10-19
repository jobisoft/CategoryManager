import { Component, escapeHtml } from "../modules/ui.mjs";

export function createContactList(data = null) {
  return new Component({
    element: "#contacts",
    data,
    template(data) {
      return `<ul>
            ${data
              .map(
                ({ name, email }) =>
                  `<li class="contact-row">
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
                  </li>`
              )
              .join("\n")}
            </ul>`;
    },
  });
}
