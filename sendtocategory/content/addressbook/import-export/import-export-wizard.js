var jbCatMan = window.opener.jbCatMan;
var jbCatManWizard = {}

let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/parser/csv/csv.js");
loader.loadSubScript("chrome://sendtocategory/content/parser/vcf/vcard.js");
loader.loadSubScript("chrome://sendtocategory/content/parser/vcf/vcf.js");

/* TODO 
    - allow csv comment on import?
    - import confirmation screen
    - fix csv parser to allow different textseperator on import
    - actual import
    - export options (linebreak, delim, textsep, encoding)
    - export of entire address book not working
    - tag only known fields for export + category + sort?
    - obey category option
*/





jbCatManWizard.Init = function () {
  
  // Define all allowed file extensions. The XUL wizard MUST contain an landing page for import
  // and export for each extension: CatManWizardImport_EXT and CatManWizardExport_EXT
  jbCatManWizard.filetypes = {};
  jbCatManWizard.filetypes.csv = document.getElementById('sendtocategory.wizard.types.csv').value;
  //jbCatManWizard.filetypes.vcf = document.getElementById('sendtocategory.wizard.types.vcf').value;
    
  // Define all fields, which are not allowed to be imported/exported, because they are managed by TB itself.
  jbCatManWizard.forbiddenFields = ["DbRowID","RecordKey","LastRecordKey"];
  
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  jbCatManWizard.currentAddressBook = abManager.getDirectory(window.opener.GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself
  jbCatManWizard.exportsize = jbCatMan.data.abSize;
  
  if (jbCatMan.data.selectedCategory != "") {
    //user selected a category
    jbCatManWizard.exportsize = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length;
  } else {
    //user selected an entire address book
    document.getElementById('CatManWizardExport_Categories_CSV').hidden = true;
  }


  // Update custom placeholders in locale strings.
  this.replaceCustomStrings(document.getElementById('CatManWizardModeImport'));
  this.replaceCustomStrings(document.getElementById('CatManWizardModeExport'));
  this.replaceCustomStrings(document.getElementById('CatManWizardExportDesc'));
  this.replaceCustomStrings(document.getElementById('CatManWizardImportDesc'));
  
  this.replaceCustomStrings(document.getElementById('CatManWizardExport_Categories_CSV'));

  // Get all options from CatManWizardImportCsvDelimiterPopup.
  elements = document.getElementById('CatManWizardImportCsvDelimiterPopup').children;
  jbCatManWizard.csvDelimiter = [];
  for(let x=0; x<elements.length ;x++){
    jbCatManWizard.csvDelimiter.push(elements[x].value);
  }
  
}



/* Disable back button on last page */
jbCatManWizard.finishWizard = function () {
  document.documentElement.getButton("back").hidden=true;
  document.documentElement.getButton("cancel").hidden=true;
}



/* Do things on hitting advance button */
jbCatManWizard.onpageadvanced = function (curPage) {

  // check if a silent function needs to be called, before leaving the current page 
  // it looks for a function jbCatManWizard.SilentAfter_<currentPage>
  let type = "SilentAfter_" + curPage.pageid.replace("CatManWizard","");
  let typeFunction = this[type]; 
  if(typeof typeFunction === 'function') {
      this.advance = typeFunction();
      if (!this.advance) return false;
  }

  // check if a progress function needs to be called, before leaving the current page 
  // it looks for a function jbCatManWizard.ProgressAfter_<currentPage>
  type = "ProgressAfter_" + curPage.pageid.replace("CatManWizard","");
  typeFunction = this[type]; 
  if(typeof typeFunction === 'function') {
      this.advance = true;
      this.more = true;
      window.openDialog("chrome://sendtocategory/content/addressbook/import-export/progress.xul", "progress-window", "modal,dialog,centerscreen,chrome,resizable=no,width=300, height=20", type);
      if (!this.advance) return false;
  }
  
  //manually set next page from current page (overriding xul settings)
  switch (curPage.pageid) {

    case "CatManWizardMode":
      let nsIFilePicker = Components.interfaces.nsIFilePicker;
      let fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      if (document.getElementById('CatManWizardMode').value == "Export") fp.init(window, document.getElementById('sendtocategory.wizard.mode.export.selectfile').value , nsIFilePicker.modeSave);
      else fp.init(window, document.getElementById('sendtocategory.wizard.mode.import.selectfile').value, nsIFilePicker.modeOpen);

      // add all allowed file types
      let extAtIndex = [];
      let ext;
      for (ext in jbCatManWizard.filetypes) {
        fp.appendFilter(jbCatManWizard.filetypes[ext] ,"*." + ext);
        extAtIndex.push(ext);
      }

      // determine next XUL page based on filetype selection and load default landing page
      let res = fp.show();
      if (res == nsIFilePicker.returnCancel) return false;
      else curPage.next = "CatManWizard" + document.getElementById('CatManWizardMode').value + "_" + extAtIndex[fp.filterIndex].toUpperCase();
      
      jbCatManWizard.fileObj = fp.file;

    break;

  }

  // check if a silent function needs to be called, before loading the next page 
  // it looks for a function jbCatManWizard.SilentBefore_<nextPage>
  type = "SilentBefore_" + curPage.next.replace("CatManWizard","");
  typeFunction = this[type]; 
  if(typeof typeFunction === 'function') {
      this.advance = typeFunction();
      if (!this.advance) return false;
  }

  // check if a progress function needs to be called, before loading the next page 
  // it looks for a function jbCatManWizard.ProgressBefore_<nextPage>
  type = "ProgressBefore_" + curPage.next.replace("CatManWizard","");
  typeFunction = this[type]; 
  if(typeof typeFunction === 'function') {
      this.advance = true;
      this.more = true;
      window.openDialog("chrome://sendtocategory/content/addressbook/import-export/progress.xul", "progress-window", "modal,dialog,centerscreen,chrome,resizable=no,width=300, height=20", type);
      if (!this.advance) return false;
  }

  //default = allow advancing to next page
  return true;
}










/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * USAGE INSTRUCTIONS FOR SILENT FUNCTIONS AND PROGRESS FUNCTIONS:
 * - each silentTypeFunction() must return either true or false, to indicate, 
 *   wether it is allowed to advance to the next wizard page or not
 * - each progressTypeFunction(dialog) must eventually call dialog.done(true/false)
 *   at some point, to close the dialog and to allow or to disallow advancing to the 
 *   next wizard page. 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CSV IMPORT FUNCTIONS 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

jbCatManWizard.ProgressBefore_Import_CSV = function (dialog, step = 0) {
  step = step + 1;
  dialog.setProgressBar(step*50);

  switch (step) {
    case 1:
      //read CSV file 
      jbCatManWizard.fileContent = jbCatManWizard.readFile(jbCatManWizard.fileObj);
    break;
    
    case 2:
      //scan CSV file to guess import options
      if (jbCatManWizard.fileContent.trim().length > 0) {
        let guess = 0;
        let count = 0;
        for(let x=0; x<jbCatManWizard.csvDelimiter.length ;x++){
          let c = jbCatManWizard.fileContent.split(jbCatManWizard.csvDelimiter[x]).length;
          if (c>count) {count = c; guess= x; } 
        }
        //set xul field to guess
        document.getElementById('CatManWizardImportCsvDelimiter').selectedIndex = guess;
      } else {
        alert(document.getElementById('sendtocategory.wizard.import.error.empty').value);
        dialog.done(false);
      }
    break;

    case 3:
      //done
      dialog.done(true);
    break;
  }
  if (jbCatManWizard.more) dialog.window.setTimeout(function() { jbCatManWizard.ProgressBefore_Import_CSV(dialog, step); }, 100);
}

jbCatManWizard.ProgressBefore_Import_Mapping_CSV = function (dialog, step = 0) {
  //extract cvs fields and prepare list
  step = step + 1;
  dialog.setProgressBar(step*33);
  
  switch (step) {
    case 1:
      //parse file with selected options
      jbCatManWizard.csv = new CSVParser(jbCatManWizard.fileContent, {fieldSeparator : jbCatManWizard.csvDelimiter[document.getElementById('CatManWizardImportCsvDelimiter').selectedIndex], strict : true,  ignoreEmpty: true});
      try {jbCatManWizard.csv.parse();} catch (e) {alert (document.getElementById('sendtocategory.wizard.import.error.csv').value); dialog.done(false);}
    break;

    case 2:
      // Get  standard thunderbird fields defined in XUL  - https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/nsIAbCard_(Tb3)
      jbCatManWizard.standardFields = [];
      for (let c=0; c<document.getElementById('CatManImportDataFieldListTemplate').childNodes[1].childNodes[0].itemCount; c++)
      {
        let item = document.getElementById('CatManImportDataFieldListTemplate').childNodes[1].childNodes[0].getItemAtIndex(c).label;
        jbCatManWizard.standardFields.push(item);
      }
    break;
      
    case 3:
      //extract all data fields from import file
      jbCatManWizard.datafields = jbCatManWizard.csv.rows[0];

      // clear list
      let mappingList = document.getElementById("CatManWizardImport_Mapping_CSV");
      for(var i=mappingList.getRowCount() -1; i>=0; i--){
        mappingList.removeItemAt(i);
      }
      
      for (let x=0; x<jbCatManWizard.datafields.length; x++) {
        //copy from template
        dump(jbCatManWizard.datafields[x] + "\n");
        let newListEntry = document.getElementById("CatManImportDataFieldListTemplate").cloneNode(true);
        newListEntry.removeAttribute("id");
        newListEntry.removeAttribute("current");
        newListEntry.removeAttribute("selected");

        //append selected field, if not in standardFields
        let itemIndex = jbCatManWizard.standardFields.indexOf(jbCatManWizard.datafields[x]);
        if (itemIndex == -1)
        {
          let menuItem = document.createElement("menuitem");
          menuItem.setAttribute("label", jbCatManWizard.datafields[x]);
          newListEntry.childNodes[1].childNodes[0].childNodes[0].appendChild(menuItem);
          itemIndex = jbCatManWizard.standardFields.length;
        }
        newListEntry.childNodes[1].childNodes[0].childNodes[0].childNodes[itemIndex].setAttribute("selected", "true");
        newListEntry.childNodes[1].childNodes[0].childNodes[0].childNodes[itemIndex].setAttribute("style", "font-weight:bold;")
        newListEntry.childNodes[0].childNodes[0].setAttribute("value",jbCatManWizard.datafields[x]);
        mappingList.appendChild(newListEntry);
      }
    break;
      
    case 4:
      //done
      dialog.done(true);
    break;
  }
  
  if (jbCatManWizard.more) dialog.window.setTimeout(function() { jbCatManWizard.ProgressBefore_Import_Mapping_CSV(dialog, step); }, 100);
}

jbCatManWizard.SilentAfter_Import_Mapping_CSV = function () {
  //check user selection of import mapping for forbidden fields
  let mappingList = document.getElementById("CatManWizardImport_Mapping_CSV");
  for(var i=mappingList.getRowCount() -1; i>=0; i--){
    let v = mappingList.getItemAtIndex(i).childNodes[1].childNodes[0].label;
    let c = mappingList.getItemAtIndex(i).childNodes[2].childNodes[0].checked;
    if (c && jbCatManWizard.forbiddenFields.indexOf(v) != -1)
    {
      alert(document.getElementById('sendtocategory.wizard.import.error.reserved').value.replace("##fieldname##",v));
      return false;
    }
  }
  return true;
}

jbCatManWizard.ProgressAfter_Import_Mapping_CSV = function (dialog, step = 0) {
  //do import
  
  if (step == 0) {
    // update number of imported contacts, header row does not count
    let v = document.getElementById('CatManWizardImportDesc').textContent;
    document.getElementById('CatManWizardImportDesc').textContent = v.replace("##IMPORTNUM##",jbCatManWizard.csv.numberOfRows()-1);
  }
  
  step = step + 1;
  if (step > jbCatManWizard.csv.numberOfRows()) dialog.done(true);
  else {
    dialog.setProgressBar(100*step/jbCatManWizard.csv.numberOfRows());
    //get dataset, skip header
    let data = jbCatManWizard.csv.rows[step];
 
    //TODO
    if (data) dump(data[0] + "\n");

    dialog.window.setTimeout(function() { jbCatManWizard.ProgressAfter_Import_Mapping_CSV(dialog, step); }, 20);
  }
}



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CSV EXPORT FUNCTIONS 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

//find all fields used by selected contacts
//let user select, whichg fields to export
//export
/*    try {
      dump(step + ": " + card.getPropertyAsAString("FirstName") + "\n");
    } catch(e) {
      dump(step + ": Error \n");
    }*/


jbCatManWizard.ProgressBefore_Export_CSV = function (dialog, step = 0) {

  if (step == 0) {
    jbCatManWizard.resetThunderbirdProperties("CatManWizardExport_CSV");
    let searchstring = jbCatManWizard.currentAddressBook.URI;
    if (jbCatMan.data.selectedCategory != "") searchstring = jbCatMan.getCategorySearchString(jbCatManWizard.currentAddressBook.URI, jbCatMan.data.selectedCategory);
    jbCatManWizard.exportCards = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager).getDirectory(searchstring).childCards;
  }
  
  step = step + 1;

  if (jbCatManWizard.exportCards.hasMoreElements()) {
    dialog.setProgressBar(100*step/jbCatManWizard.exportsize);
    let card = jbCatManWizard.exportCards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
    jbCatManWizard.searchThunderbirdProperties(card.properties, "CatManWizardExport_CSV", "CatManExportDataFieldListTemplate");
    dialog.window.setTimeout(function() { jbCatManWizard.ProgressBefore_Export_CSV(dialog, step); }, 20);
  } else dialog.done(true);

}


