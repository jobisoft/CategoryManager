/*
 * This file is provided by the addon-developer-support repository at
 * https://github.com/thundernest/addon-developer-support
 *
 * This script delegates preference handling to the WebExtension background
 * page, so it is independent of the used preference storage.
 *
 * This script provides an automated preference load/save support as formaly
 * provided by the preferencesBindings.js script.
 *
 * This file is intended to be used in WebExtension HTML pages (popups,
 * options, content, windows) as well as in WindowListener legacy scripts. The
 * script communicates with the WebExtension background page either via
 * runtime messaging (if run in WebExtension pages) or via WindowListener
 * notifyTools.js (if run in legacy scripts).
 *
 * The script provides 3 main preference functions:
 *  - setPref(aName, aValue)
 *  - getPref(aName, a Fallback)
 *  - clearPref(aName)
 *
 * This script also provides an init() function which can be called during page load.
*  This will request the state of all preferences and keeps a local cache. If that cache
 * has been set up, the 3 main functions will work with this local cache and can be used
 * in synchronous code. If init() is not called, the 3 main function will make their
 * requests to the background page and will return a Promise instead of a direct value.
 *
 * The automated preference load/save support is enabled by calling the load(window)
 * function during page load.
 *
 * Version: 2.0
 *
 * Author: John Bieling (john@thunderbird.net)
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
 
var preferences = {
    _localPrefsCache: {},
    _localDefaultsCache: {},
    _localCacheInitialized: false,

    _prefElements: [],
    _preferencesLoaded: false,

    // Function to cache preferences locally to be able to use get/set/clearPref()
    // synchronously. If init() is not called, get/set/clearPref() will make
    // asynchronous requests to the background page instead using the
    // local cache.
    init: async function() {
        if (typeof messenger == "object") {
            // Request current values of all preferences.
            this._localPrefsCache = await messenger.runtime.sendMessage({
                command: "getAllPrefs"
            });
            this._localDefaultsCache = await messenger.runtime.sendMessage({
                command: "getAllDefaults"
            });
            // Register a listener for notifications from the background
            // to update a preference.
            messenger.runtime.onMessage.addListener(this._updatesFromBackground);
        } else if (typeof notifyTools == "object") {
            // Request current values of all preferences.
            this._localPrefsCache = await notifyTools.notifyBackground({
                command: "getAllPrefs"
            });
            this._localDefaultsCache = await notifyTools.notifyBackground({
                command: "getAllDefaults"
            });
            // Register a listener for notifications from the background
            // to update a preference.
            notifyTools.registerListener(this._updatesFromBackground);
        } else {
            throw new Error("notifyTools not found.");
        }
        this._localCacheInitialized = true;
        console.log(this._localPrefsCache);
    },

    _updatesFromBackground: function(info) {
        if (info.command == "setPref") {
            this._localPrefsCache[info.name] = info.value;
        }
        if (info.command == "clearPref") {
            if (this._localPrefsCache.hasOwnProperty(info.name)) {
                delete this._localPrefsCache[info.name];
            }
        }
        if (info.command == "setDefault") {
            this._localDefaultsCache[info.name] = info.value;
        }
    },

    // returns a value from the local cache if init() has been called, or a Promise
    // for the preference value otherwise
    getPref: function(aName, aFallback = null) {
        if (this._localCacheInitialized) {
            if (this._localPrefsCache.hasOwnProperty(aName)) {
                return this._localPrefsCache[aName];
            } else if (this._localDefaultsCache.hasOwnProperty(aName)) {
                return this._localDefaultsCache[aName];
            } else {
                return aFallback;
            }
        } else {
            if (typeof messenger == "object") {
                return messenger.runtime.sendMessage({
                    command: "getPref",
                    name: aName
                });
            } else if (notifyTools) {
                return notifyTools.notifyBackground({
                    command: "getPref",
                    name: aName
                });
            } else {
                throw new Error("notifyTools not found.");
            }
        }
    },

    // If init() has been called, the function returns a Promise which resolves when the value has
    // been updated in the background script, otherwise it returns immediately after updating the
    // local cache.
    setPref: function(aName, aValue) {
        let rv = null;
        // send update requests, but do not await them (fire and forget)
        if (typeof messenger == "object") {
            rv = messenger.runtime.sendMessage({
                command: "setPref",
                name: aName,
                value: aValue
            });
        } else if (notifyTools) {
            rv = notifyTools.notifyBackground({
                command: "setPref",
                name: aName,
                value: aValue
            });
        } else {
            throw new Error("notifyTools not found.");
        }

        if (this._localCacheInitialized) {
            this._localPrefsCache[aName] = aValue;
        } else {
            return rv;
        }
    },

    // If init() has been called, the function returns a Promise which resolves when the value has
    // been cleared in the background script, otherwise it returns immediately after updating the
    // local cache.
    clearPref: function(aName) {
        let rv = null;
        // send update requests, but do not await them (fire and forget)
        if (typeof messenger == "object") {
            return messenger.runtime.sendMessage({
                command: "clearPref",
                name: aName
            });
        } else if (notifyTools) {
            return notifyTools.notifyBackground({
                command: "clearPref",
                name: aName
            });
        } else {
            throw new Error("notifyTools not found.");
        }

        if (this._localCacheInitialized) {
            if (this._localPrefsCache.hasOwnProperty(aName)) {
                delete this._localPrefsCache[aName];
            }
        } else {
            return rv;
        }
    },
    
    
    
  /**
   * The following functions auto manage preferences in a document. Preference
   * elements are identified by a "preference" attribute. Most of this is taken from
   * the former preferencesBindings.js script.
   */    
    
  // Get current values from preference elements and update preferences.
  save: async function () {
    if (!this._preferencesLoaded)
      return;
    
    const elements = this._getElementsByAttribute("preference");
    for (const element of elements) {
      this._userChangedValue(element, /* instant */ true);
    }
  },

  // Load preferences into elements.
  load: async function (window) {
    this.window = window;
    
    // Gather all preference elements in this document and load their values.
    const elements = this._getElementsByAttribute("preference");
    for (const element of elements) {
      const prefName = element.getAttribute("preference");
      if (!this._prefElements.includes(prefName)) {
        this._prefElements.push(prefName);
      }
      this._updateElements(prefName);
    }
    
    this.window.addEventListener("change", preferences);
    this.window.addEventListener("command", preferences);
    this.window.addEventListener("input", preferences);
    this.window.addEventListener("select", preferences);
    
    this._preferencesLoaded = true;
  },
  
  _getElementsByAttribute: function(name, value) {
    // If we needed to defend against arbitrary values, we would escape
    // double quotes (") and escape characters (\) in them, i.e.:
    //   ${value.replace(/["\\]/g, '\\$&')}
    return value
      ? this.window.document.querySelectorAll(`[${name}="${value}"]`)
      : this.window.document.querySelectorAll(`[${name}]`);
  },
  
  _updateElements: function(prefName) {
    if (!this._prefElements.includes(prefName)) {
      return;
    }
    const elements = this._getElementsByAttribute("preference", prefName);
    for (const element of elements) {
      this._setElementValue(element);
    }
  },

  _isElementEditable: function(aElement) {
    switch (aElement.localName) {
      case "checkbox":
      case "input":
      case "radiogroup":
      case "textarea":
      case "menulist":
        return true;
    }
    return false;
  },
    
  /**
   * Initialize a UI element property with a value. Handles the case
   * where an element has not yet had a XBL binding attached for it and
   * the property setter does not yet exist by setting the same attribute
   * on the XUL element using DOM apis and assuming the element's
   * constructor or property getters appropriately handle this state.
   */
  _setValue: function(element, attribute, value) {
    if (attribute in element) {
      element[attribute] = value;
    } else if (attribute === "checked") {
      // The "checked" attribute can't simply be set to the specified value;
      // it has to be set if the value is true and removed if the value
      // is false in order to be interpreted correctly by the element.
      if (value) {
        // In theory we can set it to anything; however xbl implementation
        // of `checkbox` only works with "true".
        element.setAttribute(attribute, "true");
      } else {
        element.removeAttribute(attribute);
      }
    } else {
      element.setAttribute(attribute, value);
    }
  },

  _setElementValue: function(aElement) {
    if (aElement.hasAttribute("preference")) {
      if (!this._isElementEditable(aElement)) {
        return;
      }

      const val = this.getPref(aElement.getAttribute("preference"));    
      if (aElement.localName == "checkbox") {
        this._setValue(aElement, "checked", val);
      } else {
        this._setValue(aElement, "value", val);
      }
    }
  },

  /**
   * Read the value of an attribute from an element, assuming the
   * attribute is a property on the element's node API. If the property
   * is not present in the API, then assume its value is contained in
   * an attribute, as is the case before a binding has been attached.
   */
  _getValue: function(element, attribute) {
    if (attribute in element) {
      return element[attribute];
    }
    return element.getAttribute(attribute);
  },

  _getElementValue: function (aElement) {
    let value;
    if (aElement.hasAttribute("preference")) {
      if (aElement.localName == "checkbox") {
        value = this._getValue(aElement, "checked");
      } else {
        value = this._getValue(aElement, "value");
      }

      // Convert the value into the required type.
      switch (typeof this.getPref(aElement.getAttribute("preference"))) {
        case "number":
          return parseInt(value, 10) || 0;
        case "boolean":
          return typeof value == "boolean" ? value : value == "true";
      }
    }
    return value;
  },
  
  
  
  // Take care of instant apply.
  handleEvent: function(event) {
    switch (event.type) {
      case "change":
      case "select":
        return this._onChange(event);
      case "command":
        return this._onCommand(event);
      case "input":
        return this._onInput(event);
      default:
        return undefined;
    }
  },

  _getPreferenceElement: function(aStartElement) {
    let temp = aStartElement;
    while (
      temp &&
      temp.nodeType == Node.ELEMENT_NODE &&
      !temp.hasAttribute("preference")
    ) {
      temp = temp.parentNode;
    }
    return temp && temp.nodeType == Node.ELEMENT_NODE ? temp : aStartElement;
  },

  
  _userChangedValue: function(aElement, instant) {
    const element = this._getPreferenceElement(aElement);
    if (element.hasAttribute("instantApply") &&  element.getAttribute("instantApply").toLowerCase() == "false")
      return;
    
    if (!element.hasAttribute("preference") || this.getPref(element.getAttribute("preference")) == this._getElementValue(element))
      return;
    
    if (instant || element.getAttribute("delayprefsave") != "true") {
      // Update value directly.
      this.setPref(element.getAttribute("preference"), this._getElementValue(element));
    } else {
      if (element._deferredValueUpdateTimout) {
        this.window.clearTimeout(element._deferredValueUpdateTimout);
      }
      element._deferredValueUpdateTimout = this.window.setTimeout(this.setPref.bind(this), 1000, element.getAttribute("preference"), this._getElementValue(element));
    }
  },

  _onCommand: function(event) {
    // This "command" event handler tracks changes made to preferences by
    // the user in this window.
    if (event.sourceEvent) {
      event = event.sourceEvent;
    }
    this._userChangedValue(event.target);
  },

  _onChange: function(event) {
    // This "change" event handler tracks changes made to preferences by
    // the user in this window.
    this._userChangedValue(event.target);
  },

  _onInput: function(event) {
    // This "input" event handler tracks changes made to preferences by
    // the user in this window.
    this._userChangedValue(event.target);
  },
  
}