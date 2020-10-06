var jbCatMan = window.opener.jbCatMan;
var jbCatManCatsEdit = {}

jbCatManCatsEdit.createItem = function (label, UID, isMember) {
    let newListItem = document.createXULElement("richlistitem");
    newListItem.setAttribute("value", UID);
    newListItem.wasMember = isMember;
    let item = document.createXULElement("label");
    item.setAttribute("value", label);
    newListItem.appendChild(item);
    return newListItem;
},

jbCatManCatsEdit.init = function () {
  this.cards = [];
  this.categoryName = window.arguments[0];
  this.localTimeout = null;
  this.locked = false;
  
  // update label and description
  let xulLabel = document.getElementById("CatsEditLabel").textContent;
  document.getElementById("CatsEditLabel").textContent = xulLabel.replace("##name##","["+ this.categoryName.split(" / ").pop() + "]");

  let xulDesc = document.getElementById("CatsEditDescription").textContent;
  document.getElementById("CatsEditDescription").textContent = xulDesc.replace("##name##","[ "+ this.categoryName + " ]");

  // fill listboxes
  this.inbox = document.getElementById('CatsEditInBox');
  this.outbox = document.getElementById('CatsEditOutBox');
  let UID = -1;
  
  for (let card of window.opener.GetSelectedAbCards()) {
    if (card.isMailList)
      continue;
    
    UID = UID + 1;
    this.cards[UID] = card;
    
    let userName = jbCatMan.getUserNamefromCard(card);
    if (card.primaryEmail != "") userName = userName + " (" + card.primaryEmail + ")";
    else {
      let secondEmail = "";
      try {
        secondEmail = card.getPropertyAsAString("SecondEmail");
      } catch (ex) {}  
      if (secondEmail != "") userName = userName + " (" + secondEmail + ")";
    }
    
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    if (catsArray.filter(cat => (cat.startsWith(this.categoryName + " / ") || cat == this.categoryName)).length == 0) {
      let newitem = this.outbox.appendChild(jbCatManCatsEdit.createItem(userName, UID, false));
      this.outbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
    } else {
      let newitem = this.inbox.appendChild(jbCatManCatsEdit.createItem(userName, UID, true));
      this.inbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
    }
  }
  
  // scroll to top 
  this.inbox.scrollToIndex(0);
  this.outbox.scrollToIndex(0);
  
  // add CTRL + A event listeners to listboxes
  this.inbox.addEventListener("keydown", function(e) {
    // Bind to both command (for Mac) and control (for Win/Linux)
    if (e.ctrlKey && (e.keyCode == 65 || e.keyCode == 97)) {
      jbCatManCatsEdit.inbox.selectAll();
      jbCatManCatsEdit.onSelect();
    }
  }, false);
  
  this.outbox.addEventListener("keydown", function(e) {
    // bind to both command (for Mac) and control (for Win/Linux)
    if (e.ctrlKey && (e.keyCode == 65 || e.keyCode == 97)) {
      jbCatManCatsEdit.outbox.selectAll();
      jbCatManCatsEdit.onSelect();
    }
  }, false);
 
  
  // add doubleclick event listernes to listboxes
  this.inbox.addEventListener("dblclick", function(e) {
    //inbox to outbox = remove
    jbCatManCatsEdit.onClickRemove();
  }, false);

  this.outbox.addEventListener("dblclick", function(e) {
    //outbox to inbox = add
    jbCatManCatsEdit.onClickAdd();
  }, false);

    
  document.addEventListener("dialogaccept", function(event) {
    /* await */ jbCatManCatsEdit.onAccept();
    event.preventDefault(); // Prevent the dialog closing.
  });
  
  this.inbox.selectedIndex = 0;
  this.outbox.selectedIndex = 0;
  jbCatManCatsEdit.onSelect();
}

/* Enable Add/Remove buttons, if at least one contact has been selected */
jbCatManCatsEdit.onSelect = function () {
  document.getElementById("CatsEditAddButton").disabled = (this.outbox.selectedCount == 0);
  document.getElementById("CatsEditRemoveButton").disabled = (this.inbox.selectedCount == 0);
  
  document.getElementById("CatsEditAddAllButton").disabled = (this.outbox.getRowCount() == 0);
  document.getElementById("CatsEditRemoveAllButton").disabled = (this.inbox.getRowCount() == 0);
}