jbCatManWizard.ProgressAfter_Export_CSV = function (dialog, step = 0) {
  //do export
  let delim = ",";
  let quote = "\"";
  let linebreak = "\n";
  
  if (step == 0) {
    //init export file
    jbCatManWizard.initFile(jbCatManWizard.fileObj);
    //get cards to be exported
    let searchstring = jbCatManWizard.currentAddressBook.URI;
    if (jbCatMan.data.selectedCategory != "") searchstring = jbCatMan.getCategorySearchString(jbCatManWizard.currentAddressBook.URI, jbCatMan.data.selectedCategory);
    jbCatManWizard.exportCards = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager).getDirectory(searchstring).childCards;
    //escape header
    let header = []
    for (let h=0; h<jbCatManWizard.foundThunderbirdProperties.length; h++) {
      header.push(jbCatManWizard.csvEscape(jbCatManWizard.foundThunderbirdProperties[h], delim, quote));
    }
    jbCatManWizard.appendFile(header.join(delim)+linebreak);
  }
 
  step = step + 1;
  if (jbCatManWizard.exportCards.hasMoreElements()) {
    dialog.setProgressBar(100*step/jbCatManWizard.exportsize);
    let card = jbCatManWizard.exportCards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
    //get all properties of card and write it to csv file
    let data = [];
    for (let h=0; h<jbCatManWizard.foundThunderbirdProperties.length; h++) {
      let field = "";
      try {
        field = card.getPropertyAsAString(jbCatManWizard.foundThunderbirdProperties[h]);
      } catch(e) {}
      data.push(jbCatManWizard.csvEscape(field, delim, quote));
    }
    jbCatManWizard.appendFile(data.join(delim)+linebreak);
    dialog.window.setTimeout(function() { jbCatManWizard.ProgressAfter_Export_CSV(dialog, step); }, 20);
  } else {
    //close csv file
    jbCatManWizard.closeFile();
    dialog.done(true);
  }
}



