var path = require('path');

var fs = require('graceful-fs');
var PluginError = require('gulp-util/lib/PluginError');

module.exports = {
  trycatch : trycatch,
  createError : createError,
  applyImports : applyImports,
  fetchTokens : fetchTokens,
  cleanupTokens : cleanupTokens,

  PluginError : PluginError,
};

/**
 * Error object factory
 *
 * @param {Object} file
 * @param {Error} err
 * @returns {PluginError}
 */
function createError(pluginName, file, err) {
  if (typeof err === 'string') {
    return new PluginError(pluginName, file.path + ': ' + err, {
      fileName: file.path,
      showStack: false
    });
  }

  var msg = err.message || err.msg || /* istanbul ignore next */ 'unspecified error';

  return new PluginError(pluginName, file.path + ': ' + msg, {
    fileName: file.path,
    lineNumber: err.line,
    stack: err.stack,
    showStack: false
  });
}

/**
 * Isolated unoptimizable try-catch block
 *
 * @param {function()} fn
 * @param {function(Error)} errorHandler
 * @return {*}
 */
function trycatch(fn, errorHandler) {
  try {
    return fn();
  } catch (e) {
    return errorHandler(e);
  }
}

/**
 * @const
 * @type {RegExp}
 */
var IMPORT_RE = /^%import\s+'([A-Za-z0-9\-_\.\\\/]*)'\s*(\s*\/\/.*)?$/mg;

/**
 * [import description]
 *
 * @param {Object} file
 * @returns {}
 */
function applyImports(file, cb) {
  var buffer = String(file.contents);
  var fileDir = path.dirname(file.path);

  // reading imports
  IMPORT_RE.lastIndex = 0;
  match = IMPORT_RE.exec(buffer);
  files = [];
  while (match !== null) {
    files.push(match[1]);
    match = IMPORT_RE.exec(buffer);
  }

  var imports = files.reduce(function (res, importingFile) {
      res[importingFile] = fs.readFileSync(path.resolve(fileDir, importingFile), file.encoding);
      return res;
    }, {});

  cb(null, buffer.replace(
    IMPORT_RE,
    function (match, file) {
      return '// %imported ' + file + '\n' + imports[file];
    }));
}

/** @type {RegExp} */
var TOKEN_RE = /%token\s([A-Z_0-9]+)/gi;

/**
 * Fetch tokens from sources
 *
 * @param {string} content
 * @returns {Object}
 */
function fetchTokens(content) {
  return content.match(TOKEN_RE)
    .reduce(function (tokens, tokenLine, i) {
      var token = tokenLine.slice(6).trim();
      tokens[token] = i + 0x80;
      return tokens;
    }, {'EOF': 1, 'ERROR': 2, 'SOF': 3});
}

function cleanupTokens(content) {
  return content.replace(TOKEN_RE, function (m) {
      return '// ' + m;
    });
}
