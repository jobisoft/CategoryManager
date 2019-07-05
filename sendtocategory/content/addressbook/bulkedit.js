var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var jbCatMan = window.opener.jbCatMan;
var jbCatManBulkEdit = {}

jbCatManBulkEdit.getCardsFromEmail = function (email) {
  let abURI = jbCatMan.getWorkAbUri(MailServices.ab.getDirectory(jbCatMan.bulk.selectedDirectory));
  
  let EmailQuery = "(PrimaryEmail,bw,@V)(SecondEmail,bw,@V)";
  let searchQuery = EmailQuery.replace(/@V/g, encodeURIComponent(email));

  //special treatment for googlemail.com
  if (email.indexOf("gmail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("gmail.com","googlemail.com")));
  } else if (email.indexOf("googlemail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("googlemail.com","gmail.com")));
  }
  return MailServices.ab.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
}



jbCatManBulkEdit.loadBulkList = function () {
  document.title = window.arguments[1];
  let abURI = window.opener.GetSelectedDirectory();

  let emails = [];
  let cardsWithoutEmails = 0;
  jbCatMan.bulk.originalMembers = [];
  jbCatMan.bulk.categoryFilter = window.arguments[0];

  let searchstring =  jbCatMan.getCategorySearchString(abURI, jbCatMan.bulk.categoryFilter);
  let cards = MailServices.ab.getDirectory(searchstring).childCards;
  
  while (cards.hasMoreElements()) {
    let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);

    jbCatMan.bulk.originalMembers.push(jbCatMan.getUIDFromCard(card));
    let email = jbCatMan.getEmailFromCard(card);
    if (email) {
      if (!emails.includes(email)) emails.push(email);
    } else {
     cardsWithoutEmails++;    
    }
  }
  emails.sort();

  //Update Label
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+ jbCatMan.bulk.categoryFilter[jbCatMan.bulk.categoryFilter.length - 1] +"]");
  document.getElementById("CatManBulkTextBox").value = emails.join("\n");
  
  //give feedback to users about possible category members without any email address, 
  //which will not be altered
  if (cardsWithoutEmails > 0) {
    document.getElementById("CatManDescriptionNoPrimaryEmail").textContent = jbCatMan.locale.descriptionNoPrimaryEmail.replace("##counts##", cardsWithoutEmails);
  } else {
    document.getElementById("CatManInfoBox").style.display = "none";
  }
  
  document.addEventListener("dialogaccept", function(event) {
    jbCatMan.bulk.bulkList=document.getElementById('CatManBulkTextBox').value; 
    jbCatMan.bulk.needToValidateBulkList=true;
    //event.preventDefault(); 
  });

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

  jbCatMan.bulk.validatorFields = [];
  jbCatMan.bulk.toBeValidated = [];
  
  let emails = jbCatMan.bulk.bulkList.split("\r").join("").split("\"").join("").split("'").join("").split("\n");
  for (let email of emails) {
    let parsed = MailServices.headerParser.makeFromDisplayAddress(email);
    if (parsed.length) {
      let obj = { email: parsed[0].email.trim().toLowerCase() };
      
      let s1 = parsed[0].name.split(",");
      let s2 = parsed[0].name.split(" ");
      if (s1.length > 1) {
        obj.firstname = s1[1].trim();
        obj.lastname = s1[0].trim();
      } else if (s2.length > 1) {
        obj.firstname = s2[0].trim();
        obj.lastname = s2[1].trim();
      } else {
        obj.firstname ="";
        obj.lastname = parsed[0].name.trim();
      }
      if (jbCatMan.bulk.toBeValidated.filter(e => e.email == obj.email).length == 0) jbCatMan.bulk.toBeValidated.push(obj);
    }
  }

  let validatorList = document.getElementById("CatManValidatorList");
  validatorList.clearSelection();
  validatorList.style.visibility = 'hidden'; 

  document.documentElement.getButton("accept").disabled = true;
  window.setTimeout(function() { jbCatManBulkEdit.validateEmailList(0); }, 20);

  document.addEventListener("dialogaccept", function(event) {
    window.opener.jbCatMan.bulk.saveList=document.getElementById('CatManValidatorList'); 
    window.opener.jbCatMan.bulk.needToSaveBulkList=true;
    //event.preventDefault(); // Prevent the dialog closing.
  });  
}



