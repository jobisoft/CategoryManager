//create CatManPref namespace
var jbCatManPref = {};
	
/*    let appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
       if (appInfo.OS == "Darwin") {
            let prefwindow = document.getElementById("MailPreferences");
            prefwindow.setAttribute("arch", "mac");
        }*/
	
jbCatManPref.setSettingValue = function (setting, value) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
    prefs.setCharPref(setting, value);
}
 
jbCatManPref.getSettingValue = function (setting) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
    return prefs.getCharPref(setting);
}