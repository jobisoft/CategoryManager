// ----------
//   Modal
// ----------

import { validateCategoryString } from "../modules/address-book/index.mjs";

const categoryInput = document.getElementById("category-input");
const categoryInputError = document.getElementById("category-input-error");
const categoryInputConfirmBtn = document.getElementById(
  "category-input-confirm"
);
const categoryInputCancelBtn = document.getElementById("category-input-cancel");

async function showCategoryInputModalAsync() {
  return new Promise((resolve) => {
    categoryInput.value = null;
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
  const result = await showCategoryInputModalAsync();
  console.log(categoryInput);
  console.log(result);
  return parentCategory == null ? result : parentCategory + " / " + result;
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
  MicroModal.init({
    onClose: (modal) => {
      console.info(`${modal.id} is hidden`);
    },
  });
}
