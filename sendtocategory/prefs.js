async function setDefaultPrefs(defaultPrefs) {
  // set defaultPrefs in local storage, so we can access them from everywhere
  const prefs = Object.keys(defaultPrefs);
  for (const pref of prefs) {
      await browser.storage.local.set({ ["pref.default." + pref] : defaultPrefs[pref] });
  }

  // The following migration block can be removed, when definitly all users
  // have been migrated, or experiments are no longer allowed.
  
  // ** MIGRATION BEGIN ** //
  
  for (const pref of prefs) {
    let legacyValue = await browser.legacyprefs.get(pref, defaultPrefs[pref]);
    if (legacyValue) {
      console.log("Migrating legacy preference <" +pref + "> = <" + legacyValue + ">.");
      await browser.storage.sync.set({ ["pref.value." + pref] : legacyValue });
      await browser.legacyprefs.clear(pref);
    }
  }

  // ** MIGRATION END ** //

}

 
async function getPref(aName, aFallback = null) {
  let defaultValue = await browser.storage.local.get({ ["pref.default." + aName] : aFallback });
  let value = await browser.storage.sync.get({ ["pref.value." + aName] :  defaultValue["pref.default." + aName] });
  return value["pref.value." + aName];
}

async function setPref(aName, aValue) {
  await browser.storage.sync.set({ ["pref.value." + aName] : aValue });
}
