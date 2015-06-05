var parse = smarty.parse;

describe('parser', function () {

    describe('expressions', function () {
        it('should parse literals', function () {
            console.log(parse('{""}'));
            parse('{"\\1\\t"}');
            parse('{"a"}');
            parse('{\'\'}');
            parse('{\'\\1\\t\'}');
            parse('{\'b\'}');
        });

        it('should store context', function () {
            parse('a{"b"}c{$d}e').should.eql([
                {type: 'T', value: 'a'},
                {type: 'STR', value: 'b'},
                {type: 'T', value: 'c'},
                {type: 'VAR', value: {type: 'ID', value: 'd'}},
                {type: 'T', value: 'e'},
            ]);
            parse('a\n  {"b"}\n  c\n\t{$d}\ne\n');
        });

        it('should parse vars', function () {
            parse('{$a}').should.eql([{type: 'T', value: ''}, {type: 'VAR', value: {type: 'ID', value: 'a'}}]);
            parse('{$a.b}');
            parse('{$a.b.$c}');
            parse('{$a.b.$c.d}');
        });

        it('should left whitespaces', function () {
            parse('{$foo}{$foo}');
            parse('{$foo} {$foo}');
            parse('A{$foo}B');
            parse('A {$foo}B');
            parse('A{$foo} B');
            parse('A{$foo}\nB');
            parse('A{$foo}B\nC');
        });

        it.skip('should parse vars with numerics', function () {
            parse('{$a.0}');
            parse('{$a.b.$c.d.0}');
        });

        it('should parse vars with array access', function () {
            parse('{$a[0]}');
            parse('{$a.b[$c]}');
            parse('{$a.b.$c[$d]}');
            parse('{$a.b.$c.d[$e]}');
        });

        it('should parse ticks inside strings', function () {
            parse('{"`$a`"}');
            parse('{"/`$b`/`$c`/"}');
        });

        it('should parse mods', function () {
            parse('{$a|mod}');
            parse('{"a"|mod1:"X":"Y"|mod2:"Z"}');
            parse('{$a.b|mod1:$c.d|mod2:$e.f}');
        });

        it('should parse object expressions', function () {
            parse('{$a->b.c}');
            parse('{$a_b->c_d.e_f}');
            parse('{$a}');
            parse('{$a.b}');
            parse('{$a.b.$c}');
            parse('{$a.b.$c.d}');
        });

        it.skip('should parse call expressions for variables and array props', function () {
            parse('{$a()}');
            parse('{$a.b()}');
            parse('{$a.$b()}');
        });

        it('should parse call expressions for object properties', function () {
            parse('{$a_b.c->d_e("X", $f)}');
            parse('{$a->b.c->d.e->f($g, "X", $h)}');
        });

        it('should parse call expressions with mods', function () {
            parse('{$a->b()|mod}');
            parse('{$a.b->c()|mod}');
        });

        it('should parse expressions statements', function () {
            parse('{$a_b+$c_d}');
            parse('{$a.b+$c.d}');
            parse('{$a->b+$c->d}');
        });
    });

    describe('statements', function () {
        it('should parse literal assignments', function () {
            parse('{assign var="v" value=""}');
            parse('{assign var="a" value="A"}');
            parse('{assign var=a value="A"}');
            parse('{assign "a" "A"}');
            parse('{$a="A"}');
        });

        it('should parse variables assignments', function () {
            parse('{assign var="a" value=$b}');
            parse('{assign "a" $b}');
            parse('{$a=$b}');
            parse('{$a=$b.c+$d->e}');
        });

        it('should parse array access and object properties assignments', function () {
            parse('{assign var="a" value=$a[$c]}');
            parse('{assign var="a" value=$a[$c].f}');
            parse('{assign var="a" value=$a[$c.d]}');
            parse('{assign var="a" value=$a.b[$c]}');
            parse('{assign var="a" value=$a.b.c[$c.d.e].f.g}');
        });

        it('should parse modified assignments', function () {
            parse('{assign var="a" value=0|mod}');
            parse('{assign var="a" value=0|mod:1}');
            parse('{assign var="a" value=0|mod:1:2:3}');
            parse('{assign var="a" value=0|mod:$p1}');
            parse('{assign var="a" value=0|mod:$p1:$p2:$p3}');

            parse('{assign var="a" value=$b|@mod1:$c|@mod2:"/$d/"}');

            parse('{assign var="a" value="`$b`/c/`$d`/`$e`.f"}');
            parse('{assign var="a" value="`$b`/c/`$d`/`$e`.f"|mod}');
            parse('{assign var="a" value="`$b`/c/`$d`/`$e`.f"|@amod}');
        });

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

        it('should parse new assignments', function () {
            parse('{$foo=1}');
            parse('{$foo =1}');
            parse('{$foo =  1}');
            parse('{$foo=bar}');
            parse('{$foo=1+2}');
            parse('{$foo = 1+2}');
            parse('{$foo = 1 + 2}');
            parse('{$foo=strlen(\'bar\')}');
            parse('{$foo="bar"|mod}');
        });

        it('should parse arrays and cycles', function () {
            parse('{$foo=[9,8,7,6]}');
            parse('{$foo=["a"=>9,"b"=>8,"c"=>7,"d"=>6]}');
            parse('{$foo[]=2}');
            parse('{$foo =1}{$foo[] = 2}');
            parse('{$foo["a"][4]=1}');
        });

        it.skip('should parse assignments with scope', function () {
            parse('{$foo[]=2 scope=root}');
        });
    });

    describe('static classes', function () {
        it.skip('should parse static properties and methods', function () {
            parse('{mystaticclass::$static_var}');
            parse('{mystaticclass::STATIC_CONSTANT_VALUE}');
            parse('{mystaticclass::square(5)}');
            parse('{$foo="square"}{mystaticclass::$foo(5)}');
            parse('{mystaticclass::$foo(5)}');
        });
    });

    describe('smarty block statements', function () {
        it('should parse capture block statement', function () {
            parse('{capture name="A"}a b c{/capture}');
            parse('{capture assign="A"}a b c{/capture}');
        });

        it('should parse php block statement', function () {
            parse('{php}a b c{/php}');
        });
    });

    describe('custom statements', function () {
        it('should parse simple block statement', function () {
            parse('{ST}').should.eqls([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: []}]);
            parse('{ST p=1}').should.eqls([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
                {type: 'ATTR', key: {type: 'STR', value: 'p'}, value: {type: 'NUM', value: '1'}}
            ]}]);
            parse('{ST p}').should.eqls([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
                {type: 'ATTR', key: {type: 'STR', value: 'p'}}
            ]}]);
            parse('{ST $a}').should.eqls([{type: 'T', value: ''}, {type: 'FUNC', name: 'ST', attrs: [
                {type: 'ATTR', key: {type: 'VAR', value: {type: 'VAR', value: {type: 'ID', value: 'a'}}}} // wtf
            ]}]);
        });
    });

    describe.skip('custom block statements', function () {
        it('should parse simple block statement', function () {
            parse('{BS}a b c{/BS}').should.eqls([]);
        });

        it('should parse block with param', function () {
            parse('{BS p=1}a b c{/BS}').should.eqls([]);
        });

        it('should parse block with variables', function () {
            parse('{BS p=$a}{$b}{/BS}').should.eqls([]);
        });
    });

});
