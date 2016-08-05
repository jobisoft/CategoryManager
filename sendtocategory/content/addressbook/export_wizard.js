/* NOTE: using let for jbCatManExportWizard did not allow to use it onpageshow etc in XUL */
var jbCatMan = window.opener.jbCatMan;
var jbCatManExportWizard = {}


jbCatManExportWizard.Init = function () {
  
  jbCatManExportWizard.foundProperties = new Array();
  jbCatManExportWizard.resetFoundProperties();

  jbCatManExportWizard.contactCards = new Array();
  jbCatManExportWizard.localTimeout = null;
  jbCatManExportWizard.foStream = null;

  // Locale object to store names from locale file
  jbCatManExportWizard.locale = {};

  // Options object to store user export options
  jbCatManExportWizard.options = {};

  /*
    wizardLocked was also intended to stop the user from closing the wizard during
    the actual export. However, preventDefault() does not seem to work on close
    events, even though event.cancelable is true. :-(
  */
  jbCatManExportWizard.wizardLocked = false;
  
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  jbCatManExportWizard.currentAddressBook = abManager.getDirectory(window.opener.GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself
  jbCatManExportWizard.size = jbCatMan.data.abSize;
  
  // Build useful description
  let desc = document.getElementById('CatManExportDescriptionLabel').textContent;
  let p1 = desc.indexOf("{{");
  let p2 = desc.indexOf("}}", p1);

  let s1 = desc.substring(0, p1);
  let s2 = desc.substring(p1+2, p2);
  let s3 = desc.substring(p2+2).replace("##BOOK##",jbCatManExportWizard.currentAddressBook.dirName);

  if (jbCatMan.data.selectedCategory == "") {
    // Address book
    jbCatManExportWizard.size = 0;
    document.getElementById('CatManExportDescriptionLabel').textContent = s1.replace("##NUM##",jbCatManExportWizard.size) + s3;
    // Get all contact cards of this ab
    let result = abManager.getDirectory(jbCatManExportWizard.currentAddressBook.URI).childCards;
    while (result.hasMoreElements()) {
      jbCatManExportWizard.contactCards.push(result.getNext().QueryInterface(Components.interfaces.nsIAbCard));
      jbCatManExportWizard.size = jbCatManExportWizard.size + 1;
    }
  } else {
    // Category
    jbCatManExportWizard.size = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length;
    document.getElementById('CatManExportDescriptionLabel').textContent = s1.replace("##NUM##",jbCatManExportWizard.size) + s2.replace("##CAT##",jbCatMan.data.selectedCategory) + s3;
    // Get all contact cards of this category
    for (let i = 0; i < jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length; i++) {
      jbCatManExportWizard.contactCards.push(jbCatMan.getCardFromUID(jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory][i], jbCatManExportWizard.currentAddressBook.URI));
    }
  }
}




/* Adjust wizard page order, based on user input */
jbCatManExportWizard.setNextPage = function (curPage) {
  if (curPage.pageid == "CatManExportType") {
    if (document.getElementById('CatManExportType').value == "vCard") curPage.next = "CatManExportVCardProperties";
    else curPage.next = "CatManExportSelectFile";
  }
}




jbCatManExportWizard.onFinish = function (wizard) {
  // Store userinput from wizard in options object
  jbCatManExportWizard.options.exportType = document.getElementById('CatManExportType').value;
  jbCatManExportWizard.options.emailMapping = document.getElementById('CatManExportEmailMapping').value;
  jbCatManExportWizard.options.fileMode = document.getElementById('CatManExportFileMode').value;

  jbCatManExportWizard.analyzeContacts = false;

  // Build default filename from book/category/filetype
  jbCatManExportWizard.options.fileName = jbCatManExportWizard.currentAddressBook.dirName;
  if (jbCatMan.data.selectedCategory != "") jbCatManExportWizard.options.fileName = jbCatManExportWizard.options.fileName + "-" + jbCatMan.data.selectedCategory;
  if (jbCatManExportWizard.options.fileMode == "files") jbCatManExportWizard.options.fileName = jbCatManExportWizard.options.fileName + "-##NUM##"
  switch (jbCatManExportWizard.options.exportType) {
    case "csv":  
      jbCatManExportWizard.options.fileName = jbCatManExportWizard.options.fileName + ".csv"; 
      break;
    case "vCard": 
      jbCatManExportWizard.options.fileName = jbCatManExportWizard.options.fileName + ".vcf";
      break;
  }
  
  // Prepare and open filepicker
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

  if (jbCatManExportWizard.options.fileMode == "file") {

    // Export all contacts into one file - let user pick file
    fp.init(window, "Select a File", nsIFilePicker.modeSave);
    switch (jbCatManExportWizard.options.exportType) {
      case "csv":  
        fp.appendFilter("Comma Seperated Values (UTF-8)" ,"*.csv");
        // To know all possible fields, contacts need to be analysed, before exporting them
        jbCatManExportWizard.analyzeContacts = true;
        break;
      case "vCard": 
        fp.appendFilter("vCard" ,"*.vcf");
        break;
    }
    fp.defaultString = jbCatManExportWizard.options.fileName;
    
  } else {

    // Export all contacts into seperate files - let user pick folder
    fp.init(window, "Select a Folder", nsIFilePicker.modeGetFolder);

  }

  var res = fp.show();
  if (res != nsIFilePicker.returnCancel) {
    // A valid selection - lock wizard until export is done
    wizard.canRewind = false;    
    wizard.canAdvance = false;
    document.documentElement.getButton("cancel").hidden=true;
    document.documentElement.getButton("back").hidden=true;
    document.documentElement.getButton("finish").hidden=true;
    jbCatManExportWizard.wizardLocked = true;
    
    let dest = fp.file; /* using append directly on fp.file did not work !?! */
    if (jbCatManExportWizard.options.fileMode == "files") {
      //append default file name - containing ##NUM## - to the user selected directory - this adds the OS specific directory seperator
      dest.append(jbCatManExportWizard.options.fileName);
    }
    //get the full path to the user selection 
    jbCatManExportWizard.options.fileName = dest.path;

    // Init export
    window.clearTimeout(jbCatManExportWizard.localTimeout);
    jbCatManExportWizard.localTimeout = window.setTimeout(function() { jbCatManExportWizard.doExport(0); }, 10);
  }

  // Always return false - the wizard will only be closed after import/export has finished
  return false;
}










