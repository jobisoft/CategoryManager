import { render } from "./reef.mjs";

export class Component {
  element; // The DOM element
  elem; // Element selector, for Reef
  data;
  template;
  debounce = null;
  constructor({ element, data, template, ...rest }) {
    this.elem = element;
    this.element = document.querySelector(element);
    this.data = data;
    this.template = template;
    for (const key in rest) {
      let value = rest[key];
      if (typeof value === "function") {
        value = value.bind(this);
      }
      this[key] = value;
    }
  }
  render() {
    const templated = this.template(this.data);
    // Cache instance
    let self = this;
    // If there's a pending render, cancel it
    if (self.debounce) {
      window.cancelAnimationFrame(self.debounce);
    }
    // Setup the new render to run at the next animation frame
    self.debounce = window.requestAnimationFrame(function () {
      render(self.elem, templated, false);
    });
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