/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * VCF IMPORT FUNCTIONS 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
  VCF.parse("BEGIN:VCARD\r\n" +
    "VERSION:4.0\r\n" +
    "FN:My formatted name\r\n" +
    "END:VCARD\r\n", function(vcard) {
  // this function is called with a VCard instance.
  // If the input contains more than one vCard, it is called multiple times.
  dump("Formatted name: " + vcard.fn + "\n");
  dump("Names: " + vcard.n + "\n");
  });

*/

jbCatManWizard.ProgressBefore_Import_VCF = function (dialog, step = 0) {
  //demo progressbar
  step = step + 1;
  if (step > 100) dialog.done(true);
  else {
    dialog.setProgressBar(step);
    dialog.window.setTimeout(function() { jbCatManWizard.ProgressBefore_Import_VCF(dialog, step); }, 1000);
  }
}










/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * HELPER FUNCTIONS 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

jbCatManWizard.replaceCustomStrings = function (element) {
  let desc = "";
  if (element.tagName.toLowerCase() == "description") desc = element.textContent ;
  else desc = element.label;

  desc = desc.replace("##NUM##", jbCatManWizard.exportsize);
  desc = desc.replace("##BOOK##", jbCatManWizard.currentAddressBook.dirName);
  desc = desc.replace("##CAT##", jbCatMan.data.selectedCategory);

  //find category substring
  let p1 = desc.indexOf("{{");
  let p2 = desc.indexOf("}}", p1);
  let s1 = desc.substring(0, p1);
  let s2 = desc.substring(p1+2, p2);
  let s3 = desc.substring(p2+2);

  let newvalue = "";
  if (jbCatMan.data.selectedCategory == "") 
    newvalue = s1 + s3;
  else
    newvalue = s1 + s2 + s3;
  
  if (element.tagName.toLowerCase() == "description") element.textContent = newvalue;
  else element.label = newvalue;
}


