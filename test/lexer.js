var lexer = smarty.lexer;
var tokens = smarty.tokens;
var T = tokens.names;

var parse = function (code) {
    lexer.setInput(code);
    var lexems = [];
    var token = lexer.lex() || lexer.EOF;
    while (token !== lexer.EOF) {
        lexems.push(tokens.names[token] || (':' + token));
        token = lexer.lex();
    }
    return lexems.map(function (v) {
        return v[0] === ':' ? v : v.replace(/^TP_/, '').toLowerCase();
    }).join(' ');
};

describe('lexer', function () {

    describe('texts and comments', function () {

        it('should fetch empty js', function () {
            parse('{}').should.eq('text');
        });

        it('should fetch comments', function () {
            parse('{* foo bar *}').should.eq('comment');
        });

        it('should fetch plain text', function () {
            parse('foo bar').should.eq('text');
        });

        it('should fetch text with comments outside', function () {
            parse('{* comment *} foo bar {* comment *}').should.eq('comment text comment');
        });

        it('should fetch text with comment inside', function () {
            parse('foo {* comment *} bar').should.eq('text comment text');
        });

    });

    describe('singlequoted strings', function () {

        it('should fetch empty literal lexems with singlequotes', function () {
            parse('{\'\'}').should.eq('ldel singlequotestring rdel');
        });

        it('should fetch simple literal lexems with singlequotes', function () {
            parse('{\'b\'}').should.eq('ldel singlequotestring rdel');
        });

        it('should fetch escaped literal lexems', function () {
            parse('{\'\\1x\\t\'}').should.eq('ldel singlequotestring rdel');
        });

    });

    describe('doublequoted strings', function () {

        it('should fetch empty lexem', function () {
            parse('{""}').should.eq('ldel quote quote rdel');
        });

        it('should fetch simple literal lexems', function () {
            parse('{"foo bar"}').should.eq('ldel quote text quote rdel');
        });

        it('should fetch escaped literal lexems', function () {
            parse('{"A\\1xB\\tC"}').should.eq('ldel quote text quote rdel');
        });

    });

    describe('vars and arrays', function () {

        it('should fetch variables', function () {
            parse('{$a}').should.eq('ldel dollarid rdel');

            parse('{$a.b}').should.eq('ldel dollarid dot id rdel');

            parse('{$a.b.$c}')
                .should.eq('ldel dollarid dot id dot dollarid rdel');

            parse('{$a.b.$c.d}')
                .should.eq('ldel dollarid dot id dot dollarid dot id rdel');

            parse('{$a.0}')
                .should.eq('ldel dollarid dot integer rdel');

            parse('{$a.b.$c.d.0}').should.eq('ldel dollarid dot id dot dollarid dot id dot integer rdel');
        });

    });

    describe('arrays', function () {

        it('should fetch array access', function () {
            parse('{$a[0]}').should.eq('ldel dollarid openb integer closeb rdel');

            parse('{$a.b[$c]}').should.eq('ldel dollarid dot id openb dollarid closeb rdel');

            parse('{$a.b.$c[$d]}')
                .should.eq('ldel dollarid dot id dot dollarid openb dollarid closeb rdel');

            parse('{$a.b.$c.d[$e]}')
                .should.eq('ldel dollarid dot id dot dollarid dot id openb dollarid closeb rdel');
        });

    });

    describe('ticks', function () {

        it('should fetch ticks inside strings', function () {
            parse('{"`$a`"}')
                .should.eq('ldel quote backtick dollarid backtick quote rdel');

            parse('{"/`$b`/`$c`/"}')
                .should.eq('ldel quote text ' +
                    'backtick dollarid backtick text ' +
                    'backtick dollarid backtick text ' +
                    'quote rdel');
        });

    });

    describe('mods', function () {

        it('should fetch modifiers', function () {
            parse('{$a|mod}').should.eq('ldel dollarid vert id rdel');

            parse('{$a|@mod}').should.eq('ldel dollarid vert at id rdel');

            parse('{"a"|mod1:"X":3|@mod2:"Z"}')
                .should.eq('ldel quote text quote ' +
                    'vert id colon quote text quote colon integer ' +
                    'vert at id colon quote text quote rdel');

            parse('{$a.b|mod1:$c.d|mod2:$e.f}')
                .should.eq('ldel dollarid dot id vert id colon ' +
                    'dollarid dot id vert id colon ' +
                    'dollarid dot id rdel');
        });

    });

    describe('objects', function () {

        it('should fetch object access', function () {
            parse('{$a->b.c}').should.eq('ldel dollarid ptr id dot id rdel');

            parse('{$a_b->c_d.e_f}').should.eq('ldel dollarid ptr id dot id rdel');
        });

    });

    describe('calls', function () {

        it('should fetch calls', function () {
            parse('{$a_b.c->d_e("X", $f)}')
                .should.eq('ldel dollarid dot id ptr id ' +
                    'openp quote text quote comma dollarid closep rdel');

            parse('{$a->b.c->d.e($f, \'X\', $g)}')
                .should.eq('ldel dollarid ptr id dot id ptr id dot id ' +
                    'openp dollarid comma singlequotestring comma dollarid closep rdel');
        });

    });

    describe('expressions', function () {

        it('should fetch expressions', function () {
            parse('{$a_b+$c_d}')
                .should.eq('ldel dollarid unimath dollarid rdel');

            parse('{$a.b+$c.d}')
                .should.eq('ldel dollarid dot id unimath dollarid dot id rdel');

            parse('{$a->b+$c->d}')
                .should.eq('ldel dollarid ptr id unimath dollarid ptr id rdel');
        });

    });

    describe('assignments', function () {

        it('should fetch literal assignments', function () {
            parse('{assign var="v" value="A"}')
                .should.eq('ldel id attr quote text quote attr quote text quote rdel');

            parse('{assign var=\'a\' value=\'A\'}')
                .should.eq('ldel id attr singlequotestring attr singlequotestring rdel');

            parse('{assign var=a value=b}').should.eq('ldel id attr id attr id rdel');

            parse('{assign "a" "A"}').should.eq('ldel id space quote text quote space quote text quote rdel');

            parse('{assign var=\'a\' \'A\'}').should.eq('ldel id attr singlequotestring space singlequotestring rdel');

            parse('{$a="A"}').should.eq('ldel dollarid equal quote text quote rdel');
        });

        it('should fetch variable assignments', function () {
            parse('{assign var="a" value=$b}')
                .should.eq('ldel id attr quote text quote attr dollarid rdel');

            parse('{assign "a" $b}')
                .should.eq('ldel id space quote text quote space dollarid rdel');

            parse('{$a=$b}')
                .should.eq('ldel dollarid equal dollarid rdel');

            parse('{$a=$b.c+$d->e}')
                .should.eq('ldel dollarid equal dollarid dot id unimath dollarid ptr id rdel');
        });

        it('should fetch array access and object properties ', function () {
            parse('{assign var="a" value=$a[$c]}')
                .should.eq('ldel id attr quote text quote attr dollarid openb dollarid closeb rdel');

            parse('{assign var="a" value=$a[$c].f}')
                .should.eq('ldel id attr quote text quote attr dollarid openb dollarid closeb dot id rdel');

            parse('{assign a value=$a[$c.d]}')
                .should.eq('ldel id space id attr dollarid openb dollarid dot id closeb rdel');

            parse('{assign a value=$a.b[$c]}')
                .should.eq('ldel id space id attr dollarid dot id openb dollarid closeb rdel');

            parse('{assign a $a.b.c[$c.d.e].f.g}')
                .should.eq('ldel id space id space dollarid dot id dot id ' +
                    'openb dollarid dot id dot id closeb ' +
                    'dot id dot id rdel');
        });

        it('should fetch modified assignments', function () {
            parse('{assign a value=0|mod}')
                .should.eq('ldel id space id attr integer vert id rdel');

            parse('{assign a 0|mod:1:2:3}')
                .should.eq('ldel id space id space integer vert id colon integer colon integer colon integer rdel');

            parse('{assign a 0|mod:$p1:$p2:$p3}')
                .should.eq('ldel id space id space integer vert id colon dollarid colon dollarid colon dollarid rdel');

            parse('{assign a value=$b|@mod1:$c|@mod2:"/$d/"}')
                .should.eq('ldel id ' +
                    'space id ' +
                    'attr dollarid ' +
                        'vert at id colon dollarid ' +
                        'vert at id colon quote text dollarid text quote ' +
                    'rdel');

            parse('{$a = "`$b`/c/`$d`/`$e`.f"}')
                .should.eq('ldel dollarid equal ' +
                    'quote backtick dollarid backtick text ' +
                        'backtick dollarid backtick text ' +
                        'backtick dollarid backtick text quote ' +
                    'rdel');

            parse('{$a = "`$b`/c"|mod}')
                .should.eq('ldel dollarid equal ' +
                    'quote backtick dollarid backtick text quote ' +
                    'vert id rdel');

            parse('{$a = "`$b`/c"|@amod}')
                .should.eq('ldel dollarid equal ' +
                    'quote backtick dollarid backtick text quote ' +
                    'vert at id rdel');
        });

    });

    describe('level 42', function () {

        it('should parse tag with attr followed by text', function () {
            parse('{tag a=$b}xxx')
                .should.eq('ldel id attr dollarid rdel text');
        });

        it('should fetch smarty specific things', function () {
            parse('{$smarty.capture.a|strip_tags|quot}')
                .should.eq('ldel dollarid dot id dot id vert id vert id rdel');

            parse('{$smarty.capture.b|@strip_tags}')
                .should.eq('ldel dollarid dot id dot id vert at id rdel');

            parse('{$smarty.now|date_format:\'%d.%m.%Y\'}')
                .should.eq('ldel dollarid dot id vert id colon singlequotestring rdel');

            parse('{$smarty.get.back_anchor}')
                .should.eq('ldel dollarid dot id dot id rdel');
        });

        it('should fetch block definitions', function () {
            parse('{b block="name" mods=$plateMods data=$plateData}')
                .should.eq('ldel id attr quote text quote attr dollarid attr dollarid rdel');
        });

        it('should fetch foreachs', function () {
            parse('{foreach from=$areaKindNotice item=noticeText}{/foreach}')
                .should.eq('ldelforeach attr dollarid attr id rdel closetag');

            parse('{foreach from=$areaKindNotice item=noticeText}{/foreach}')
                .should.eq('ldelforeach attr dollarid attr id rdel closetag');

            parse('{foreach $a as $v}{$v@key}{/foreach}')
                .should.eq('ldelforeach space dollarid as dollarid rdel ldel dollarid at id rdel closetag');
        });

        it('should fetch text inside foreach tags', function () {
            parse('{foreach $a as $v}xxx{/foreach}')
                .should.eq('ldelforeach space dollarid as dollarid rdel text closetag');
        });

        it('should fetch variable inside foreach tags', function () {
            parse('{foreach $a as $v}{$v}{/foreach}')
                .should.eq('ldelforeach space dollarid as dollarid rdel ldel dollarid rdel closetag');
        });

        it('should fetch foreachelse in foreach', function () {
            parse('{foreach $a as $v}{$v}{foreachelse}-{/foreach}')
                .should.eq('ldelforeach space dollarid as dollarid rdel ldel dollarid rdel simpletag text closetag');
        });

        it('should fetch simple block tags', function () {
            parse('text1 {tag} text2 {/tag} text3')
                .should.eq('text simpletag text closetag text');
        });

        it('should fetch block tags with attrs', function () {
            parse('text1 {tag \'a\'} text2 {/tag} text3')
                .should.eq('text ldel id space singlequotestring rdel text closetag text');
        });

        it('should fetch php tag', function () {
            parse('before {php}\n$q = 1;\n{/php} after')
                .should.eq('text php text');
        });

        it('should fetch capture tag with attr', function () {
            parse('{capture name="A"}a b c{/capture}')
                .should.eq('ldel id attr quote text quote rdel text closetag');
        });

        it('should fetch if/elseif/while tags', function () {
            parse('{if 1}2{else if 3}4{else}5{/if}')
                .should.eq('ldelif integer rdel text ldelif integer rdel text simpletag text closetag');
        });

        it('should fetch if tag with lop', function () {
            parse('{if 1 > 3}333{/if}')
                .should.eq('ldelif integer logop integer rdel text closetag');
        });
    });

});
