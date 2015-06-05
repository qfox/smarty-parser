var through = require('through2');

var U = require('./util.js');

var PLUGIN_NAME = 'gulp-jison-prepare-lexer';

function setup(opts) {
  return opts;
}

module.exports = function (opts) {
  return through.obj(lexer);

  function lexer(file, encoding, cb) {
    var options = setup(opts || {});

    // skip empty
    if (file.isNull()) {
      return cb(null, file);
    }

    // fail on non-streams
    if (file.isStream()) {
      return cb(U.createError(PLUGIN_NAME, file, 'Streaming not supported'));
    }

    U.applyImports({
      path : file.path,
      contents : String(file.contents),
      encoding : encoding,

    }, function (err, buffer) {
      if (err !== null) {
        return cb(err);
      }

      file.contents = new Buffer(buffer);

      cb(null, file);
    });
  }
};