// http://forums.mozillazine.org/viewtopic.php?p=13321043#p13321043
jbCatManWizard.readFile = function(file) {
  var response = "";
  try
  {
     if (file.exists() && file.isReadable())
     {
        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
        var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
        fstream.init(file, -1, 0, 0);
        sstream.init(fstream); 
        var str = sstream.read(4096);
        while (str.length > 0)
        {
           response += str;
           str = sstream.read(4096);
        }
        sstream.close();
        fstream.close();
     }
  }
  catch(e) {};
  return response;
}



jbCatManWizard.initFile = function(file) {
  try
  {
     jbCatManWizard.stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Components.interfaces.nsISafeOutputStream);
     jbCatManWizard.stream.QueryInterface(Components.interfaces.nsIFileOutputStream).init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate, rw-rw-rw-
  } catch(e) {
    alert("Error opening to file.");
    return false;
  };
  return true;
}

jbCatManWizard.appendFile = function(data) {
  try
  {
     jbCatManWizard.stream.write(data, data.length);
  } catch(e) {
    alert("Error writing to file.");
    return false;
  };
  return true;
}

jbCatManWizard.closeFile = function() {
  try
  {
     jbCatManWizard.stream.finish();
  } catch(e) {
    alert("Error closing to file.");
    return false;
  };
  return true;
}

