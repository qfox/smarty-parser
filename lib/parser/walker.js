var tokens = require('../tokens');

module.exports = Walker;
module.exports.Token = Token;

/**
 * Token walker class
 *
 * @param {Parser} parser - Parser instance that walkers binds to
 */
function Walker(parser) {
  this._queue = [];
  this._checkpoints = [];

  this.parser = parser;
  this.lexer = parser.lexer;

  this._queue.push(new Token(tokens.ids.SOF));
  this._length += 1;
  this._position = 1; // point to current
  this._readToken(); // load current
  this._readToken(); // precache next
  this._updateRefs(); // fill up links

  var _this = this;
  this.parser.next = function() { _this.next(); return this; };
  this.parser.prev = function() { _this.prev(); return this; };
  this.parser.lookAhead = function() { return _this.lookAhead(); };
}

Walker.prototype = Object.create({
  /** @type {Array} - All collected tokens */
  _queue: null,

  /** @type {number} - Current queue length */
  _length: 0,

  /** @type {number} - Token position */
  _position: 0,

  /**
   * Read next token and meta data into the object
   *
   * @returns {Token} - returns token data
   */
  _readToken: function() {
    var q = this._queue;
    var t = new Token(this.lexer.lex() || tokens.ids.EOF, this.lexer.yytext, this.lexer.yylloc);
    var pt = q[q.length - 1];
    q.push(t);
    t.prev = pt;
    pt.next = t;
    this._length += 1;
    return t;
  },

  /** Update prev/cur/next tokens */
  _updateRefs: function() {
    this.token = this.parser.token = this._queue[this._position];
  },

  /** consume the next token **/
  next: function() {
    if (this._position >= this._length - 1) {
      throw new Error('EOF');
    }

    this._position += 1;

    if (this._position >= this._length - 1
      && this.token.next && this.token.next.id !== tokens.ids.EOF) {
      this._readToken();
    }

    this._updateRefs();

    return this;
  },

  prev: function() {
    if (this._position <= 0) {
      throw new Error('I\'m sorry, I can\'t look to the void.');
    }

    this._position -= 1;

    this._updateRefs();

    return this;
  },

  lookAhead: function(i) {
    // dont need to make magic
    var t = this._queue[this._position + i];
    if (t) return t;

    var q = this._queue,
      l = - this._length + 1 + this._position + i;

    t = q[q.length - 1];
    // preload tokens
    for (var j = 0; j < l; j += 1) {
      if (t.id === tokens.ids.EOF) break;
      t = this._readToken();
    }
    return this._queue[this._position + i];
  },

  // checkpoints
  _checkpoints: null,
  checkpoint: function() {
    this._checkpoints.push(this._position);
    return this;
  },
  rollback: function() {
    this._position = this._checkpoints.pop() || this._position;
    this._updateRefs();
    return this;
  },
  commit: function() {
    this._checkpoints.pop();
    return this;
  },

}, {
  constructor: { value: Walker, enumerable: false, writable: true, configurable: true }
});

function Token(id, text, loc) {
  this.id = id;
  this.text = text;
  if (loc) this.loc = loc;
}
Token.prototype.id = null;
Token.prototype.text = null;
Token.prototype.prev = null;
Token.prototype.next = null;
Token.prototype.toString = function () {
  return '[Token: ' +
    this.id +
    ' ' + tokens.names[this.id] +
    ' ' + '"' + this.text + '"' +
    ']';
};
Token.prototype.inspect = function (depth, opts) {
  if (!opts || !opts.stylize) return this.toString();
  return opts.stylize('[Token: ', 'special') +
    opts.stylize(this.id, 'number') +
    ' ' + tokens.names[this.id] +
    ' ' + opts.stylize('"' + this.text + '"', 'string') +
    opts.stylize(']', 'special');
};
