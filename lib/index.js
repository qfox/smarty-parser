var lexer = require('./lexer');
var tokens = require('./tokens');
var Parser = require('./parser');

var engine = {
  /**
   * Parse the smarty template
   *
   * @param {string} str
   * @returns {Object}
   */
  parse : function (str) {
    debugger;
    Parser;
    return engine.parser.parse(str);
  },

  /** @type {Parser} parser instance */
  parser : Parser({ lexer : lexer, tokens : tokens }),

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
