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

    // TODO : Before loading the cache, ping the background if it has written the
    //        cache already. The listener for the former port based communication
    //        used here was created only after it was written, so if this script run
    //        first, it would just fail to connect and die. Instead - if we want to
    //        catch this case - we should set a flag in the background and simply
    //        poll it here with runtime.sendMessage() and wait until it comes back
    //        as true.
    const { addressBooks } = await browser.storage.local.get("addressBooks");
    this.addressBooks = addressBooks;
    console.log(addressBooks);
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
