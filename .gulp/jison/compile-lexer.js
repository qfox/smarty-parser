var through = require('through2');

var U = require('./util.js');

// var jison = require('jison');
var Lexer = require('jison-lex');
var LexerParser = require('lex-parser');

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

    var res = U.trycatch(function () {
      var buffer = U.cleanupTokens(String(file.contents));

      // parse grammar
      var lexerGrammar = LexerParser.parse(buffer);
      if (!lexerGrammar.options) {
        lexerGrammar.options = {};
      }
      lexerGrammar.options.moduleName = 'lexer'; // used exported variable
      lexerGrammar.options.moduleType = 'js';

      // var tokens = U.fetchTokens(res);

      return Lexer.generate(lexerGrammar);
    }, U.createError.bind(null, PLUGIN_NAME, file));

    if (res instanceof U.PluginError) {
      return cb(res);
    }

    file.contents = new Buffer(res);

    cb(null, file);
  }
};
