import { showErrorModal } from "./modal.mjs";
function errorHandler(e) {
  console.log(e);
  showErrorModal(e.message);
}

export function initErrorHandler() {
  window.addEventListener("error", errorHandler);
  window.addEventListener("unhandledrejection", ({ reason }) =>
    errorHandler(reason)
  );
}
