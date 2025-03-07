// ----------
//   Modal
// ----------

import {
  SUBCATEGORY_SEPARATOR,
  validateCategoryString,
} from "../modules/cache/index.mjs";
import { printToConsole } from "../modules/utils.mjs";
import { escapeHtmlContent, escapeHtmlAttr } from "../modules/ui/ui.mjs";

const categoryInput = document.getElementById("category-input");
const categoryInputError = document.getElementById("category-input-error");
const categoryInputConfirmBtn = document.getElementById(
  "category-input-confirm"
);
const categoryInputCancelBtn = document.getElementById("category-input-cancel");

// I18N

categoryInputConfirmBtn.innerText = await browser.i18n.getMessage(
  "popup.input.button.ok"
);
categoryInputCancelBtn.innerText = await browser.i18n.getMessage(
  "popup.input.button.cancel"
);
document.getElementById("modal-category-input-title").innerText =
  await browser.i18n.getMessage("popup.input.title");
document.getElementById("modal-category-input-content").children[0].innerHTML =
  await browser.i18n.getMessage("popup.input.contentHTML");

export async function showCategoryInputModalAsync(initialValue) {
  return new Promise((resolve) => {
    categoryInput.value = initialValue;
    MicroModal.show("modal-category-input");
    function onConfirmClick() {
      if (validateCategoryUserInput()) {
        MicroModal.close("modal-category-input");
        cleanUp();
        resolve(categoryInput.value);
      }
    }
    function onCancelClick() {
      MicroModal.close("modal-category-input");
      cleanUp();
      resolve(null);
    }
    function onKeyPress(ev) {
      if (ev.key === "Enter" && validateCategoryUserInput()) {
        MicroModal.close("modal-category-input");
        cleanUp();
        resolve(categoryInput.value);
      }
    }
    function cleanUp() {
      categoryInputConfirmBtn.removeEventListener("click", onConfirmClick);
      categoryInputCancelBtn.removeEventListener("click", onCancelClick);
      categoryInput.removeEventListener("keypress", onKeyPress);
    }
    categoryInputConfirmBtn.addEventListener("click", onConfirmClick);
    categoryInputCancelBtn.addEventListener("click", onCancelClick);
    categoryInput.addEventListener("keypress", onKeyPress);
  });
}

export async function getCategoryStringFromInput(parentCategory = null) {
  const result = await showCategoryInputModalAsync(
    parentCategory ? parentCategory + SUBCATEGORY_SEPARATOR : null
  );
  printToConsole.log(categoryInput);
  printToConsole.log(result);
  return result;
}

function validateCategoryUserInput() {
  const validationResult = validateCategoryString(categoryInput.value);
  if (validationResult == "LGTM") {
    categoryInputError.style.visibility = "hidden";
    categoryInput.setCustomValidity("");
    return true;
  }
  categoryInputError.style.visibility = "visible";
  categoryInputError.innerText = validationResult;
  categoryInput.setCustomValidity(validationResult);
  return false;
}

export function initModal() {
  categoryInput.addEventListener("input", validateCategoryUserInput);
  document
    .getElementsByClassName("modal__overlay")[0]
    .addEventListener("mousedown", (e) => e.stopPropagation());
  MicroModal.init();
}

const errorContent = document.getElementById("error-content");
document.querySelector("#modal-error-title > span").innerText =
  await browser.i18n.getMessage("popup.error.title");
document.getElementById("modal-error-content-footer").innerText =
  await browser.i18n.getMessage("popup.error.content.footer");
document.querySelector("#modal-error .modal__footer button").innerText =
  await browser.i18n.getMessage("popup.input.button.ok");

export function showErrorModal(errorMessage) {
  errorContent.innerText = errorMessage;
  MicroModal.show("modal-error");
}

const contactNameElement = document.querySelector(
  "#modal-details .details__name"
);
const contactPhotoElement = document.querySelector(
  "#modal-details .details__photo"
);
const contactEmailElement = document.querySelector(
  "#modal-details .details__email"
);

const LABEL_NICKNAME = await browser.i18n.getMessage("popup.detail.nickname");
const LABEL_TIMEZONE = await browser.i18n.getMessage("popup.detail.timezone");
const LABEL_EMAILS = await browser.i18n.getMessage("popup.detail.emails");
const LABEL_WEBSITES = await browser.i18n.getMessage("popup.detail.websites");
const LABEL_ADDRESSES = await browser.i18n.getMessage("popup.detail.addresses");
const LABEL_PHONE_NUMBERS = await browser.i18n.getMessage(
  "popup.detail.phone-numbers"
);
const LABEL_NOTES = await browser.i18n.getMessage("popup.detail.notes");

export async function showDetailModal(contactId) {
  const {
    properties: { vCard, PrimaryEmail, DisplayName = "", Nickname, Notes },
  } = await browser.contacts.get(contactId);
  const component = new ICAL.Component(ICAL.parse(vCard));
  const allEmails = component
    .getAllProperties("email")
    .flatMap((x) => x.getValues());
  const photo = component.getFirstPropertyValue("photo");
  const tz = component.getFirstPropertyValue("tz");
  const urls = component.getAllProperties("url").flatMap((x) => x.getValues());
  const addresses = component
    .getAllProperties("adr")
    .flatMap((x) => x.getValues());
  const tel = component.getAllProperties("tel").flatMap((x) => x.getValues());
  if (photo) {
    contactPhotoElement.style.backgroundImage = `url(${photo})`;
    contactPhotoElement.innerText = null;
  } else {
    contactPhotoElement.innerText = DisplayName.trim()[0] ?? "";
    contactPhotoElement.style.backgroundImage = null;
  }
  contactNameElement.innerText = DisplayName ?? "";
  contactEmailElement.innerText = PrimaryEmail ?? "";
  let html = "";
  Nickname && (html += `<div>${LABEL_NICKNAME}</div><p>${Nickname}</p>`);
  tz && (html += `<div>${LABEL_TIMEZONE}</div><p>${tz}</p>`);
  allEmails.length > 0 &&
    (html += `<div>${LABEL_EMAILS}</div><p>${allEmails.reduce((acc, cur) => {
      return (
        acc +
        `<a href="mailto:${escapeHtmlAttr(cur)}">${escapeHtmlContent(
          cur
        )}</a><br>`
      );
    }, "")}</p>`);
  urls.length > 0 &&
    (html += `<div>${LABEL_WEBSITES}</div><p>${urls.reduce(
      (acc, cur) =>
        acc +
        `<a href="${escapeHtmlAttr(cur)}">${escapeHtmlContent(cur)}</a><br>`,
      ""
    )}</p>`);
  addresses.length > 0 &&
    (html += `<div>${LABEL_ADDRESSES}</div><div>${addresses
      .map((address) =>
        address.reduce(
          (acc, cur) => (cur ? acc + `${escapeHtmlContent(cur)}<br>` : acc),
          ""
        )
      )
      .join("<hr>")}</div>`);
  tel.length > 0 &&
    (html += `<div>${LABEL_PHONE_NUMBERS}</div><p>${tel.reduce(
      (acc, cur) =>
        acc +
        `<a href="tel:${escapeHtmlAttr(cur)}">${escapeHtmlContent(
          cur
        )}</a><br>`,
      ""
    )}</p>`);
  Notes &&
    (html += `<div>${LABEL_NOTES}</div><p>${escapeHtmlContent(Notes)}</p>`);
  document.querySelector("#modal-details .details__grid").innerHTML = html;
  MicroModal.show("modal-details");
}
