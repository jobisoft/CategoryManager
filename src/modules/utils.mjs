export function setEqual(xs, ys) {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}

// Set intersection for ES6 Set.
export function setIntersection(a, b) {
  return new Set([...a].filter((x) => b.has(x)));
}

async function initLog() {
  let { logToConsole } = await browser.storage.local.get( { logToConsole: null });
  // Set a default so it can be toggled via the add-on inspector storage tab.
  if (logToConsole == null) {
    logToConsole = false;
    await browser.storage.local.set( { logToConsole });
  }
  window.logToConsole = logToConsole;
  console.info(`CategoryManager.logToConsole is set to ${logToConsole}`);
}

function printLog(type, ...args) {
  if (window.logToConsole) {
    console[type](...args);
  }
}

function _printToConsole(type, ...args) {
  // This function is synchronous but returns a Promise when called the first
  // time in a given window, which fulfills once the storage has been read.
  if (!window.hasOwnProperty("logToConsole")) {
    return initLog().then(() => printLog(type, ...args));
  }
  return printLog(type, ...args);
}

export const printToConsole = {
  debug: (...args) => _printToConsole("debug", ...args),
  error: (...args) => _printToConsole("error", ...args),
  info: (...args) => _printToConsole("info", ...args),
  log: (...args) => _printToConsole("log", ...args),
  warn: (...args) => _printToConsole("warn", ...args),
}
