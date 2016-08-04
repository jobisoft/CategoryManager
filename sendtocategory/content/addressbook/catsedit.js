var jbCatMan = window.opener.jbCatMan;
var jbCatManCatsEdit = {}

jbCatManCatsEdit.init = function () {
  this.cards = window.opener.GetSelectedAbCards();
  this.category = window.arguments[0] ;
  this.localTimeout = null;
  this.locked = false;


  //Update label and description
  let xulLabel = document.getElementById("CatsEditLabel").textContent;
  document.getElementById("CatsEditLabel").textContent = xulLabel.replace("##name##","["+ this.category + "]");

  let xulDesc = document.getElementById("CatsEditDescription").textContent;
  document.getElementById("CatsEditDescription").textContent = xulDesc.replace("##name##","["+ this.category + "]");

  //Fill listboxes
  this.inbox = document.getElementById('CatsEditInBox');
  this.outbox = document.getElementById('CatsEditOutBox');
  
  for (let i = 0; i < this.cards.length; i++) {
    let card = this.cards[i];
    let UID = i;
    let fallback = UID;
    //if no name is present, but an email, use the first part of the email as fallback for name - this is how TB is doing it as well
    if (card.primaryEmail != "") fallback = card.primaryEmail.split("@")[0];
    
    let userName = jbCatMan.getUserNamefromCard(card,fallback);
    if (card.primaryEmail != "") userName = userName + " (" + card.primaryEmail + ")";
    else {
      let secondEmail = "";
      try {
        secondEmail = card.getPropertyAsAString("SecondEmail");
      } catch (ex) {}  
      if (secondEmail != "") userName = userName + " (" + secondEmail + ")";
    }
    
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    let catIdx = catsArray.indexOf(this.category);
    if (catIdx == -1) this.outbox.appendItem(userName, UID)
    else this.inbox.appendItem(userName, UID)
  }
  
}

/* Enable Add/Remove buttons, if at least one contact has been selected */
jbCatManCatsEdit.onSelect = function () {
  document.getElementById("CatsEditAddButton").disabled = (this.outbox.selectedCount == 0);
  document.getElementById("CatsEditRemoveButton").disabled = (this.inbox.selectedCount == 0);
}

/* Move contact from the OUT box to the IN box */
jbCatManCatsEdit.onClickAdd = function () {
  let count = this.outbox.selectedCount;
  while (count--) {
    let item = this.outbox.selectedItems[0];
    this.inbox.appendChild(item);
    this.outbox.removeItemAt(this.outbox.getIndexOfItem(item));
  }
  //update buttons after manipulating lists
  jbCatManCatsEdit.onSelect()
}

/* Move contact from the IN box to the OUT box */
jbCatManCatsEdit.onClickRemove = function () {
  let count = this.inbox.selectedCount;
  while (count--) {
    let item = this.inbox.selectedItems[0];
    this.outbox.appendChild(item);
    this.inbox.removeItemAt(this.inbox.getIndexOfItem(item));
  }
  //update buttons after manipulating lists
  jbCatManCatsEdit.onSelect()
}

/* Initiate final actions: lock dialog and call updateCard for first card */
jbCatManCatsEdit.onAccept = function () {
  this.locked = true;
  document.documentElement.getButton("cancel").disabled = true;
  document.documentElement.getButton("accept").disabled = true;
  document.getElementById('CatsEditProgressBar').style.visibility = "visible";
  this.localTimeout = window.setTimeout(function() { jbCatManCatsEdit.updateCard(0); }, 1);

  // do not close dialog
  return false;
}


/* check if category membership of card changed and update category property, if needed */
 jbCatManCatsEdit.updateCard = function (progress) {
  // Update progress bar
  document.getElementById('CatsEditProgressBar').value =  (100 * progress) / this.cards.length;
   
  if (progress == this.cards.length) {

    // Done: unlock, close and exit
    this.locked = false;
    window.close();

  } else {

    let item;
    // Are we processing an outbox card or an inbox card?
    if (progress < this.outbox.itemCount) {
      this.outbox.ensureIndexIsVisible(progress); //bug? sometimes getItemAtIndex() returns an undefined item for items not visible
      item = this.outbox.getItemAtIndex(progress);
    } else {
      this.inbox.ensureIndexIsVisible(progress-this.outbox.itemCount);
      item = this.inbox.getItemAtIndex(progress-this.outbox.itemCount);
    }
    
    let card = this.cards[item.value];
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    let idx = catsArray.indexOf(this.category);
    
    // Update card if needed
    if (progress < this.outbox.itemCount) {
      // we are processing the outbox - check if card is in category, if yes -> remove it
      if (idx > -1) {
        catsArray.splice(idx, 1);
        jbCatMan.setCategoriesforCard(card, catsArray);
        jbCatMan.modifyCard(card);
      }
    } else {
      // we are processing the inbox - check if card is in category, if not -> add it
      if (idx == -1) {
        catsArray.push(this.category);
        jbCatMan.setCategoriesforCard(card, catsArray);
        jbCatMan.modifyCard(card);
      }
    }
    
    // Continue with next contact
    this.localTimeout = window.setTimeout(function() { jbCatManCatsEdit.updateCard(progress + 1); }, 1);

  }

}


/* prevent closing of the dialog, if it is locked (called by onclose event) */
 jbCatManCatsEdit.closeCheck = function () {
   return (this.locked == false);
}