jbCatManBulkEdit.validateEmailList = function (i) {
  if (i < jbCatMan.bulk.toBeValidated.length) {
    let validatorList = document.getElementById("CatManValidatorList");
    let entry = jbCatMan.bulk.toBeValidated[i];

    document.getElementById("CatManValidatorProgressBar").value = (i+1)*100/jbCatMan.bulk.toBeValidated.length;

    if (entry.email != "") {
      let memberIdx = -1;

      let cardsIterator = jbCatManBulkEdit.getCardsFromEmail(entry.email);
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
          if (entry.firstname) newtemplate.childNodes[1].childNodes[0].setAttribute("value", entry.firstname);
          jbCatMan.bulk.validatorFields.push("CatManValidator_FirstName_"+i);
          newtemplate.childNodes[1].childNodes[1].addEventListener("change",function(){ jbCatManBulkEdit.checkInput(); this.setAttribute('value',this.value); }, false);
          newtemplate.childNodes[1].childNodes[1].setAttribute("id","CatManValidator_LastName_"+i);
          if (entry.lastname)  newtemplate.childNodes[1].childNodes[1].setAttribute("value", entry.lastname);
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
          newtemplate.childNodes[1].childNodes[0].setAttribute("value", userName);
        break;

        default: //DOUBLE
          //is one of the doubles already in this category?? We grab the first one!
          for (let j=0; j<cards.length && memberIdx == -1 ;j++) {
            let cats = jbCatMan.getCategoriesfromCard(cards[j]).filter(cat => jbCatMan.bulk.categoryFilter.includes(cat));
            if (cats.length > 0) {
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
          let menuList = document.createElement("menulist");
          let menuPopup = document.createElement("menupopup");
          let menuItem = document.createElement("menuitem");
          menuItem.setAttribute("label", jbCatMan.locale.bulkEditChoose);
          menuPopup.appendChild(menuItem);

          let selectedUID = null;
          for (let j=0;j<cards.length;j++) {
            let menuItem = document.createElement("menuitem");
            let value = jbCatMan.getUIDFromCard(cards[j]);
            
            if (memberIdx == j) {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j]) + " (*)");
              selectedUID = value;
            } else {
              menuItem.setAttribute("label", jbCatMan.getUserNamefromCard(cards[j]));
            }
            menuItem.setAttribute("value", value);
            menuPopup.appendChild(menuItem);
          }

          menuList.appendChild(menuPopup);
          menuList.addEventListener("command", function(){ this.parentNode.parentNode.setAttribute('UID',this.value); jbCatManBulkEdit.checkInput(); }, false);
          menuList.setAttribute("id","CatManValidator_Menu_"+i);
          
          menuList.selectedIndex = memberIdx+1;
          newtemplate.childNodes[1].appendChild(menuList);
          newtemplate.setAttribute('UID', selectedUID);
          jbCatMan.bulk.validatorFields.push("CatManValidator_Menu_"+i);
        break;

      }

      //common content manipulation via DOM
      newtemplate.childNodes[0].childNodes[0].setAttribute("value", entry.email);
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
  document.getElementById("CatManBulkTextBoxLabel").value = jbCatMan.locale.bulkTextBoxLabel.replace("##name##","["+ jbCatMan.bulk.categoryFilter[jbCatMan.bulk.categoryFilter.length - 1] +"]");

  //walk recursively through the saveList (DOM richlist) and process item by item
  jbCatMan.bulk.processedUIDs = [];
  window.setTimeout(function() { jbCatManBulkEdit.saveList_AddCards(0); }, 20);
}



