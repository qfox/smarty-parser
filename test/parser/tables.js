var _parse = smarty.parse;
function parse(str) {
  return _parse(str).body;
}

describe('parser/tables', function () {

  describe('document', function () {
    it.skip('should return empty Document node');

    it('should return empty Document node with location', function () {
      _parse('', { locations: true })
        .should.containSubset({
          type: 'Document',
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column : 0 } },
          body: [],
        });
    });
  });

  describe('texts and comments', function () {
    it('should fetch empty js', function () {
      parse('{}').should.containSubset([{ type: 'Literal', value: '{}' }]);
    });

    it('should fetch comments', function () {
      parse('{* foo *}').should.containSubset([{ type: 'Comment', value: '{* foo *}' }]);
    });

    it('should fetch plain text', function () {
      parse('foo bar').should.containSubset([{ type: 'Literal', value: 'foo bar' }]);
    });

    it('should fetch text with comments outside', function () {
      parse('{* comment *} foo bar {* comment *}')
        .should.containSubset([
          { type: 'Comment', value: '{* comment *}' },
          { type: 'Literal', value: ' foo bar ' },
          { type: 'Comment', value: '{* comment *}' },
        ]);
    });

    it('should fetch text with comment inside', function () {
      parse('foo {* comment *} bar')
        .should.containSubset([
          { type: 'Literal', value: 'foo ' },
          { type: 'Comment', value: '{* comment *}' },
          { type: 'Literal', value: ' bar' },
        ]);
    });

    it('should store all whitespace characters around tags', function () {
      parse('a\n  {**}\n  c\n\t{**}\ne\n')
        .should.containSubset([
          { type: 'Literal', value: 'a\n  ' },
          { type: 'Comment', value: '{**}' },
          { type: 'Literal', value: '\n  c\n\t' },
          { type: 'Comment', value: '{**}' },
          { type: 'Literal', value: '\ne\n' },
        ]);
    });
  });

  describe('strings (singlequoted)', function () {
    it('should parse empty string', function () {
      parse('{\'\'}')
        .should.containSubset([
          { type: 'EchoStatement', value: { type: 'Literal', value: '' } }
        ]);
    });

    it('should parse empty string', function () {
      parse('{\'b\'}')
        .should.containSubset([
          { type: 'EchoStatement', value: { type: 'Literal', value: 'b' } }
        ]);
    });

    it('should parse escaped string', function () {
      parse('{\'\\1\\t\'}')
        .should.containSubset([
          { type: 'EchoStatement', value: { type: 'Literal', value: '\1\t' } }
        ]);
    });
  });

  describe('template strings (doublequoted)', function () {
    it('should parse empty', function () {
      var res = parse('{""}');
      res.should.be.an('array');
      res[0].should.include.keys('value');
      res[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: '', tail: true }
          ] });
    });

    it('should parse usual characters in string', function () {
      parse('{"a"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: 'a', tail: true }
          ] }
        );
    });

    it('should parse escaped entities in string', function () {
      parse('{"\\1\\t"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: '\1\t', tail: true }
          ] }
        );
    });

    it('should parse pure variable in string', function () {
      parse('{"$var"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: '', tail: false },
            { type: 'TemplateElement', value: '', tail: true },
          ], expressions: [
            { type: 'Identifier', name: 'var' },
          ] }
        );
    });

    it('should parse mixed texts with variables', function () {
      parse('{"foo $var bar"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: 'foo ', tail: false },
            { type: 'TemplateElement', value: ' bar', tail: true },
          ], expressions: [
            { type: 'Identifier', name: 'var' },
          ] }
        );
    });

    it('should parse mixed texts with variables: inverse', function () {
      parse('{"$foo bar $baz"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: '', tail: false },
            { type: 'TemplateElement', value: ' bar ', tail: false },
            { type: 'TemplateElement', value: '', tail: true },
          ], expressions: [
            { type: 'Identifier', name: 'foo' },
            { type: 'Identifier', name: 'baz' },
          ] }
        );
    });

    it('should parse backticked expressions with variables', function () {
      parse('{"`$foo`"}')[0].value
        .should.containSubset(
          { type: 'TemplateLiteral', quasis: [
            { type: 'TemplateElement', value: '', tail: false },
            { type: 'TemplateElement', value: '', tail: true },
          ], expressions: [
            { type: 'Identifier', name: 'foo' },
          ] }
        );
    });
  });

  describe('variables in tags', function () {
    it('should parse simple variable', function () {
      parse('{$d}')[0].value
        .should.containSubset({ type: 'Identifier', name: 'd' });
    });

    it('should parse members', function () {
      parse('{$a.b}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'a' },
          property: { type: 'Literal', value: 'b' }
        });
    });

    it('should parse variable members', function () {
      parse('{$a.$c}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'a' },
          property: { type: 'Identifier', name: 'c' }
        });
    });

    it('should parse deep simple and variable members', function () {
      parse('{$a.b.$c.d}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'a' },
              property: { type: 'Literal', value: 'b' },
            },
            property: { type: 'Identifier', name: 'c' }
          },
          property: { type: 'Literal', value: 'd' }
        });
    });

    it('should parse members with numerics', function () {
      parse('{$a.b.1.$c.d.0}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: {
                type: 'MemberExpression',
                object: {
                  type: 'MemberExpression',
                  object: { type: 'Identifier', name: 'a' },
                  property: { type: 'Literal', value: 'b' },
                },
                property: { type: 'Literal', value: 1 },
              },
              property: { type: 'Identifier', name: 'c' }
            },
            property: { type: 'Literal', value: 'd' },
          },
          property: { type: 'Literal', value: 0 }
        });
    });

    it('should parse computed numeric members', function () {
      parse('{$a[0]}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          computed: true,
          object: { type: 'Identifier', name: 'a' },
          property: { type: 'Literal', value: 0 }
        });
    });

    it('should parse deep computed numeric members', function () {
      parse('{$a[0][1][2].b}')[0].value
        .should.containSubset({
          object: {
            object: {
              object: {
                object: { name: 'a' },
                property: { value: 0 }
              },
              property: { value: 1 }
            },
            property: { value: 2 }
          },
          property: { value: 'b' }
        });
    });

    it('should parse computed variables members', function () {
      parse('{$a.b[$c]}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          computed: true,
          object: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'a' },
            property: { type: 'Literal', value: 'b' },
          },
          property: { type: 'Identifier', name: 'c' }
        });
    });

    it('should parse member of computed variable', function () {
      parse('{$a[0].c[1]}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          object: {
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'a' },
              property: { type: 'Literal', value: 0 },
              computed: true,
            },
            property: { type: 'Literal', value: 'c' },
          },
          property: { type: 'Literal', value: 1 },
          computed: true,
        });
    });
  });

  describe('modifiers', function () {
    it('should parse mods', function () {
      parse('{$a|mod}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'mod' },
          arguments: [ { type: 'Identifier', name: 'a' } ],
          modifier: true,
        });
    });

    it('should parse mods with array params', function () {
      parse('{"a"|mod1:[1, 11]}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'mod1' },
          arguments: [
            { type: 'TemplateLiteral', quasis: [ { value: 'a' } ] },
            { type: 'ArrayExpression', elements: [
              { type: 'Literal', value: 1 },
              { type: 'Literal', value: 11 },
            ] }
          ],
          modifier: true,
        });
    });

    it('should parse mods with params', function () {
      parse('{"a"|mod1:\'x\':2}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'mod1' },
          arguments: [
            { type: 'TemplateLiteral', quasis: [ { value: 'a' } ] },
            { type: 'Literal', value: 'x' },
            { type: 'Literal', value: 2 },
          ],
          modifier: true,
        });
    });

    it('should parse chained mods', function () {
      parse('{0|@mod1|mod2}')[0].value
        .should.containSubset({
          callee: { type: 'Identifier', name: 'mod2' },
          arguments: [ {
            callee: { type: 'Identifier', name: 'mod1' },
            at: true,
            arguments: [ { value: 0 } ],
          } ]
        });
    });

    it('should parse chained mods with params', function () {
      parse('{\'a\'|mod1:1|@mod2:2}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'mod2' },
          at: true,
          arguments: [
            {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'mod1' },
              at: false,
              arguments: [
                { type: 'Literal', value: 'a' },
                { type: 'Literal', value: 1 }
              ],
              modifier: true,
            },
            { type: 'Literal', value: 2 }
          ],
          modifier: true,
        });
    });

    it('should parse mods with members', function () {
      parse('{$a.b|mod1:$c.d|mod2:$e.f}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'mod2' },
          arguments: [
            {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'mod1' },
              arguments: [
                { type: 'MemberExpression', object: { name: 'a' }, property: { value : 'b' } },
                { type: 'MemberExpression', object: { name: 'c' }, property: { value : 'd' } },
              ],
              modifier: true,
            },
            { type: 'MemberExpression', object: { name: 'e' }, property: { value : 'f' } },
          ],
          modifier: true,
        });
    });
  });

  describe('object access', function () {
    it('should parse object access', function () {
      parse('{$a->b}')[0].value
        .should.containSubset({
          type: 'MemberExpression',
          object: { name: 'a' },
          property: { value : 'b' },
          pointer: true,
        });
    });

    it('should parse usual member expression inside object access', function () {
      parse('{$a->b.c}')[0].value
        .should.containSubset({
          object: {
            object: { name: 'a', },
            property: { value : 'b', },
            pointer: true,
          },
          property: { value : 'c' },
          pointer: false,
        });
    });

    it('should parse object access inside member expression', function () {
      parse('{$a.b->c}')[0].value
        .should.containSubset({
          object: {
            object: { name: 'a' },
            property: { value : 'b' },
            pointer: false,
          },
          property: { value: 'c' },
          pointer: true,
        });
    });

    it('should parse object with computed member', function () {
      parse('{$a->b[0]}')[0].value
        .should.containSubset({
          object: {
            object: { name: 'a' },
            property: { value: 'b' },
            pointer: true,
          },
          property: { value: 0 },
          computed: true,
        });
    });

    it('should parse mixed object with computed after usual member', function () {
      parse('{$a->b[0].c}')[0].value
        .should.containSubset({
          object: {
            object: {
              object: { name: 'a' },
              property: { value: 'b' },
              pointer: true,
            },
            property: { value: 0 },
            computed: true,
          },
          property: { value: 'c' },
        });
    });

    it('should parse mixed object with usual and computed member', function () {
      parse('{$a->b.c[0]}')[0].value
        .should.containSubset({
          object: {
            object: {
              object: { name: 'a' },
              property: { value: 'b' },
              pointer: true,
            },
            property: { value: 'c' },
          },
          property: { value: 0 },
          computed: true,
        });
    });

    it('should parse mixed object and array properties', function () {
      parse('{$a->b.c[0]->d[1].e}')[0].value
        .should.containSubset({
          object: {
            object: {
              object: {
                object: {
                  object: {
                    object: { name: 'a' },
                    property: { value: 'b' },
                    pointer: true,
                  },
                  property: { value: 'c' },
                },
                property: { value: 0 },
                computed: true,
              },
              property: { value: 'd' },
              pointer: true,
            },
            property: { value: 1 },
            computed: true,
          },
          property: { value: 'e' },
        });
    });
  });

  describe('calls', function () {
    it('should parse call expressions for variable', function () {
      parse('{$a(1)}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { name: 'a' },
          arguments: [ { value: 1 } ],
        });
    });

    it('should parse call expressions for member', function () {
      parse('{$a.$b(1)}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { name: 'a' },
            property: { name: 'b' },
          },
          arguments: [ { value: 1 } ]
        });
    });

    it('should parse call expressions for object properties', function () {
      parse('{$a->b(1)}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: {
            object: { name: 'a' },
            property: { value: 'b' },
            pointer: true,
          },
          arguments: [ { value: 1 } ]
        });
    });

    it('should parse call expressions for object properties of members', function () {
      parse('{$a->b.c->d($g, 1, $h)}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: {
            object: {
              object: {
                object: { name: 'a' },
                property: { value: 'b' },
                pointer: true,
              },
              property: { value: 'c' },
            },
            property: { value: 'd' },
            pointer: true
          },
          arguments: [ { name: 'g' }, { value: 1 }, { name: 'h' } ]
        });
    });

    it('should parse call expressions with mods', function () {
      parse('{$a->b(1)|mod}')[0].value
        .should.containSubset({
          type: 'CallExpression',
          callee: { name: 'mod' },
          arguments: [{
            type: 'CallExpression',
            callee: {
              type: 'MemberExpression',
              object: { name: 'a' },
              property: { value: 'b' },
              pointer: true,
            },
            arguments: [{ value: 1 }],
          }]
        });
    });

    it('should parse binary expression', function () {
      parse('{$a+$b}')[0].value
        .should.containSubset({
          type: 'BinaryExpression',
          operator: '+',
          left: { name: 'a' },
          right: { name: 'b' },
        });
    });

    it('should parse binary expression of members', function () {
      parse('{$a.b + $c[0]}')[0].value
        .should.containSubset({
          type: 'BinaryExpression',
          operator: '+',
          left: { object: { name: 'a' }, property: { value: 'b' } },
          right: { object: { name: 'c' }, property: { value: 0 }, computed: true },
        });
    });

    it('should parse binary expression of members', function () {
      parse('{$a->b + 0}')[0].value
        .should.containSubset({
          type: 'BinaryExpression',
          operator: '+',
          left: { object: { name: 'a' }, property: { value: 'b' }, pointer: true },
          right: { value: 0 },
        });
    });
  });

  describe('tag assignments', function () {
    it('should assign singlequoted string', function () {
      parse('{$a=\'A\'}')[0]
        .should.containSubset({
          type: 'AssignmentExpression',
          operator: '=',
          left: { type: 'Identifier', name: 'a' },
          right: { type: 'Literal', value: 'A' }
        });
    });

    it('should assign variable', function () {
      parse('{$a=$b}')[0]
        .should.containSubset({
          left: { type: 'Identifier', name: 'a' },
          right: { type: 'Identifier', name: 'b' },
        });
    });

    it('should assign object member', function () {
      parse('{$a=$b.c}')[0].right
        .should.containSubset({
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'b' },
          property: { type: 'Literal', value: 'c' },
        });
    });

    it('should assign numeric value', function () {
      parse('{$foo=1}')[0].right
        .should.containSubset({ type: 'Literal', value: 1 });
    });

    it('should parse functions', function () {
      parse('{$foo=strlen(\'bar\')}')[0].right
        .should.containSubset({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'strlen' },
          arguments: [ { type: 'Literal', value: 'bar' } ]
        });
    });

    it('should parse array assignment', function () {
      parse('{$foo=[9,8,7]}')[0].right
        .should.containSubset({
          type: 'ArrayExpression',
          elements: [
            { type: 'Literal', value: 9 },
            { type: 'Literal', value: 8 },
            { type: 'Literal', value: 7 },
          ]
        });
    });

    it('should parse assoc-array assignments as objects', function () {
      parse('{$foo=[\'a\'=>9, \'b\'=>8]}')[0].right
        .should.containSubset({
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: { type: 'Literal', value: 'a' },
              value: { type: 'Literal', value: 9 }
            },
            {
              type: 'Property',
              key: { type: 'Literal', value: 'b' },
              value: { type: 'Literal', value: 8 }
            },
          ]
        });
    });

    it('should parse mixed array assignments as AssocArrayExpressions', function () {
      parse('{$foo=[\'a\', \'b\'=>8]}')[0].right
        .should.containSubset({
          type: 'AssocArrayExpression',
          elements: [
            { type: 'Literal', value: 'a' },
          ],
          properties: [
            {
              type: 'Property',
              key: { type: 'Literal', value: 'b' },
              value: { type: 'Literal', value: 8 }
            },
          ]
        });
    });

    it('should parse computed assignment by key', function () {
      parse('{$foo[\'a\'][2]=1}')[0].left
        .should.containSubset({
          type: 'MemberExpression',
          computed: true,
          object: {
            type: 'MemberExpression',
            computed: true,
            object: { type: 'Identifier', name: 'foo' },
            property: { type: 'Literal', value: 'a' },
          },
          property: { type: 'Literal', value: 2 },
        });
    });

    it.skip('should parse push-shorthand assignment', function () {
      parse('{$foo[]=1}')[0].left
        .should.containSubset({
          // ?
        });
    });

    it.skip('should parse assignments with scope', function () {
      parse('{$foo[]=2 scope=root}')[0].left
        .should.containSubset({
          // ?
        });
    });
  });

  describe('inline tags and attributes', function () {
    it('should parse literal assignments', function () {
      parse('{assign var=\'v\' value=\'\'}')
        .should.containSubset([{
          type: 'TagStatement',
          id: 'assign',
          attributes: [
            {
              type: 'Property',
              key: { type: 'Identifier', name: 'var' },
              value: { type: 'Literal', value: 'v' },
            },
            {
              type: 'Property',
              key: { type: 'Identifier', name: 'value' },
              value: { type: 'Literal', value: '' },
            },
          ]
        }]);
    });

    it('should parse spaced literal assignments', function () {
      parse('{assign \'a\' \'A\'}')
        .should.containSubset([{
          type: 'TagStatement',
          id: 'assign',
          attributes: [
            { type: 'Literal', value: 'a' },
            { type: 'Literal', value: 'A' },
          ]
        }]);
    });

    it('should parse mixed literal assignments', function () {
      parse('{assign var=\'a\' \'A\'}')
        .should.containSubset([{
          type: 'TagStatement',
          id: 'assign',
          attributes: [
            {
              type: 'Property',
              key: { type: 'Identifier', name: 'var' },
              value: { type: 'Literal', value: 'a' },
            },
            { type: 'Literal', value: 'A' },
          ]
        }]);
    });

    it('should parse variables assignments', function () {
      parse('{assign value=$b}')[0].attributes
        .should.containSubset([
          {
            type: 'Property',
            key: { name: 'value' },
            value: { type: 'Identifier', name: 'b', raw: '$b' },
          }
        ]);
    });

    it('should parse variables in spaced attributes', function () {
      parse('{assign $b}')[0].attributes
        .should.containSubset([
          { type: 'Identifier', name: 'b', raw: '$b' }
        ]);
    });

    it('should parse array access and object properties assignments', function () {
      parse('{assign $a[$c.d]}')[0].attributes[0]
        .should.containSubset({
          type: 'MemberExpression',
          object: { name: 'a', raw: '$a' },
          property: {
            object: { name: 'c', raw: '$c' },
            property: { value: 'd', raw: 'd' },
          }
        });
    });
  });

  describe('block tags', function () {
    it('should parse php block statement', function () {
      parse('{php}a b c{/php}')
        .should.containSubset([{
          type: 'PHPBlockStatement',
          value: 'a b c',
        }]);
    });

    it('should parse capture block statement', function () {
      parse('{capture name=\'A\'}a b c{/capture}')
        .should.containSubset([{
          type: 'TagBlockStatement',
          id: 'capture',
          attributes: [
            {
              key: { name: 'name' },
              value: { value: 'A' }
            }
          ],
          body: [
            { type: 'Literal', value: 'a b c' }
          ]
        }]);
    });
  });

  describe('ifs and whiles', function () {
    it('should parse if block', function () {
      parse('pre{if $test}inside{/if}post')
        .should.containSubset([
          { value: 'pre' },
          {
            type: 'IfStatement',
            test: { type: 'Identifier', name: 'test' },
            consequent: [ { type: 'Literal', value: 'inside' } ],
            alternate: null,
          },
          { value: 'post' },
        ]);
    });

    it('should parse if-else block', function () {
      parse('pre{if $test}{else}else{/if}post')
        .should.containSubset([
          { value: 'pre' },
          {
            type: 'IfStatement',
            test: { type: 'Identifier', name: 'test' },
            consequent: null,
            alternate: [ { type: 'Literal', value: 'else' } ],
          },
          { value: 'post' },
        ]);
    });

    it('should parse big if-else block', function () {
      parse('pre{if $test}before{$test}after{else}before2{$test2}after2{/if}post')
        .should.containSubset([
          { value: 'pre' },
          {
            type: 'IfStatement',
            test: { type: 'Identifier', name: 'test' },
            consequent: [
              { type: 'Literal', value: 'before' },
              { type: 'EchoStatement', value: { type: 'Identifier', name: 'test' } },
              { type: 'Literal', value: 'after' },
            ],
            alternate: [
              { type: 'Literal', value: 'before2' },
              { type: 'EchoStatement', value: { type: 'Identifier', name: 'test2' } },
              { type: 'Literal', value: 'after2' },
            ],
          },
          { value: 'post' },
        ]);
    });

    it('should parse elseif statement', function () {
      parse([
        '{if $test}before',
        '{elseif $test2}middle',
        '{else if $test3}end',
        '{else}else',
        '{/if}'].join(''))
        .should.containSubset([{
          type: 'IfStatement',
          test: { name: 'test' },
          consequent: [ { value: 'before' } ],
          alternate: [ {
            type: 'IfStatement',
            test: { name: 'test2' },
            consequent: [ { value: 'middle' } ],
            alternate: [ {
              type: 'IfStatement',
              test: { name: 'test3' },
              consequent: [ { value: 'end' } ],
              alternate: [ { value: 'else' } ]
            } ]
          } ],
        }]);
    });

    it('should parse while statement', function () {
      parse('before{while $foo > 0}{$foo--}{/while}after')
        .should.containSubset([
          { type: 'Literal', value: 'before' },
          {
            type: 'WhileStatement',
            test: {
              type: 'BinaryExpression',
              operator: '>',
              left: { name: 'foo' },
              right: { value: 0 },
            },
            body: [ {
              type: 'EchoStatement',
              value: {
                type: 'UpdateExpression',
                operator: '--',
                argument: { name: 'foo' },
              }
            } ]
          },
          { type: 'Literal', value: 'after' },
        ]);
    });
  });

  describe('foreachs', function () {
    it('should fetch foreachs', function () {
      parse('{foreach from=$areaKindNotice item="noticeText"}inside{/foreach}')
        .should.containSubset([{
          qwe: 1
        }]);
    });

    it('should fetch foreachs', function () {
      parse('{foreach $a as $v}{$v@key}{/foreach}')
        .should.containSubset([{
          qwe: 1
        }]);
    });

    it('should fetch foreachelse in foreach', function () {
      parse('{foreach $a as $v}{$v}{foreachelse}-{/foreach}')
        .should.containSubset([{
          qwe: 1
        }]);
    });
  });

  describe('custom block statements', function () {
    it('should parse simple block statement', function () {
      parse('before{BS}a b c{/BS}after')
        .should.containSubset([
          { type: 'Literal', value: 'before' },
          {
            type: 'TagBlockStatement',
            id: 'BS',
            body: [ { value: 'a b c' } ],
          },
          { type: 'Literal', value: 'after' },
        ]);
    });

    it('should parse block with param', function () {
      parse('before {BS p=1}a b c{/BS} after')
        .should.containSubset([
          { type: 'Literal', value: 'before ' },
          {
            type: 'TagBlockStatement',
            id: 'BS',
            attributes: [ { key: { name: 'p' }, value: { value: 1 } } ],
            body: [ { value: 'a b c' } ],
          },
          { type: 'Literal', value: ' after' },
        ]);
    });

    it('should parse block with variables', function () {
      parse('before{BS p=$a}{$b}{/BS}after')
        .should.containSubset([
          { type: 'Literal', value: 'before' },
          {
            type: 'TagBlockStatement',
            id: 'BS',
            attributes: [ { key: { name: 'p' }, value: { name: 'a' } } ],
            body: [ { type: 'EchoStatement', value: { name: 'b' } } ],
          },
          { type: 'Literal', value: 'after' },
        ]);
    });
  });

  describe.skip('static classes', function () {
    it('should parse static properties and methods', function () {
      parse('{mystaticclass::$static_var}');
      parse('{mystaticclass::STATIC_CONSTANT_VALUE}');
      parse('{mystaticclass::square(5)}');
      parse('{$foo="square"}{mystaticclass::$foo(5)}');
      parse('{mystaticclass::$foo(5)}');
    });
  });

  describe.skip('Other', function () {
    it('should left whitespaces around function statements', function () {
      parse('A{assign var=zoo value=\'blah\'}B');
      parse('A\n{assign var=zoo value=\'blah\'}\nB');
      parse('E{assign var=zoo value=\'blah\'}\nF');
      parse('G\n{assign var=zoo value=\'blah\'}H');
    });

    it('should parse old smarty assignments', function () {
      parse('{assign var=foo   value=1}');
      parse('{assign var = foo   value= 1}');
      parse('{assign var=\'foo\' value=1}');
      parse('{assign var="foo" value=1}');
      parse('{assign var=foo value=bar}');
      parse('{assign var=foo value=1+2}');
      parse('{assign var=foo value=strlen(\'bar\')}');
      parse('{assign var=foo value=\'bar\'|strlen}');
      parse('{assign var=foo value=[9,8,7,6]}');
      parse('{assign var=foo value=[\'a\'=>9,\'b\'=>8,\'c\'=>7,\'d\'=>6]}');
    });
  });

  describe.skip('custom statements', function () {
    it('should parse simple block statement', function () {
      parse('{ST}').should.containSubset([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: []}]);
      parse('{ST p=1}').should.containSubset([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
        {type: 'ATTR', key: {type: 'STR', value: 'p'}, value: {type: 'NUM', value: '1'}}
      ]}]);
      parse('{ST p}').should.containSubset([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
        {type: 'ATTR', key: {type: 'STR', value: 'p'}}
      ]}]);
      parse('{ST $a}').should.containSubset([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
        {type: 'ATTR', key: {type: 'VAR', value: {type: 'VAR', value: {type: 'ID', value: 'a'}}}} // wtf
      ]}]);
    });
  });

});
