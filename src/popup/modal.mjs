// ----------
//   Modal
// ----------

import {
  SUBCATEGORY_SEPARATOR,
  validateCategoryString,
} from "../modules/cache/index.mjs";

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
  console.log(categoryInput);
  console.log(result);
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
