var lexer = require('./lexer');
var tokens = require('./tokens');
var Parser = require('./parser');
var errors = require('./parser/errors');

var engine = {
  /**
   * Parse the smarty template
   *
   * @param {string} str
   * @returns {Object}
   */
  parse : function (str) {
    try {
      return engine.parser.parse(str);
    } catch (e) {
      if (!(e instanceof errors.SyntaxError)) {
        throw e;
      }
      var pos = (e.parent || e).loc.start;
      e.line = pos.line;
      e.column = pos.column;
      console.log(errors.explain(str, e));
      return { error: e };
    }
  },

  /** @type {Parser} parser instance */
  parser : Parser({ lexer : lexer }),

  /**
   * Expose Parser builder
   *
   * @type {function({ lexer: Lexer, tokens: Object }): Parser}
   */
  Parser : Parser,

  /** @type {Lexer} lexer instance */
  lexer : lexer,

  /** @type {Object} tokens dictionary */
  tokens : tokens
};

module.exports = engine;
