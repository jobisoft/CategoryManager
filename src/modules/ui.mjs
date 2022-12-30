export class Component {
  element;
  data;
  template;
  constructor({ element, data, template, ...rest }) {
    this.element = document.querySelector(element);
    this.data = data;
    this.template = template;
    for (const key in rest) {
      let value = rest[key];
      console.log(value, typeof value);
      if (typeof value === "function") {
        value = value.bind(this);
      }
      this[key] = value;
    }
  }
  render() {
    this.element.innerHTML = this.template(this.data);
  }
  update(data) {
    this.data = data;
    this.render();
  }
}

export function escapeHtmlAttr(unsafe) {
  // taken from https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeHtmlContent(input) {
  return escapeHtmlAttr(input).replaceAll(" ", "&nbsp;");
}
