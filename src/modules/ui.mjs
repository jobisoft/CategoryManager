export class Component {
  element;
  data;
  template;
  constructor({ element, data, template }) {
    this.element = document.querySelector(element);
    this.data = data;
    this.template = template;
  }
  render() {
    this.element.innerHTML = this.template(this.data);
  }
}

export function escapeHtml(unsafe) {
  // taken from https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