jbCatManWizard.writeFile = function(file, data) {
  try
  {
     var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Components.interfaces.nsISafeOutputStream);
     stream.QueryInterface(Components.interfaces.nsIFileOutputStream).init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate, rw-rw-rw-
     stream.write(data, data.length);
     stream.finish();
  }
  catch(e) {};
}



jbCatManWizard.searchThunderbirdProperties = function (props, listname, template) {
  //get XUL list which needs to be updated
  let exportList = document.getElementById(listname);
  while (props.hasMoreElements()) {
    prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty); 
    if (jbCatManWizard.foundThunderbirdProperties.indexOf(prop.name) == -1 && jbCatManWizard.forbiddenFields.indexOf(prop.name) == -1) { 
      jbCatManWizard.foundThunderbirdProperties.push(prop.name);

        //copy from template
        let newListEntry = document.getElementById(template).cloneNode(true);
        newListEntry.removeAttribute("id");
        newListEntry.removeAttribute("current");
        newListEntry.removeAttribute("selected");
        newListEntry.childNodes[0].childNodes[0].setAttribute("value",prop.name);
        exportList.appendChild(newListEntry);

    }
  }
}

jbCatManWizard.resetThunderbirdProperties = function (listname) {
  jbCatManWizard.foundThunderbirdProperties = [];
  //reset XUL list as well 
  let exportList = document.getElementById(listname);
  for(var i=exportList.getRowCount() -1; i>=0; i--){
    exportList.removeItemAt(i);
  }
}



jbCatManWizard.togglecheck = function (element, pos) {
  let item = element.getItemAtIndex(element.selectedIndex);
  let c = item.childNodes[pos].childNodes[0].checked;
  item.childNodes[pos].childNodes[0].checked = !c;
}



jbCatManWizard.csvEscape = function (value, delim, quote) {
  //a quote is replaced by double quotes - do we need to put a quote around everything in that case as well? YES!
  let newvalue = value;
  if (newvalue.indexOf(quote) != -1) newvalue = newvalue.split(quote).join(quote+quote);
  if (newvalue.indexOf(delim) != -1 || newvalue.indexOf("\r") != -1 || newvalue.indexOf("\n") != -1 || newvalue.length != value.length) newvalue = quote + newvalue + quote;
  
  return newvalue; 
}
