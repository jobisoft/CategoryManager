
/*    let appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime);
       if (appInfo.OS == "Darwin") {
            let prefwindow = document.getElementById("MailPreferences");
            prefwindow.setAttribute("arch", "mac");
        }*/
	
	
function setSettingValue(setting, value) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
    prefs.setCharPref(setting, value);
}
 
function getSettingValue(setting) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
    return prefs.getCharPref(setting);
}