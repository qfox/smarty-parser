var Walker = require('../../lib/parser/walker');
var tokens = require('../../lib/tokens');
var $ = tokens.ids;

describe('parser', function () {

  function _parser(tokens) {
    var parser = new smarty.Parser({ lexer: new helpers.LexerMock() });
    parser.lexer.setInput(tokens);
    parser._walker = new Walker(parser);
    return parser;
  }

  describe('.read', function () {
    before(function () {
      tokens.names[101] = 'Odin';
      tokens.names[102] = 'Dva';
      tokens.names[103] = 'Tri';
      tokens.names[104] = 'Chetyre';
    });

    it('should fetch nodes one by one by id', function () {
      var parser = _parser([101, 102, 103]);
      parser.read(101).id.should.eq(101);
      parser.read(102).id.should.eq(102);
      parser.read(103).id.should.eq(103);
    });

    it('should fetch nodes by array id', function () {
      var fixture = [101, 102, 103];
      var parser = _parser(fixture);
      var res = parser.read(fixture);
      res.should.be.an('array')
        .and.containSubset(fixture.map(function (id) { return { id: id }; }));
    });

    it('should throw on wrong node by id', function () {
      var parser = _parser([101]);
      should.throw(function () {
        parser.read(102);
      }, /Unexpected "Odin", expecting Dva/);
    });

    it('should throw on wrong nodes array by id', function () {
      var parser = _parser([101, 102]);
      should.throw(function () {
        parser.read([101, 102, 103, 104]);
      }, /Unexpected "<eof>", expecting Tri/);
    });

    it('should fetch nodes one by one by name', function () {
      var parser = _parser([$.TP_TEXT, $.TP_COMMENT, $.TP_TEXT]);
      parser.read('text').should.containSubset({ value: $.TP_TEXT + ':text' });
      parser.read('comment').should.containSubset({ value: $.TP_COMMENT + ':text' });
      parser.read('text').should.containSubset({ value: $.TP_TEXT + ':text' });
    });

    it('should fetch nodes by names array', function () {
      var fixture = [$.TP_TEXT, $.TP_COMMENT, $.TP_TEXT];
      var parser = _parser(fixture);
      var res = parser.read(['text', 'comment', 'text']);
      res.should.be.an('array')
        .and.containSubset(fixture.map(function (id) {
          return { value: id + ':text' };
        }));
    });
  });

  describe('.try', function () {
    var parser, firstToken;

    beforeEach(function () {
      fixture = [$.TP_TEXT, $.TP_COMMENT, $.TP_TEXT, $.TP_COMMENT];
      parser = _parser(fixture);
      firstToken = parser.token;
    });

    it('should fetch token by id', function () {
      parser.try($.TP_TEXT).should.containSubset({ id: $.TP_TEXT });
      firstToken.next.should.eq(parser.token);
    });

    it('should fetch token sequence by ids', function () {
      parser.try([$.TP_TEXT, $.TP_COMMENT])
        .should.containSubset([
          { id: $.TP_TEXT },
          { id: $.TP_COMMENT },
        ]);
      firstToken.next.next.should.eq(parser.token);
    });

    it('should not fetch token by wrong id', function () {
      should.not.exist(parser.try($.TP_COMMENT));
    });

    it('should not fetch tokens by wrong id sequence', function () {
      should.not.exist(parser.try([$.TP_COMMENT, $.TP_TEXT]));
    });

    it('should fetch node', function () {
      parser.try('text').should.containSubset({ value: $.TP_TEXT + ':text' });
      firstToken.next.should.eq(parser.token);
    });

    it('should fetch sequence of nodes', function () {
      parser.next().try(['comment', 'text'])
        .should.containSubset([
          { value: $.TP_COMMENT + ':text' },
          { value: $.TP_TEXT + ':text' },
        ]);
      firstToken.next.next.next.should.eq(parser.token);
    });

    it('should not fetch node', function () {
      should.not.exist(parser.try('comment'));
      firstToken.should.eq(parser.token);
    });

    it('should not fetch sequence', function () {
      should.not.exist(parser.try(['comment', 'text']));
      firstToken.should.eq(parser.token);
    });
  });

});
