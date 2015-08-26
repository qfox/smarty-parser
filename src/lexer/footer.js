// escapes chars
function _scanEscapeString(str) {
  return str;
}

// consume the specified length on the lexer
lexer._consume = function(size) {
  if (size < 1) return false;
  var ch, i;

  // counting lines
  for (i = 0; i < size; i += 1) {
    ch = this._input[i];
    if (ch === '\n' || ch === '\r') {
      this.yylineno += 1;
      this.yylloc.last_line += 1;
      this.yylloc.last_column = 0;
      if (ch === '\r' && this._input[i + 1] === '\n') {
        i += 1; // windows style
      }
    } else {
      this.yylloc.last_column++;
    }
  }

  // update offsets
  if (this.options.ranges) {
    this.yylloc.range[1] += size;
  }
  this.yyleng += size;
  this.offset += size;

  // update texts
  ch = this._input.substring(0, size);
  this.yytext += ch;
  this.match += ch;
  this.matched += ch;

  this._input = this._input.slice(size);

  if (process.env.DEBUG)
    console.log({input: this._input, size: size });

  return ch;
};

lexer.hasAutoLiteral = function () {
    return false;
};

// defines if all tokens must be retrieved (used by token_get_all only)
lexer.all_tokens = true;

// change lexer algorithm
var lex = lexer.lex;
lexer.lex = function() {
  var token = lex.call(this);

  if (process.env.DEBUG) {
    console.log('LEX', this.showPosition());
    process.env.DEBUG === '2' && (console.log({
      token: token,
      match: this.match,
      matched: this.matched,
      yytext: this.yytext
    }));
  }

  return token;
};

// fix of input algorithm @see https://github.com/zaach/jison-lex/pull/10
lexer.input = function () {
  var ch = this._input[0];
  if ( ch == '\r' && this._input[1] == '\n' ) {
    ch += '\n';
    this.yyleng++;
    this.offset++;
    this._input = this._input.slice(1);
    if (this.options.ranges) {
      this.yylloc.range[1]++;
    }
  }
  this.yytext += ch;
  this.yyleng++;
  this.offset++;
  this.match += ch;
  this.matched += ch;
  var lines = ch.match(/(?:\r\n?|\n).*/g);
  if (lines) {
    this.yylineno++;
    this.yylloc.last_line++;
  } else {
    this.yylloc.last_column++;
  }
  if (this.options.ranges) {
    this.yylloc.range[1]++;
  }

  this._input = this._input.slice(1);
  return ch;
};

// FORCE TO CHANGE THE INITIAL STATE IN EVAL MODE
var setInput = lexer.setInput;
lexer.setInput = function (input, yy) {
  setInput.call(this, input, yy);
  /*if (
    !this.all_tokens && this.mode_eval
  ) {
    this.conditionStack = ['ST_IN_TAG'];
  }*/
};

var showPosition = lexer.showPosition;
lexer.showPosition = function () {
  return 'Stack: ' + this.conditionStack.join(' > ') + '\n' +
    showPosition.apply(this, arguments);
};

module.exports = lexer;
