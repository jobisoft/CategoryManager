class State {
  #tab;
  addressBooks;
  #allowEdit = false;
  allContactsVirtualAddressBook;
  currentAddressBook;
  currentContactDataFromDragAndDrop;
  currentCategoryElement;
  elementForContextMenu;
  currentDraggingOverCategoryElement;
  async init() {
    const [tab] = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    this.#tab = tab;
    const { addressBooks } = await browser.storage.local.get("addressBooks");
    this.addressBooks = addressBooks;
    this.allContactsVirtualAddressBook = this.addressBooks.get("all-contacts");
    this.currentAddressBook = this.allContactsVirtualAddressBook;
    if (this.currentAddressBook == null)
      document.getElementById("info-text").style.display = "initial";
    this.allowEdit = true;
  }

  get tab() {
    if (!this.#tab) {
      throw new Error("init() was not called");
    }
    return this.#tab;
  }
  get isComposeAction() {
    return this.tab.type == "messageCompose";
  }
  get spinnerElement() {
    return document.getElementById("spinner");
  }
  get allowEdit() {
    return this.#allowEdit;
  }
  set allowEdit(value) {
    this.#allowEdit = value;
    if (this.#allowEdit) {
      this.spinnerElement.classList.remove("show");
    } else {
      this.spinnerElement.classList.add("show");
    }
  }
}

export default State;
