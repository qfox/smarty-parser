var fs = require('fs');
var inspect = require('util').inspect;

var chalk = require('chalk');

var errors = require('./errors');
var ess = require('./essentials');
var tokens = require('../tokens');
var Walker = require('./walker');

var $ = tokens.ids;
var $_ = require('./tables');

/**
 * Expose the parser constructor
 */
module.exports = Parser;

var SyntaxError = errors.SyntaxError;

function Parser(engine) {
  if (!(this instanceof Parser)) {
    return new Parser(engine);
  }

  this.lexer = engine.lexer;
  this._errors = [];

  // extends the parser with syntax files
  /*fs.readdirSync(__dirname + '/parser').forEach(function(file) {
    if (file.indexOf('.js', file.length - 3) !== -1) {
      var ext = require(__dirname + '/parser/' + file)(api, tokens, EOF);
      for(var k in ext) {
        api[k] = ext[k];
      }
    }
  });*/
};



/**
 * The basic parser api
 */
Parser.prototype = Object.create({
  // le lexer
  lexer: null,

  debug: false,

  // --- walker tokens

  /** @type {Token} - Link to the current token */
  token: null,

  /** @type {function(): this} - moves next to current */
  next: null,

  /** @type {function(): this} - moves prev to current */
  prev: null,

  /** @type {function(shift: number): Token} - look ahead for a token (if possible) */
  lookAhead: null,

  /**
   * main entry point : converts a source code to AST *
   *
   * @param {string} code
   * @returns {Document} - AST root object with inner structure
   */
  parse: function(code) {
    this.lexer.setInput(code);
    this._walker = new Walker(this);
    return this.read('document');
  },

  read: function(id) {
    if (Array.isArray(id)) {
      var res = [];
      for (var i = 0, l = id.length; i < l; i += 1) {
        res[i] = this.read(id[i]);
        if (!res[i]) return;
      }
      return res;
    }

    if (_isNumber(id)) {
      if (this.token.id !== id) this.throwError(id);
      return this.next().token.prev;
    }

    return ($_[id] || id).call(this)
      || this.throwError(id.name || id);
  },

  /**
   * Try to read tokens sequences and move pointer or reject
   *
   * @param {...Array.<number|function()>|number|function()} seq
   *   - Function, name or token id, or sequence of them to read
   * // @param {?function(tokens: Token[])} cb - handler
   * @returns {Node|Token|Array<Node|Token>|false}
   */
  try: function(seq) {
    var _this = this;
    var walker = this._walker.checkpoint();
    this._tryErrors = [];

    var one = false;
    if (!Array.isArray(seq)) {
      one = true;
      seq = [seq];
    }

    var res = [];
    for (var i = 0, l = seq.length; i < l && this.token.id !== $.EOF; i ++) {
      var id = seq[i];
      res[i] = _tryCatch(function () {
          if (_isNumber(id)) {
            return walker.token.id === id && _this.next().token.prev;
          }
          return (typeof id === 'function'? id : $_[id]).call(_this);
        }, function (e) {
          if (e instanceof SyntaxError) {
            _this._tryErrors.push(e);
            return;
          }
          throw e;
        });

      if (!res[i]) {
        res.pop();
        break;
      }
    }

    if (res.length !== seq.length) {
      walker.rollback();
      return null;
    }

    if (one) {
      res = res[0];
    }

    walker.commit();
    return res;
  },

  /** handling errors **/
  _tryErrors: null,
  throwError: function(data) {
    if (typeof data !== 'object' || Array.isArray(data)) {
      data = { expect: data };
    }

    var token = data.tokenName || _getTokenName(data.token || this.token.id);
    var msgExpect = data.expect?
      ', expecting ' + [].concat(data.expect).map(_getTokenName).join(', ')
      : '';

    var loc = data.loc?
      (data.loc.start.line + ':' + data.loc.start.column)
      : this.token.loc?
        (this.token.loc.first_line + ':' + this.token.loc.first_column)
        : '?';
    var msg = 'Unexpected "' + token + '"' + msgExpect + ' at ' + loc + ': ';

    if (this._tryErrors && this._tryErrors.length) {
      msg += '\n' + this._tryErrors.map(function (v) {
        return '  ' + v.toString().split(/\n/g).join('  \n');
      }).join('\n');
    }

    // this.trace('!!!!!!!!', msg);
    throw new SyntaxError(msg);
  },

  /** outputs some debug information on current token **/
  trace: function() {
    var stack = (new Error()).stack.split('\n');
    var tags = stack.filter(function (v) { return /Parser.module.exports./.test(v); })
      .map(function (v) { return v.replace(/.*Parser.module.exports\.([^\s]+)\s+.+/, '$1'); })
      .reverse();
    var expLocation = stack[2]
      .replace(/(module\.exports\.|Object\.create\.)/, '')
      .replace(/[^(]+\/lib\//g, './lib/')
      .trim();
    var msg = errors.explain(this.lexer.matched.split('\n'), {
        line: this.token.loc.first_line,
        column: this.token.loc.first_column,
        message: chalk.bold(_getTokenName(this.token.id)) +
          chalk.green(' "' + this.token.text.replace('"', '\\"') + '"') +
          ' ' + chalk.gray(expLocation) +
          '\n  ' + tags.join(chalk.gray(' > '))
      }, true);

    console.log.apply(console, Array.prototype.map.call(arguments, function (v) {
      return typeof v === 'string'? v : inspect(v, { colors: true, depth: 5 });
    }));
    console.log(msg);
    console.log();

    return this;
  },

  /**
   * Force to expect specified token
   *
   * @chainable
   * @param {number[]|number|string} - token id or type
   * @returns {this}
   */
  expect: function(id) {
    if (!this.is(id)) {
      this.throwError(id);
    }
    return this;
  },

  /**
   * Check if token is of specified type
   *
   * @param {number[]|number|string} - Lexem id or type
   * @returns {boolean} - Whether or not
   */
  is: function(id) {
    return this.token.id === id
      || (Array.isArray(id) && id.indexOf(this.token.id) !== -1);
        // TODO: yuppie!
        // || this.entries[token] && this.entries[token].indexOf(this.token) != -1);
  },

  /** convert an token to ast **/
  /*read_token: function() {
    var result = this.token;
    if (_isNumber(result)) {
      result = [result, this.text(), this.lexer.yylloc.first_line];
    }
    this.next();
    return result;
  },*/

  /**
   * Helper : reads a list of tokens / sample : T_STRING ',' T_STRING ...
   * <ebnf>
   * list ::= separator? ( item separator )* item
   * </ebnf>
   */
  /*read_list: function(item, separator) {
    var result = [];

    if (typeof (item) === "function") {
      do {
        result.push(item.apply(this, []));
        if (this.token !== separator) {
          break;
        }
      } while(this.next().token !== EOF);
    } else {
      result.push(this.expect(item).text());
      while (this.next().token != EOF) {
        if (this.token != separator) break;
        // trim current separator & check item
        if (this.next().token != item) break;
        result.push(this.text());
      }
    }
    return result;
  },*/

  /** New node helper */
  newNode: function(type, body) {
    Array.isArray(body) && (body = { body: body });

    var data = {};
    data.type = type;
    Object.defineProperty(data, 'loc', {
      value: _normalizeLocation(this.token.loc),
      enumerable: false,
    });

    body && Object.keys(body).forEach(function (k) {
      data[k] = body[k];
    });

    if (body.raw || type === 'Literal' || type === 'Identifier') {
      data.raw = body.raw || this.token.text;
    }

    return data;
    // return new Node(type, body, loc, token);
  },

  newNodeAndNext: function(type, body, nexts) {
    var res = this.newNode.apply(this, arguments);
    for (var i = (nexts|0) || 1; 0 < i; i -= 1) {
      this.next();
    }
    return res;
  },

  /**
   * Helper to read elements until some token
   *
   * @private
   * @param {number} lastToken
   * @returns {Element[]}
   */
  _readElementsUntil: function(lastToken) {
    var res = [];
    while (this.token.id !== tokens.ids.EOF && this.token.id !== lastToken) {
      var elem = $_.element.call(this);
      if (elem.type !== 'ClosingStatement') {
        res.push(elem);
        continue;
      }

      // Try to rework CloseStatements into block tags
      var found = false;
      for (var i = res.length - 1; i >= 0; i--) {
        if (res[i].type === 'Statement' && res[i].id === elem.id) {
          res[i].type = res[i].type === 'Statement'? 'BlockStatement' : res[i].type;
          res[i].body = res.splice(i + 1);
          found = true;
          break;
        }
      }
      if (!found) {
        throw new SyntaxError('Unpaired closing tag ' + inspect(elem));
      }
    }

    return res;
  },

  // tmp debug helper
  _readTokensUntil: function(lastToken) {
    var res = [];
    while (this.next().token.id !== tokens.ids.EOF && this.token.id !== lastToken) {
      res.push({ token: _getTokenName(this.token.id), value: this.token.text, loc: this.token.loc });
    }
    return res;
  },
}, {
  constructor: { value: Parser, enumerable: false, writable: true, configurable: true }
});

function _normalizeLocation(loc) {
  if (loc && 'first_line' in loc) {
    return new ess.SourceLocation(
      [loc.first_line, loc.first_column],
      [loc.last_line, loc.last_column]);
  }
  return new ess.SourceLocation([1, 0], [1, 0]);
}

// check if argument is a number
function _isNumber(n) {
  return n != '.' && n != ',' && !isNaN(parseFloat(n)) && isFinite(n);
}

// private helper : gets a token name
function _getTokenName(token) {
  return _isNumber(token)? tokens.names[token] : "'" + token + "'";
}

function _tryCatch(fn, cb) {
  try {
    return fn();
  } catch (e) {
    return cb(e);
  }
}
