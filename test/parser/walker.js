var Walker = require('../../lib/parser/walker');
var tokens = require('../../lib/tokens');

describe('parser/walker', function () {

  function _walker(tokens) {
    var parser = new helpers.ParserMock();
    parser.lexer.setInput(tokens);
    return new Walker(parser);
  }

  it('should initialize walker with tokens', function () {
    var walker = _walker([0x81]);
    should.exist(walker.token);
    should.exist(walker.token.prev);
    should.exist(walker.token.next);
  });

  it('should point to the first token at start', function () {
    var walker = _walker([0x81]);
    walker.token.id.should.eq(0x81, 'Current token is wrong');
    walker.token.prev.id.should.eq(tokens.ids.SOF, 'Prev token is wrong');
    walker.token.next.id.should.eq(tokens.ids.EOF, 'Next token is wrong');
  });

  it('should bind methods to parser', function () {
    var parser = _walker([0x81]).parser;
    parser.should.include.keys('token', 'next', 'prev', 'lookAhead');
    parser.token.should.include.keys('prev', 'next');
    parser.next.should.be.a('function');
    parser.prev.should.be.a('function');
    parser.lookAhead.should.be.a('function');
  });

  it('should walk thru tokens', function () {
    var walker = _walker([0x81, 0x82, 0x83, 0x84, 0x85]);
    walker.next().next().next(); // 1 → 4
    walker.token.prev.id.should.eq(0x83, 'Previous token is wrong');
    walker.token.id.should.eq(0x84, 'Current token is wrong');
    should.exist(walker.token.next);
    walker.token.next.id.should.eq(0x85, 'Next token is wrong');
  });

  it('should walk thru tokens in both ways', function () {
    var walker = _walker([0x81, 0x82, 0x83, 0x84, 0x85]);
    walker.next().next().next().prev().next().prev(); // 1 → 4 → 3 → 4 → 3
    walker.token.prev.id.should.eq(0x82, 'Previous token is wrong');
    walker.token.id.should.eq(0x83, 'Current token is wrong');
    should.exist(walker.token.next);
    walker.token.next.id.should.eq(0x84, 'Next token is wrong');
  });

  it('should not read more than need', function () {
    var walker = _walker([0x81, 0x82, 0x83]);
    var spy = sinon.spy(walker.lexer, 'lex');

    walker.next().prev().next(); // 1 → 2 → 1 → 1

    spy.should.have.been.calledOnce;

    walker.next();

    spy.should.have.been.calledTwice;

    spy.restore();
  });

  it('should preload with lookAhead', function () {
    var walker = _walker([0x81, 0x82, 0x83, 0x84, 0x85, 0x86]);
    var spy = sinon.spy(walker.lexer, 'lex');
    var token;

    token = walker.lookAhead(4); // 1 → 5
    should.exist(token);
    token.should.containSubset({ id: 0x85 });
    spy.should.have.been.calledThrice;

    spy.reset();
    walker.next().next(); // 1 → 3
    spy.should.have.not.been.called;

    token = walker.lookAhead(3); // 3 → 6
    should.exist(token);
    token.should.containSubset({ id: 0x86 });
    spy.should.have.been.calledOnce;

    spy.restore();
  });

  it('should not overlook with lookAhead', function () {
    var walker = _walker([0x81, 0x82]);
    var spy = sinon.spy(walker, '_readToken');

    var token = walker.lookAhead(10);
    spy.should.have.been.calledOnce;
    should.not.exist(token);

    spy.restore();
  });

  it('should start, rollback and end checkpoints', function () {
    var walker = _walker([0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x90]);
    walker.lookAhead(10);

    walker.next().next().next(); // 1 → 4
    walker.token.id.should.eq(0x84);

    walker.checkpoint(); // !4
    walker.next(); // 4 → 5
    walker.token.id.should.eq(0x85, '4 → 5');

    walker.checkpoint(); // !4 !5
    walker.next().next(); // 5 → 7
    walker.token.id.should.eq(0x87, '5 → 7');

    walker.rollback(); // 7 → 5, !4
    walker.token.id.should.eq(0x85, '7 → 5, !4');

    walker.next().next().next(); // 5 → 8
    walker.commit();
    walker.token.id.should.eq(0x88, '5 → 8');
  });

});
