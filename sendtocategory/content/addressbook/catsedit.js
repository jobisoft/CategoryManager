var jbCatMan = window.opener.jbCatMan;
var jbCatManCatsEdit = {}

jbCatManCatsEdit.init = function () {
  let cards = window.opener.GetSelectedAbCards();
  let category = window.arguments[0] ;

  //Update label and description
  let xulLabel = document.getElementById("CatsEditLabel").textContent;
  document.getElementById("CatsEditLabel").textContent = xulLabel.replace("##name##","["+ category + "]");

  let xulDesc = document.getElementById("CatsEditDescription").textContent;
  document.getElementById("CatsEditDescription").textContent = xulDesc.replace("##name##","["+ category + "]");

  //Fill listboxes
  let inbox = document.getElementById('CatsEditInBox');
  let outbox = document.getElementById('CatsEditOutBox');
  
  for (let i = 0; i < cards.length; i++) {
    let card = cards[i];
    let UID = i;
    let userName = jbCatMan.getUserNamefromCard(card,UID);
    if (card.primaryEmail != "") userName = userName + " (" + card.primaryEmail + ")";
    else {
      let secondEmail = "";
      try {
        secondEmail = card.getPropertyAsAString("SecondEmail");
      } catch (ex) {}  
      if (secondEmail != "") userName = userName + " (" + secondEmail + ")";
    }
    
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    let catIdx = catsArray.indexOf(category);
    if (catIdx == -1) outbox.appendItem(userName, UID)
    else inbox.appendItem(userName, UID)
  }
  
}

/* Enable Add/Remove buttons, if at least one contact has been selected */
jbCatManCatsEdit.onSelect = function () {
  let catsEditOutBox = document.getElementById("CatsEditOutBox");
  document.getElementById("CatsEditAddButton").disabled = (catsEditOutBox.selectedCount == 0);
  let catsEditInBox = document.getElementById("CatsEditInBox");
  document.getElementById("CatsEditRemoveButton").disabled = (catsEditInBox.selectedCount == 0);
}

/* Move contact from the OUT box to the IN box */
jbCatManCatsEdit.onClickAdd = function () {
  let outList = document.getElementById('CatsEditOutBox');
  let inList = document.getElementById('CatsEditInBox');
  let count = outList.selectedCount;
  while (count--) {
    var item = outList.selectedItems[0];
    inList.appendChild(item);
    outList.removeItemAt(outList.getIndexOfItem(item));
  }
  //update buttons after manipulating lists
  jbCatManCatsEdit.onSelect()
}

/* Move contact from the IN box to the OUT box */
jbCatManCatsEdit.onClickRemove = function () {
  let outList = document.getElementById('CatsEditOutBox');
  let inList = document.getElementById('CatsEditInBox');
  let count = inList.selectedCount;
  while (count--) {
    var item = inList.selectedItems[0];
    outList.appendChild(item);
    inList.removeItemAt(inList.getIndexOfItem(item));
  }
  //update buttons after manipulating lists
  jbCatManCatsEdit.onSelect()
}

/* Write modified category properties into cards */
jbCatManCatsEdit.onAccept = function () {
  return false;
}