jbCatManBulkEdit.saveList_AddCards = function (i) {
  let CatManSaverList = document.getElementById("CatManSaverList");
  let category = jbCatMan.bulk.categoryFilter[jbCatMan.bulk.categoryFilter.length - 1];

  if (i < jbCatMan.bulk.saveList.childNodes.length) {

    document.getElementById("CatManSaverProgressBar").value = 80*(i/jbCatMan.bulk.saveList.childNodes.length); //will not reach 80%

    if (jbCatMan.bulk.saveList.childNodes[i].getAttribute("hidden") == false && jbCatMan.bulk.saveList.childNodes[i].tagName == "richlistitem") {
      let UID = jbCatMan.bulk.saveList.childNodes[i].getAttribute("UID");

      if (UID != "") {

        //OK, DOUBLE, or DOUBLEOK
        let name = UID;
        let card = jbCatMan.getCardFromUID(UID, jbCatMan.getWorkAbUri(MailServices.ab.getDirectory(jbCatMan.bulk.selectedDirectory)));
        let idx = jbCatMan.bulk.originalMembers.indexOf(UID);

        //Has this UID been processed already? Do not add the same contact twice
        if (jbCatMan.bulk.processedUIDs.indexOf(UID)!=-1)  {
          //Ignore double contact
          name  = jbCatMan.getUserNamefromCard(card);
          let row = document.createElement('richlistitem');
          let cell = document.createElement('label');
          cell.setAttribute('value',  "skipping contact [" + name + "], because he is already part of ["+ category +"]" );
          row.appendChild(cell);
          CatManSaverList.appendChild(row);
        } else {
          if (card==null) {
              //ERROR
              let row = document.createElement('richlistitem');
              let cell = document.createElement('label');
              cell.setAttribute('value',  "Error: ValidatorList contains unknown UID [" + UID+ "], something is wrong." );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
          } else {
            name  = jbCatMan.getUserNamefromCard(card);
            jbCatMan.bulk.processedUIDs.push(UID);
            if(idx < 0) {
              //Selected card is not part of this category, ADD IT
              let cats = jbCatMan.getCategoriesfromCard(card);
              cats.push(category);
              jbCatMan.setCategoriesforCard(card, cats);
              jbCatMan.modifyCard(card);
              //Log
              let row = document.createElement('richlistitem');
              let cell = document.createElement('label');
              cell.setAttribute('value',  "add contact [" + name+ "] to ["+ category +"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            } else {
              //Selected card is already part of this category, KEEP IT (remove it from the removelist)
              jbCatMan.bulk.originalMembers.splice(idx, 1);
              //Log
              let row = document.createElement('richlistitem');
              let cell = document.createElement('label');
              cell.setAttribute('value',  "keep contact [" + name + "] in ["+ category +"]" );
              row.appendChild(cell);
              CatManSaverList.appendChild(row);
            }
          }
        }
        
      } else { 

        //NOTOK - add new contact to addressbook, also add him to category
        let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
        card.setProperty("FirstName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value")); 
        card.setProperty("LastName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value"));
        card.setProperty("DisplayName", jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value")); 

        card.primaryEmail = jbCatMan.bulk.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value");
        let cats = [];
        cats.push(category);
        jbCatMan.setCategoriesforCard(card, cats);

        //add the new card to the book and then call modify, which inits sysnc
        jbCatMan.modifyCard(card);

        //Log
        let row = document.createElement('richlistitem');
        let cell = document.createElement('label');
        cell.setAttribute('value',  "create new contact [" + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[0].getAttribute("value") + " " + jbCatMan.bulk.saveList.childNodes[i].childNodes[1].childNodes[1].getAttribute("value") + " <" + jbCatMan.bulk.saveList.childNodes[i].childNodes[0].childNodes[0].getAttribute("value") +">] and add it to ["+ category +"]" );
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
  let category =  jbCatMan.bulk.categoryFilter[jbCatMan.bulk.categoryFilter.length - 1];
  
  if (i <  jbCatMan.bulk.originalMembers.length) {
    document.getElementById("CatManSaverProgressBar").value = 80 + 20*(i+1/jbCatMan.bulk.originalMembers.length); // will reach 100%

    let UID = jbCatMan.bulk.originalMembers[i];
    let name = UID;
    let card = jbCatMan.getCardFromUID(UID, jbCatMan.bulk.selectedDirectory);
    if (card==null) {
      // ERROR
      let row = document.createElement('richlistitem');
      let cell = document.createElement('label');
      cell.setAttribute('value',  "Error: RemoveList contains unknown UID [" + UID + "], something is wrong." );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else if (jbCatMan.getEmailFromCard(card) == false) {
      // This card has no defined email and must not be removed.
      name  = jbCatMan.getUserNamefromCard(card);
      let row = document.createElement('richlistitem');
      let cell = document.createElement('label');
      cell.setAttribute('value',  "keep contact [" + name  + "] in [" + category + "]" );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);
    } else {
      name  = jbCatMan.getUserNamefromCard(card);
      // Contact is no longer part of this category - REMOVE IT.
      let cats = jbCatMan.getCategoriesfromCard(card).filter(cat => !(cat.startsWith(category + " / ") || cat == category));
      
      // Put the card into the parent of this category, if avail and needed.
      let parent = category.split(" / ").slice(0, -1).join(" / ");
      if (parent && cats.filter(cat => (cat.startsWith(parent + " / ") || cat == parent)).length == 0) {
        cats.push(parent);
      }

      // Log
      let row = document.createElement('richlistitem');
      let cell = document.createElement('label');
      cell.setAttribute('value',  "remove contact [" + name  + "] from [" + category + "]" );
      row.appendChild(cell);
      CatManSaverList.appendChild(row);

      // Update card
      jbCatMan.setCategoriesforCard(card, cats);
      jbCatMan.modifyCard(card);
    }
    window.setTimeout(function() { jbCatManBulkEdit.saveList_RemoveCards(i+1); }, 20);

  } else {

    // We are done.
    document.getElementById("CatManSaverProgressBar").style.display = 'none';

  }
}