/* Open export-file, if not already open. If no parameter is given, the default export file name is used. */
jbCatManExportWizard.openExportFile = function (path = jbCatManExportWizard.options.fileName) {
  if (!jbCatManExportWizard.foStream) {
    
    let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(path);
    
    jbCatManExportWizard.foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
    jbCatManExportWizard.foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
  }
}

/* Close the export-file, if still open */
jbCatManExportWizard.closeExportFile = function () {
  if (jbCatManExportWizard.foStream) {
    jbCatManExportWizard.foStream.close();
    jbCatManExportWizard.foStream = null;
  }
}

/* Write data to currently opened export-file */
jbCatManExportWizard.writeToExportFile = function (data) {
  jbCatManExportWizard.foStream.write(data, data.length);
}










jbCatManExportWizard.searchForNewProperties = function (props) {
  while (props.hasMoreElements()) {
    prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty); 
    if (jbCatManExportWizard.foundProperties.indexOf(prop.name) == -1) { //EXCLUDE some fields HERE
      jbCatManExportWizard.foundProperties.push(prop.name);
    }
  }
}

jbCatManExportWizard.resetFoundProperties = function () {
  jbCatManExportWizard.foundProperties = [];
  //ADD DEFAULT FIELDS so order is nicer than random
}

jbCatManExportWizard.addCsvHeader = function () {
  let buffer = jbCatManExportWizard.foundProperties.join(",");
  jbCatManExportWizard.writeToExportFile(buffer);
}

jbCatManExportWizard.addCsvData = function (props) {
}










jbCatManExportWizard.doExport = function (progress) {
  let progressBar = document.getElementById('CatManExportProgressBar');
  
  // GUI: init
  if (progress == 0) {
    progressBar.style.display = "block";
    if (jbCatManExportWizard.analyzeContacts) {
      document.getElementById('CatManExportProgressLabel').value = document.getElementById('CatManExportLocaleAnalysing').value;
    } else {
      document.getElementById('CatManExportProgressLabel').value = document.getElementById('CatManExportLocaleExporting').value;
    }
  }
  
  // GUI: calculate values for next step of current process cycle
  let newProgressBarValue =  (100 * progress) / jbCatManExportWizard.size;
  let newProgressValue = progress + 1;

  // Finish current process cycle and go to next one  - or eval current step of current process cycle
  if (jbCatManExportWizard.size == progress) {
    //fnish current process cycle
    newProgressBarValue = 100;
    newProgressValue = 0;

    // Add global header to exported csv file if needed at end of analysis cycle
    if (jbCatManExportWizard.options.exportType == "csv" && jbCatManExportWizard.analyzeContacts && jbCatManExportWizard.options.fileMode == "file") {
      jbCatManExportWizard.openExportFile();
      jbCatManExportWizard.addCsvHeader();
    }

    //if analyzeContacts is true, wizard remains locked for export cycle, otherwise we are done 
    jbCatManExportWizard.wizardLocked = jbCatManExportWizard.analyzeContacts; 
    //whatever cycle currently finished, next one is not analysis
    jbCatManExportWizard.analyzeContacts = false;

  } else {

    if (jbCatManExportWizard.analyzeContacts) {
      //do actuall analysis
      jbCatManExportWizard.searchForNewProperties(jbCatManExportWizard.contactCards[progress].properties);

    } else {
      //do actuall export

      // CSV export
      if (jbCatManExportWizard.options.exportType == "csv") {
        // Add local header to exported csv file if needed
        if (jbCatManExportWizard.options.fileMode == "files") {
          jbCatManExportWizard.closeExportFile(); 
          jbCatManExportWizard.openExportFile(jbCatManExportWizard.options.fileName.replace("##NUM##",progress));
          jbCatManExportWizard.resetFoundProperties();
          jbCatManExportWizard.searchForNewProperties(jbCatManExportWizard.contactCards[progress].properties);
          jbCatManExportWizard.addCsvHeader();
        }
        // If it is file mode, the file has been opend by the global header, so no need to open it again
        jbCatManExportWizard.addCsvData(jbCatManExportWizard.contactCards[progress].properties);
      }

      if (jbCatManExportWizard.options.exportType == "vCard") {
      }
      
    }
    
  }

  //update progress bar
  progressBar.value = newProgressBarValue;

  //process next contact or close wizard on finish
  if (jbCatManExportWizard.wizardLocked) {
    //next contact
    jbCatManExportWizard.localTimeout = window.setTimeout(function() { jbCatManExportWizard.doExport(newProgressValue); }, 1);
  } else {
    //close and exit
    jbCatManExportWizard.closeExportFile(); 
    alert(document.getElementById('CatManExportLocaleDoneExport').value);
    window.close();
  }
  
}



//Init on load
window.addEventListener("load", function() { jbCatManExportWizard.Init(); }, false);
