var path = require('path');
var util = require('util');

var fs = require('graceful-fs');
var through = require('through2');

var U = require('./util.js');

var PLUGIN_NAME = 'gulp-jison-compile-tokens';

function setup(opts) {
  return opts;
}

module.exports = function(opts) {
  return through.obj(tokens);

  function tokens(file, encoding, cb) {
    var options = setup(opts || {});

    // skip empty
    if (file.isNull()) {
      return cb(null, file);
    }

    // fail on streams
    if (file.isStream()) {
      return cb(U.createError(PLUGIN_NAME, file, 'Streaming not supported'));
    }

    var res = U.trycatch(function () {
      var buffer = String(file.contents);
      var tokens = U.fetchTokens(buffer);
      var _keys = Object.keys(tokens);

      if (options.asVars) {
        return 'var ' +
          _keys.map(function (token) {
            return token + ' = ' + tokens[token];
          }).join(',\n    ') +
          ';\n';
      }

      var reversed = Object.keys(tokens).reduce(function (res, token) {
          res[tokens[token]] = token;
          return res;
        }, {});

      return [
          '// exports token index',
          'module.exports = ' + util.inspect({values : reversed, names : tokens}, {depth : null}) + ';\n'
        ].join('\n');
    }, U.createError.bind(null, PLUGIN_NAME, file));

    if (res instanceof U.PluginError) {
      return cb(res);
    }

    file.contents = new Buffer(res);

    cb(null, file);
  }
};
