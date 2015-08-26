var colors = require('mocha/lib/reporters/base').colors;
colors['diff added'] = '38;5;78';
colors['diff removed'] = '38;5;94';
// colors['diff added'] = '1;32';
// colors['diff removed'] = '1;31';
// colors['diff added'] = '30;42';
// colors['diff removed'] = '30;41';

var smarty = global.smarty = require('../');
var chai = global.chai = require('chai');
var sinon = global.sinon = require('sinon');

chai.use(require('chai-subset'));
chai.use(require('sinon-chai'));

global.expect = chai.expect();
global.should = chai.should();

chai.config.showDiff = true;
chai.config.includeStack = true;
chai.config.truncateThreshold = 90;

global.helpers = {
  ParserMock: ParserMock,
  LexerMock: LexerMock,
};

function ParserMock() {
  this.lexer = new LexerMock();
}

function LexerMock() {
  var queue;
  this.setInput = function (tokens) {
    queue = tokens.map(function(v) { return v; }).reverse();
  };
  this.lex = function () {
    var res = queue.pop() || null;
    this.yytext = res + ':text';
    return res;
  };
}
