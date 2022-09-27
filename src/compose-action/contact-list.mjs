import { Component } from "../modules/ui.mjs";

export function createContactList(data = null) {
  return new Component({
    element: "#contacts",
    data,
    template(data) {
      return `<ul>
            ${data.map(({ name, email }) => `<li><b>${name}</b> ${email}</li>`).join('\n')}
            </ul>`;
    },
  });
}
