//let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
//loader.loadSubScript("chrome://messenger/content/mailCore.js");
//loader.loadSubScript("chrome://messenger/content/addressbook/addressbook.js");
//loader.loadSubScript("chrome://messenger/content/addressbook/abCommon.js");

var jbCatMan = window.opener.jbCatMan;
var jbCatManBulkEdit = {}






jbCatManBulkEdit.getCardsFromEmail = function (email) {
  jbCatMan.dump("Begin with getCardsFromEmail("+email+")",1);

  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        
  let abURI = jbCatMan.getWorkAbUri(abManager.getDirectory(jbCatMan.bulk.selectedDirectory));
  
  let EmailQuery = "(PrimaryEmail,bw,@V)(SecondEmail,bw,@V)";
  let searchQuery = EmailQuery.replace(/@V/g, encodeURIComponent(email));

  //special treatment for googlemail.com
  if (email.indexOf("gmail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("gmail.com","googlemail.com")));
  } else if (email.indexOf("googlemail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("googlemail.com","gmail.com")));
  }
  
  jbCatMan.dump("Done with getCardsFromEmail()",-1);
  return abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
}



jbCatManBulkEdit.loadBulkList = function () {
  document.title = window.arguments[1];

  //Update Label
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+jbCatMan.data.selectedCategory+"]");

  let bulkbox = document.getElementById("CatManBulkTextBox");
  let value = "";
  if (jbCatMan.data.selectedCategory in jbCatMan.data.emails) {
    for (let i=0; i<jbCatMan.data.emails[jbCatMan.data.selectedCategory].length; i++) {
      value = value + jbCatMan.data.emails[jbCatMan.data.selectedCategory][i] + "\n";
    }
  }
  bulkbox.value=value;
  
  //give feedback to users about possible category members without primaryEmails, 
  //which will not be altered
  if (jbCatMan.data.selectedCategory in jbCatMan.data.membersWithoutPrimaryEmail && jbCatMan.data.membersWithoutPrimaryEmail[jbCatMan.data.selectedCategory].length != 0) {
    document.getElementById("CatManDescriptionNoPrimaryEmail").textContent = jbCatMan.locale.descriptionNoPrimaryEmail.replace("##counts##",jbCatMan.data.membersWithoutPrimaryEmail[jbCatMan.data.selectedCategory].length);
  } else {
    document.getElementById("CatManInfoBox").style.display = "none";
  }

}



jbCatManBulkEdit.checkInput = function () {
  let status = true;
  for (let j=0; j<jbCatMan.bulk.validatorFields.length; j++) {
    let checkField = document.getElementById(jbCatMan.bulk.validatorFields[j]);

    if (checkField.tagName == "menulist" && checkField.selectedIndex == 0) {
      status = false;
    }

    if (checkField.tagName == "textbox" && checkField.value == "") {
      status = false;
    }
  }

  document.documentElement.getButton("accept").disabled = !status;
  return status;
}



jbCatManBulkEdit.stopme = function (e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}



jbCatManBulkEdit.loadValidateList = function() {
  document.title = window.arguments[1];

  jbCatMan.bulk.validatorFields = new Array();
  jbCatMan.bulk.toBeValidated = new Array();

  let testToBeValidated = jbCatMan.bulk.bulkList.toLowerCase().replace(",","\n").replace(";","\n").split(/\r\n|\r|\n/g);

  //run through the list, trim and check for double
  for (let i=0; i < testToBeValidated.length; i++) {
    let email = testToBeValidated[i].trim();
    if (jbCatMan.bulk.toBeValidated.indexOf(email)<0) {
      jbCatMan.bulk.toBeValidated.push(email);
    }
  }

  let validatorList = document.getElementById("CatManValidatorList");
  validatorList.clearSelection();
  validatorList.style.visibility = 'hidden'; 

  document.documentElement.getButton("accept").disabled = true;
  window.setTimeout(function() { jbCatManBulkEdit.validateEmailList(0); }, 20);
}



jbCatManBulkEdit.validateEmailList = function (i) {
  if (i < jbCatMan.bulk.toBeValidated.length) {
    let validatorList = document.getElementById("CatManValidatorList");
    let email = jbCatMan.bulk.toBeValidated[i];

    document.getElementById("CatManValidatorProgressBar").value = (i+1)*100/jbCatMan.bulk.toBeValidated.length;

    if (email != "") {

      let CatMan_popup_name = "";
      let CatMan_popup_select = 0;
      let memberIdx = -1;

      let cardsIterator = jbCatManBulkEdit.getCardsFromEmail(email);
      let cards = [];
      while (cardsIterator.hasMoreElements()) {
              cards.push(cardsIterator.getNext().QueryInterface(Components.interfaces.nsIAbCard));
      }

      let newtemplate = null;

      switch(cards.length)
      {
        case 0: //NOTOK
          //copy from template
          newtemplate = document.getElementById("CatManListTemplate_NOTOK").cloneNode(true);
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");

          //we have two input fields, add both to the checklist
          newtemplate.childNodes[1].childNodes[0].addEventListener("change", function(){ jbCatManBulkEdit.checkInput(); this.setAttribute('value',this.value); }, false);
          newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_FirstName_"+i);
          jbCatMan.bulk.validatorFields.push("CatManValidator_FirstName_"+i);
          newtemplate.childNodes[1].childNodes[1].addEventListener("change",function(){ jbCatManBulkEdit.checkInput(); this.setAttribute('value',this.value); }, false);
          newtemplate.childNodes[1].childNodes[1].setAttribute("id","CatManValidator_LastName_"+i);
          jbCatMan.bulk.validatorFields.push("CatManValidator_LastName_"+i);
        break;

        case 1://OK
          //get name
          let userName = jbCatMan.getUserNamefromCard(cards[0]);
          let cardID = jbCatMan.getUIDFromCard(cards[0]);
          
          //copy from template
          newtemplate = document.getElementById("CatManListTemplate_OK").cloneNode(true);
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");
          //add username via DOM manipulation
          newtemplate.setAttribute("UID",cardID);
          newtemplate.childNodes[1].childNodes[0].setAttribute("value",userName);
        break;

        default: //DOUBLE
          //is one of the doubles already in this category?? We grab the first one!
          for (let j=0;j<cards.length && memberIdx == -1 ;j++) {
            let cats = jbCatMan.getCategoriesfromCard(cards[j]);
            if (cats.indexOf(jbCatMan.data.selectedCategory) != -1) {
              memberIdx = j;
            }
          }

          if (memberIdx != -1) {
            newtemplate = document.getElementById("CatManListTemplate_DOUBLEOK").cloneNode(true);
          } else {
            newtemplate = document.getElementById("CatManListTemplate_DOUBLE").cloneNode(true);
          }
          newtemplate.removeAttribute("hidden");
          newtemplate.removeAttribute("id");
          newtemplate.removeAttribute("current");
          newtemplate.removeAttribute("selected");

          //add category menu items via DOM manipulation
          let menuItem = document.createElement("menuitem");
          menuItem.setAttribute("label", jbCatMan.locale.bulkEditChoose);
          newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);

          for (let j=0;j<cards.length;j++) {
            let menuItem = document.createElement("menuitem");

            if (memberIdx == j) {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j]) + " (*)");
            } else {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j]));
            }
            menuItem.setAttribute("value", jbCatMan.getUIDFromCard(cards[j]));
            newtemplate.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);
          }

          newtemplate.childNodes[1].childNodes[0].addEventListener("load", function(){ this.selectedIndex=(memberIdx+1); this.parentNode.parentNode.setAttribute('UID',this.value); }, false);
          newtemplate.childNodes[1].childNodes[0].addEventListener("command", function(){ this.parentNode.parentNode.setAttribute('UID',this.value); jbCatManBulkEdit.checkInput(); }, false);
          newtemplate.childNodes[1].childNodes[0].setAttribute("id","CatManValidator_Menu_"+i);
          jbCatMan.bulk.validatorFields.push("CatManValidator_Menu_"+i);
        break;

      }

      //common content manipulation via DOM
      newtemplate.childNodes[0].childNodes[0].setAttribute("value",email);
      //append to list
      validatorList.appendChild(newtemplate);

    }

    //recursive loop, to be able to draw progressbar
    window.setTimeout(function() { jbCatManBulkEdit.validateEmailList(i+1); }, 20);

  } else {

    //we are done, hide progressbar
    document.getElementById("CatManValidatorProgressBar").style.display = 'none';
    document.getElementById("CatManValidatorList").style.visibility = 'visible'; 

    //activate OK button, if possible
    jbCatManBulkEdit.checkInput();

  }
}



