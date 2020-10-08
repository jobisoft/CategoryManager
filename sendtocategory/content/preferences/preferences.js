var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript("chrome://sendtocategory/content/scripts/i18n.js");

Preferences.addAll([
	{ id: "extensions.sendtocategory.to_address", type: "unichar" },
]);
	
function init() {
  i18n.updateDocument({ extension: window.arguments[0].extension });
}