/* Move contact from the OUT box to the IN box */
jbCatManCatsEdit.onClickAdd = function () {
  for (let i=this.outbox.selectedItems.length; i > 0; i--) {
    let item = this.outbox.selectedItems[i-1];
    let newitem = this.inbox.appendChild(item);
    this.inbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
  }
  // update buttons after manipulating lists
  this.outbox.clearSelection();
  jbCatManCatsEdit.onSelect();
}

/* Move ALL contact from the OUT box to the IN box */
jbCatManCatsEdit.onClickAddAll = function () {
  for (let i=this.outbox.getRowCount(); i>0; i--) {
    let item = this.outbox.getItemAtIndex(i-1);
    let newitem = this.inbox.appendChild(item);
    this.inbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
  }
  // update buttons after manipulating lists
  this.outbox.clearSelection();
  jbCatManCatsEdit.onSelect();
}

/* Move contact from the IN box to the OUT box */
jbCatManCatsEdit.onClickRemove = function () {
  for (let i=this.inbox.selectedItems.length; i > 0; i--) {
    let item = this.inbox.selectedItems[i-1];
    let newitem = this.outbox.appendChild(item);
    this.outbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
  }
  // update buttons after manipulating lists
  this.inbox.clearSelection();
  jbCatManCatsEdit.onSelect();
}

/* Move ALL contact from the IN box to the OUT box */
jbCatManCatsEdit.onClickRemoveAll = function () {
  for (let i=this.inbox.getRowCount(); i>0; i--) {
    let item = this.inbox.getItemAtIndex(i-1);
    let newitem = this.outbox.appendChild(item);
    this.outbox.ensureElementIsVisible(newitem); //workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=250123#c16
  }
  // update buttons after manipulating lists
  this.inbox.clearSelection();
  jbCatManCatsEdit.onSelect();
}



/* Initiate final actions: lock dialog and call updateCard for first card */
jbCatManCatsEdit.onAccept = async function () {
  this.locked = true;
  document.documentElement.getButton("cancel").disabled = true;
  document.documentElement.getButton("accept").disabled = true;
  document.getElementById('CatsEditProgressBar').style.visibility = "visible";
  this.localTimeout = window.setTimeout(function() { jbCatManCatsEdit.updateCard(0); }, 1);
}


/* Check if category membership of card changed and update category property, if needed */
 jbCatManCatsEdit.updateCard = async function (progress) {
  // update progress bar
  document.getElementById('CatsEditProgressBar').value =  (100 * progress) / this.cards.length;
   
  if (progress == this.cards.length) {

    // done: unlock, close and exit
    this.locked = false;
    window.close();

  } else {

    let item = {};
    // are we processing an outbox card or an inbox card?
    if (progress < this.outbox.itemCount) item.remove = this.outbox.getItemAtIndex(progress)
    else item.add = this.inbox.getItemAtIndex(progress-this.outbox.itemCount);
    
    if (item.remove && item.remove.wasMember) {
      item.card = this.cards[item.remove.value];
      // remove category and all its children
      item.catsArray = jbCatMan.getCategoriesfromCard(item.card).filter(e => !(e.startsWith(this.categoryName + " / ") || e == this.categoryName));
      // add its parent (if needed)
      let parent = this.categoryName.split(" / ").slice(0, -1).join(" / ");
      if (item.catsArray.filter(e => e.startsWith(parent + " / ")).length == 0) {
       item.catsArray.push(parent);
      }
    }
    
    if (item.add && !item.add.wasMember) {
      item.card = this.cards[item.add.value];
      item.catsArray = jbCatMan.getCategoriesfromCard(item.card);
      // add category
      item.catsArray.push(this.categoryName);
    }
    
    if (item.card) {
      jbCatMan.setCategoriesforCard(item.card, item.catsArray);
      await jbCatMan.modifyCard(item.card);
    }
    
    // continue with next contact
    this.localTimeout = window.setTimeout(function() { jbCatManCatsEdit.updateCard(progress + 1); }, 1);

  }

}


/* Prevent closing of the dialog, if it is locked (called by onclose event) */
 jbCatManCatsEdit.closeCheck = function () {
   return (this.locked == false);
}