jbCatManBulkEdit.saveList = function (){
  document.title = window.arguments[1];

  //Update Label
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+jbCatMan.data.selectedCategory+"]");

  //walk recursively through the saveList (DOM richlist) and process item by item
  jbCatMan.bulk.cardsToBeRemovedFromCategory = new Array();
  jbCatMan.bulk.processedUIDs = new Array();
  if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
    //copy the array of members of the selectedCategory, every member found in the validatorList will be removed from this copy
    //so in the end, the copy will contain those members, which are no longer part of this category
    jbCatMan.bulk.cardsToBeRemovedFromCategory = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].slice();
  }
  window.setTimeout(function() { jbCatManBulkEdit.saveList_AddCards(0); }, 20);
}



jbCatManBulkEdit.saveList_AddCards = function (i) {
  let CatManSaverList = document.getElementById("CatManSaverList");
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  if (i < jbCatMan.bulk.saveList.childNodes.length) {

    document.getElementById("CatManSaverProgressBar").value = 80*(i/jbCatMan.bulk.saveList.childNodes.length); //will not reach 80%

    if (jbCatMan.bulk.saveList.childNodes[i].getAttribute("hidden") == false && jbCatMan.bulk.saveList.childNodes[i].tagName == "richlistitem") {
      let UID = jbCatMan.bulk.saveList.childNodes[i].getAttribute("UID");

      if (UID != "") {

        //OK, DOUBLE, or DOUBLEOK
        let name = UID;
        let card = jbCatMan.getCardFromUID(UID, jbCatMan.getWorkAbUri(abManager.getDirectory(jbCatMan.bulk.selectedDirectory)));
        let idx = jbCatMan.bulk.cardsToBeRemovedFromCategory.indexOf(UID);

        //Has this UID been processed already? Do not add the same contact twice
        if (jbCatMan.bulk.processedUIDs.indexOf(UID)!=-1)  {
          //Ignore double contact
          name  = jbCatMan.getUserNamefromCard(card);
          let row = document.createElement('listitem');
          let cell = document.createElement('listcell');
          cell.setAttribute('label',  "skipping contact [" + name + "], because he is already part of ["+jbCatMan.data.selectedCategory+"]" );
          row.appendChild(cell);
          CatManSaverList.appendChild(row);
        } else {
          if (card==null) {
              //ERROR
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "Error: ValidatorList contains unknown UID [" + UID+ "], something is wrong." );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
          } else {
            name  = jbCatMan.getUserNamefromCard(card);
            jbCatMan.bulk.processedUIDs.push(UID);
            if(idx < 0) {
              //Selected card is not part of this category, ADD IT
              let cats = jbCatMan.getCategoriesfromCard(card);
              cats.push(jbCatMan.data.selectedCategory);
              jbCatMan.setCategoriesforCard(card, cats);
              jbCatMan.modifyCard(card);
              //Log
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "add contact [" + name+ "] to ["+jbCatMan.data.selectedCategory+"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            } else {
              //Selected card is already part of this category, KEEP IT (remove it from the removelist)
              jbCatMan.bulk.cardsToBeRemovedFromCategory.splice(idx, 1);
              //Log
              let row = document.createElement('listitem');
              let cell = document.createElement('listcell');
              cell.setAttribute('label',  "keep contact [" + name + "] in ["+jbCatMan.data.selectedCategory+"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            }
          }
        }
        
      } else { 

        //NOTOK - add new contact to addressbook, also add him to category jbCatMan.selectedCategory
        let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
        card.setProperty("FirstName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value")); 
        card.setProperty("LastName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value"));
        card.setProperty("DisplayName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value")); 

        card.primaryEmail = jbCatMan.bulk.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value");
        let cats = new Array();
        cats.push(jbCatMan.data.selectedCategory);
        jbCatMan.setCategoriesforCard(card, cats);

        //add the new card to the book and then call modify, which inits sysnc
        jbCatMan.modifyCard(card);

        //Log
        let row = document.createElement('listitem');
        let cell = document.createElement('listcell');
        cell.setAttribute('label',  "create new contact [" + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value") + " <" + jbCatMan.bulk.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value") +">] and add it to ["+jbCatMan.data.selectedCategory+"]" );
        row.appendChild(cell);
        CatManSaverList.appendChild(row);

      }
    }
    window.setTimeout(function() { jbCatManBulkEdit.saveList_AddCards(i+1); }, 20);

  } else {

    //we are done adding cards, now remove cards, which no longer belongto the category
    window.setTimeout(function() { jbCatManBulkEdit.saveList_RemoveCards(0); }, 20);

  }
}



jbCatManBulkEdit.saveList_RemoveCards = function (i) {    
  let CatManSaverList = document.getElementById("CatManSaverList");
  
  if (i <  jbCatMan.bulk.cardsToBeRemovedFromCategory.length) {
    document.getElementById("CatManSaverProgressBar").value = 80 + 20*(i+1/jbCatMan.bulk.cardsToBeRemovedFromCategory.length); // will reach 100%

    let UID = jbCatMan.bulk.cardsToBeRemovedFromCategory[i];
    let name = UID;
    let card = jbCatMan.getCardFromUID(UID, jbCatMan.bulk.selectedDirectory);
    if (card==null) {
      //ERROR
      let row = document.createElement('listitem');
      let cell = document.createElement('listcell');
      cell.setAttribute('label',  "Error: RemoveList contains unknown UID [" + UID + "], something is wrong." );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else if (card.primaryEmail == "") {
      //This card has no primary email and must not be removed.
      name  = jbCatMan.getUserNamefromCard(card);
      let row = document.createElement('listitem');
      let cell = document.createElement('listcell');
      cell.setAttribute('label',  "keep contact [" + name  + "] in [" + jbCatMan.data.selectedCategory + "]" );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else {
      name  = jbCatMan.getUserNamefromCard(card);
      //Contact is no longer part of this category - REMOVE IT
      let cats = jbCatMan.getCategoriesfromCard(card);
      let idx = cats.indexOf(jbCatMan.data.selectedCategory);
      if (idx<0) {
        //It looks like, this contact is not part of this category
      } else {
        cats.splice(idx, 1);
        jbCatMan.setCategoriesforCard(card, cats);
        jbCatMan.modifyCard(card);
        //Log
        let row = document.createElement('listitem');
        let cell = document.createElement('listcell');
        cell.setAttribute('label',  "remove contact [" + name  + "] from [" + jbCatMan.data.selectedCategory + "]" );
        row.appendChild(cell);
        CatManSaverList.appendChild(row);
      }
    }
    window.setTimeout(function() { jbCatManBulkEdit.saveList_RemoveCards(i+1); }, 20);

  } else {

    //we are done
    document.getElementById("CatManSaverProgressBar").style.display = 'none';

  }
}
