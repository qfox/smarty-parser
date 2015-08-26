var tokens = require('../tokens');

var $ = tokens.ids;

var $_ = module.exports = {
  /** Document type (template) */
  document: function() {
    return this.newNode('Document', this._readElementsUntil());
  },

  comment: function() {
    this.expect($.TP_COMMENT);
    var node = this.newNode('Comment', { value: this.token.text });
    this.next();
    return node;
  },

  text: function() {
    this.expect($.TP_TEXT);
    var node = this.newNode('Literal', { value: '', static: true });
    while (this.token.id === $.TP_TEXT) {
      node.value += this.token.text;
      this.next();
    }
    return node;
  },

  /**
   * Literal type
   *   : TP_LITERALSTART TP_LITERALEND -> ''
   *   | TP_LITERALSTART literal_elements TP_LITERALEND -> $1
   * literal_elements : literal_elements literal_element { $$ = $1 + $2 }
   * literal_element : literal | TP_LITERAL
   */
  literal: function() {
    this.expect($.TP_LITERALSTART).next();
    var node = this.newNode('Literal', []);
    while (this.token.id !== $.EOF && this.token.id !== $.TP_LITERALEND) {
      if (this.token.id === $.TP_LITERALEND) {
        this.throwError('Unclosed {literal} block', {});
      }
      node.body.push(this.token.text);
    }
    return node;
  },

  /**
   * Element type (template_element)
   *   : smartytag
   *   | literal -> new Smarty_Internal_ParseTree_Text($1); }
   *   | TP_PHP
   *   | TP_NOCACHE
   *   | text_content { $$ = this.compiler.processText($1) }
   *   | TP_STRIPON { this.strip = true }
   *   | TP_STRIPOFF { this.strip = false; }
   *   | TP_BLOCKSOURCE
   */
  element: function() {
    // this.expect([
    //   $.TP_TEXT, $.TP_COMMENT, $.TP_LITERALSTART, $.TP_STRIPON, $.TP_PHP, $.TP_NOCACHE,
    //   $.TP_BLOCKSOURCE, $.TP_SIMPLEOUTPUT, $.TP_SIMPLETAG, $.TP_CLOSETAG, $.TP_LDEL,
    //   $.TP_LDELIF, $.TP_LDELFOR, $.TP_LDELFOREACH, $.TP_LDELSETFILTER, $.TP_LDELSLASH,
    // ]);

    switch(this.token.id) {
      case $.TP_PHP:
        return this.newNodeAndNext('PHPBlockStatement', {
          value: this.token.text
            .replace(/^\s*{\s*php\s*}(.+){\/\s*php\s*}\s*$/, '$1')
        });
      case $.TP_COMMENT:        return $_.comment.call(this);
      case $.TP_LITERALSTART:   return $_.literal.call(this);
      case $.TP_TEXT:           return $_.text.call(this);
      case $.TP_STRIPON:        return this.next().newNode('Strip', this._readElementsUntil($.TP_STRIPON_END));
      case $.TP_NOCACHE:        return this.next().newNode('NoCache', this._readElementsUntil($.TP_NOCACHE_END));
      default:                  return $_.smartytag.call(this);
        // throw new Error('Unexpected token in readElement? ' + _getTokenName(this.token.id));
    }
  },

  /**
   * Smarty pseudo tag
   *  : tag TP_RDEL -> $1
   *  | TP_SIMPLEOUTPUT
   *  | TP_SIMPLETAG
   *  | TP_CLOSETAG
   */
  smartytag: function() {
    switch (this.token.id) {
      case $.TP_SIMPLETAG:
        return this.newNodeAndNext('TagStatement', {
          id: this.token.text.replace(/^\s*\{\s*(.+)\s*\}\s*$/, '$1'),
        });

      case $.TP_CLOSETAG:
        return this.newNodeAndNext('TagEndStatement', {
          id: this.token.text.replace(/^\s*\{\/\s*(.+)\s*\}\s*$/, '$1'),
//          modifiers: [],
        });

      // case $.TP_SIMPLEOUTPUT: return this.newNode('SIMPLEOUTPUT', { id: this.token.text });

      default:
        var res = this.try([$_.tag, $.TP_RDEL]);
      // this.trace('TAG', res);
        if (!res) this.throwError(['tag', $.TP_SIMPLETAG/*, $.TP_SIMPLEOUTPUT*/, $.TP_CLOSETAG]);
        return res[0];
    }
  },

  /**
   * Tag node
   * tag:
   *   TP_LDEL TP_DOLLARID TP_EQUAL value
   *   TP_LDEL TP_DOLLARID TP_EQUAL expr attributes?
   *   TP_LDEL varindexed TP_EQUAL expr attributes
   *
   *   TP_LDEL (variable|value|expr) attributes?
   *   TP_LDEL TP_ID (TP_PTR TP_ID)? modifierlist? attributes?
   *   TP_LDEL TP_SMARTYBLOCKCHILDPARENT
   *
   *   TP_LDELIF (expr|statement) attributes?
   *   TP_LDELFOR statement TP_TO expr (TP_STEP expr)? attributes
   *   TP_LDELFOR statements TP_SEMICOLON expr TP_SEMICOLON varindexed foraction attributes
   *   TP_LDELFOREACH attributes
   *   TP_LDELFOREACH TP_SPACE (value|expr)? TP_AS varvar (TP_APTR varvar)? attributes
   *   TP_LDELSETFILTER TP_ID modparameters modifierlist?
   *   TP_LDELSLASH TP_ID (PTR TP_ID)? modifierlist?
   * foraction:
   *   TP_EQUAL expr -> '=' + $2
   *   TP_INCDEC -> $1
   */
  tag: function() {
    this.expect([$.TP_LDEL, $.TP_LDELIF, $.TP_LDELFOR,
      $.TP_LDELFOREACH, $.TP_LDELSETFILTER, $.TP_LDELSLASH]);

    var node, attributes, res;
    switch(this.token.id) {
      default:
        this.trace('!!! No code.');
        throw new Error('No code.');

      // TP_LDELIF (expr|statement) attributes?
      // {if}, {elseif} and {while} tag
      case $.TP_LDELIF:
        var kind = this.token.text.replace(/^\s*\{(.+?)\s*$/, '$1');
        // this.trace('TAG LDELIF kind:', kind);
        this.next();

        var test = this.try($_.expr)
          || this.try($_.statement)
          || this.throwError(['expr', 'statement']);

        attributes = this.try($_.attributes);
        // this.trace('TAG LDELIF test, attributes:', test, attributes);

        if (kind === 'if') {
          node = this.newNode('IfStatement', {
            test: test,
            consequent: null,
            alternate: null,
            attributes: attributes,
          });
        } else if (kind === 'elseif' || kind === 'else if') {
          node = this.newNode('_ElseIfStatement', { // pseudo type
            test: test,
            consequent: null,
            alternate: null,
            attributes: attributes,
          });
        } else if (kind === 'while') {
          node = this.newNode('WhileStatement', {
            test: test,
            body: []
          });
        }

        return node;

      case $.TP_LDELFOR:
        return this.next().read('for');

      // {foreach $a as $k => $v}
      //   TP_LDELFOREACH TP_SPACE expr TP_AS (varvar TP_APTR)? varvar attributes
      //   TP_LDELFOREACH attributes
      case $.TP_LDELFOREACH:
        res = this.newNodeAndNext('ForEachStatement', {
          key: null,
          item: null,
          from: null,
          body: [],
          alternate: null,
          attributes: [],
        });

        if (this.token.id === $.TP_SPACE) {
          this.next();
          res.from = this.read($_.expr);
          res.read($.TP_AS);
          if (node = this.try([$_.varvar, $.TP_APTR])) {
            res.key = node[1];
          }
          res.item = this.read($_.varvar);
          res.attributes = this.try('attributes');
        } else {
          res.attributes = this.read('attributes');
        }

        this.trace('LDELFOREACH', res);
        return res;

      case $.TP_LDELSETFILTER: return this.next().read('setFilter');

      // TP_LDELSLASH TP_ID (PTR TP_ID)? modifierlist?
      case $.TP_LDELSLASH:
        // this.trace('TAG {/');

        this.next().expect($.TP_ID);
        var id = this.newNodeAndNext('Identifier', { name: this.token.text });
        if (this.token.id === $.TP_PTR && this.token.next.id === $.TP_ID) {
          this.throwError('WHAT IS THIS?');
        }

        return this.newNode('TagEndStatement', {
          id: id,
          modifiers: this.try('modifierlist'),
        });

      case $.TP_LDEL:
        this.next(); // skip ldel

        switch (this.token.id) {
          // Tag: TP_ID (TP_PTR TP_ID)? modifierlist? attributes?
          case $.TP_ID:
            var node = this.newNodeAndNext('TagStatement', { id: this.token.text });

            // var sub = this.try([$.TP_PTR, $.TP_ID]);
            // if (this.next().token.id === $.TP_PTR) {
            //   this.next().expect($.TP_ID);
            //   node.method = this.token.id;
            //   this.next();
            // }

            node.modifiers = this.try($_.modifierlist);
            node.attributes = this.try($_.attributes);

            return node;

          // Echo: TP_SMARTYBLOCKCHILDPARENT
          case $.TP_SMARTYBLOCKCHILDPARENT:
            return this.newNode('TP_SMARTYBLOCKCHILDPARENT', { value: this.token.text });

          // Assign:
          //   (varindexed|TP_DOLLARID) TP_EQUAL (value|expr|variable) attributes?
          case $.TP_DOLLARID:
          case $.TP_DOLLAR: // varindexed started with TP_DOLLARID or TP_DOLLAR
            var left, right, attrs;
            if (this.token.id === $.TP_DOLLARID && this.token.next.id === $.TP_EQUAL) {
              left = this.newNode('Identifier', { name: this.token.text.slice(1) });
              this.next().next();
            } else {
              left = this.try([$_.varindexed, $.TP_EQUAL]);
              if (left) left = left[0];
            }
            if (!left) {
              break;
            }

            right = this.read($_.expr);

            attrs = this.try($_.attributes) || [];

            // this.trace('TAG ASSIGNMENT', left, right, attrs);

            return this.newNode('AssignmentExpression', {
              operator: '=', // TP_EQUAL
              left: left,
              right: right,
              attributes: attrs
            });
        }
    }

    // EchoStatement: (variable|value|expr) attributes?
    var expr = this.read($_.expr);
    // this.trace('EXPR', expr);

    var node = this.newNode('EchoStatement', { value: expr });

    var attrs = this.try($_.attributes);
    if (attrs) {
      node.attributes = attrs;
    }

    // this.trace(node);
    return node;
  },

  /**
   * attributes
   *   : attributes attribute -> $1.concat($2)
   *   | attribute -> [$1]
   */
  attributes: function() {
    var res = [], el;
    while (el = this.try($_.attribute)) {
      res.push(el);
    }
    return res.length? res : false;
  },

  /**
   * attribute
   *   : TP_SPACE TP_ID TP_EQUAL TP_ID
   *   | TP_SPACE TP_INTEGER TP_EQUAL expr
   *   | TP_SPACE (TP_ID|expr|value)
   *   | TP_ATTR (expr|value)
   */
  attribute: function() {
    var res;
    this.expect([$.TP_SPACE, $.TP_ATTR]);

    if (this.token.id === $.TP_ATTR) {
      return this.newNode('Property', {
        key: this.newNodeAndNext('Identifier', { name: this.token.text.replace(/^\s*|=$/g, '') }),
        value: this.read($_.expr),
      });
    }

    // skip TP_SPACE
    this.read($.TP_SPACE);

    if (res = this.try([$.TP_ID, $.TP_EQUAL, $.TP_ID])) {
      res[0] = this.newNode('Identifier', { name: res[0].text, raw: res[0].text });
      res[2] = this.newNode('Identifier', { name: res[2].text, raw: res[2].text });
    } else if (res = this.try([$.TP_INTEGER, $.TP_EQUAL, $_.expr])) {
      res[0] = this.newNode('Literal', { name: Number(res[0].text), raw: res[0].text });
    }

    if (!res && (res = this.try($_.expr))) {
      return res;
    }

    return this.newNode('Property', {
      key: res[0],
      value: res[2]
    });
  },

  /**
   * statements
   *   : statement                       -> [$1]
   *   | statements TP_COMMA statement      { $$ = $1; $$[] = $2 }
   */
  statements: function() {
    var res = [], el;
    res.push(this.read($_.statement));
    while (el = this.try([$.TP_COMMA, $_.statement])) {
      res.push(el[1]);
    }
    return res;
  },

  /**
   * statement
   *   | varindexed TP_EQUAL expr        -> {'var': $1, value: $3}
   *   : TP_DOLLARID TP_EQUAL TP_INTEGER -> {'var': '\'' + $1.slice(1) + '\'', value: $3}
   *   | TP_DOLLARID TP_EQUAL expr       -> {'var': '\'' + $1.slice(1) + '\'', value: $3}
   *   | TP_OPENP statement TP_CLOSEP    -> $2
   */
  statement: function() {
    var res;
    if (this.token.id === $.TP_OPENP) {
      return this.read([$.TP_OPENP, $_.statement, $.TP_CLOSEP])[1];
    }

    var left;
    if (this.token.id === $.TP_DOLLARID && this.token.next.id === TP_EQUAL) {
      left = this.token.text;
      this.next().next();
    } else {
      left = this.read($_.varindexed);
    }

    var right = this.read($_.expr);

    return { left: left, right: right };
  },

  /**
   * expr
   *   | TP_DOLLARID TP_COLON TP_ID -> '$_smarty_tpl->getStreamVariable(\'' + $1.slice(1) + '://' + $3 + '\')';
   *   : ternary
   *   | value
   *   | array
   *   | variable TP_INSTANCEOF ns1 -> $1 + $2 + $3
   *   | expr (TP_MATH|TP_UNIMATH) value -> $1 + this.trim($2) + $3
   *   | expr (scond|modifierlist)  -> $2 + $1 + ')'
   *   | expr lop expr              -> ($2.pre || '') + $1 + $2.op + $3 + ($2.pre || '')
   *   | expr TP_ISIN (array|value) -> 'in_array(' + $1 + ',' + $3 + ')'
   */
  expr: function() {
    if (this.token.id === $.TP_DOLLARID && this.token.next.id === $.TP_COLON) {
      var left = this.token.text;
      this.read($.TP_COLON).read($.TP_ID);
      return this.newNode('StreamExpression', { left: left, right: this.token.text });
    }

    var res;

    // array or ternary?
    res = this.try($_.ternary)
      || this.try($_.array);

    if (!res && (res = this.try([$_.variable, $.TP_INSTANCEOF, $_.ns1]))) {
      return this.newNode('BinaryExpression', {
        operator: 'instanceof',
        left: { type: 'Identifier', name: res[0] },
        right: { type: 'Identifier', name: res[2] }
      });
    }

    res = res || this.try($_.value);

    // (scond|modifierlist)  -> $2 + $1 + ')'
    // lop expr              -> ($2.pre || '') + $1 + $2.op + $3 + ($2.pre || '')
    // (TP_MATH|TP_UNIMATH) value -> $1 + this.trim($2) + $3
    // TP_ISIN (array|value) -> 'in_array(' + $1 + ',' + $3 + ')'
    var postfix;
    while (postfix =
      this.try([$.TP_MATH, $_.value])
      || this.try([$.TP_UNIMATH, $_.value])
      || this.try([$.TP_ISIN, $_.array])
      || this.try([$.TP_ISIN, $_.value])
      || this.try([$_.lop, $_.expr])
      || this.try($_.scond)
      // || this.try($_.modifierlist)
    ) {
      if (Array.isArray(postfix)) {
        res = this.newNode('BinaryExpression', {
          operator: postfix[0].text.trim(),
          left: res,
          right: postfix[1],
        });
      } else if (postfix[0].id === $.TP_SINGLECOND) { // single condition
        res = this.newNode('UnaryExpression', {
          operator: postfix,
          argument: res,
          prefix: false,
        });
      }
      // this.trace('EXPR postfix', postfix);
    }
    // this.trace('EXPR', res);

    return res;
  },

  /**
   * ternary
   *   : TP_OPENP expr TP_CLOSEP TP_QMARK TP_DOLLARID TP_COLON expr {
   *   | TP_OPENP expr TP_CLOSEP TP_QMARK expr TP_COLON expr {
   */
  ternary: function() {
    this.throwError();
  },

  /**
   * value
   *   | function
   *   : variable TP_INCDEC?      -> $1 + $2
   *   | TP_SINGLEQUOTESTRING
   *   | TP_ID
   *   | TP_HEX
   *   | TP_NAMESPACE
   *   | TP_INTEGER? (TP_DOT? TP_INTEGER?)?
   *   | TP_OPENP expr TP_CLOSEP -> "(" + e + ")"
   *   | doublequoted_with_quotes
   *   | varindexed TP_DOUBLECOLON static_class_access
   *   | smartytag
   *   | ns1 TP_DOUBLECOLON static_class_access
   *
   *   | (TP_UNIMATH|TP_TYPECAST|TP_NOT) value
   *   | value modifierlist
   */
  value: function() {
    var res;
    var modsAllowed = this.token.prev.id !== $.TP_COLON;

    // value: TP_UNIMATH|TP_TYPECAST|TP_NOT value
    var prefix = this.try($.TP_UNIMATH)
      || this.try($.TP_TYPECAST)
      || this.try($.TP_NOT);

    res = res || this.try($_.function);

    // variable TP_INCDEC?
    if (!res && (res = this.try($_.variable))) {
      if (this.token.id === $.TP_INCDEC) {
        res = this.newNodeAndNext('UpdateExpression', {
          operator: this.token.text,
          argument: res,
          prefix: false,
        });
      }
    }

    // this.trace('VALUE pre', res);

    switch (res? 0 : this.token.id) {
      case $.TP_QUOTE:
        res = this.read($_.doublequoted_with_quotes);
        break;
      case $.TP_SINGLEQUOTESTRING:
        res = this.newNodeAndNext('Literal', {
          value: _unslash(this.token.text.slice(1, -1))
        });
        break;
      case $.TP_ID:
      case $.TP_NAMESPACE:
        res = this.newNode('Literal', { value: this.token.text });
        break;
      case $.TP_HEX:
        res = this.newNodeAndNext('Literal', { value: parseInt(this.token.text, 16) });
        break;

      // TP_INTEGER? (TP_DOT? TP_INTEGER?)?
      case $.TP_DOT:
      case $.TP_INTEGER:
        if (this.token.id === this.token.next.id) this.throwError([$.TP_DOT, $.TP_INTEGER]);
        res = '';
        if (this.token.id === $.TP_INTEGER) res += this.next().token.prev.text;
        if (this.token.id === $.TP_DOT) res += this.next().token.prev.text;
        if (this.token.id === $.TP_INTEGER) res += this.next().token.prev.text;
        res = this.newNode('Literal', { value: Number(res) });
        break;
    }

    res = res || this.throwError('Oops!');

    // value: value modifierlist
    var mods = modsAllowed? this.try($_.modifierlist) : null;

    if (mods) {
      var node = mods;
      while (node.arguments[0] && node.arguments[0].type === 'CallExpression') {
        node = node.arguments[0];
      }
      node.arguments.unshift(res);
      res = mods;
      // this.trace('VALUE @MODS', node, res);
    }

    // value: TP_UNIMATH|TP_TYPECAST|TP_NOT value
    if (prefix) {
      res = this.newNode('UnaryExpression', {
        operator: this.token.text,
        argument: res,
        prefix: true,
      });
    }

    // this.trace('VALUE res', res);

    return res;
  },

  /**
   * ns1
   *   : TP_ID
   *   | TP_NAMESPACE
   */
  ns1: function() {
    this.expect([$.TP_ID, $.TP_NAMESPACE]);
    return this.newNodeAndNext('Identifier', { name: this.token.text });
  },

  /**
   * variable
   *   : TP_DOLLARID           -> this.compiler.compileVariable('\'' + $1.slice(1) + '\'')
   *   | TP_HATCH (TP_ID | variable) TP_HATCH arrayindex? -> '$_smarty_tpl->getConfigVariable( ' + $2 + ')'
   *   | varvar TP_AT TP_ID    -> '$_smarty_tpl->tpl_vars[' + $1 + ']->' + $3
   *   | varindexed
   *   | object
   */
  variable: function() {
    if (this.token.id === $.TP_DOLLARID && [$.TP_DOT, $.TP_OPENB, $.TP_PTR].indexOf(this.token.next.id) === -1) {
      return this.newNodeAndNext('Identifier', { name: this.token.text.slice(1) });
    }

    // TP_HATCH (TP_ID | variable) TP_HATCH arrayindex? -> '$_smarty_tpl->getConfigVariable( ' + $2 + ')'
    var body;
    if (this.token.id === $.TP_HATCH) {
      this.next();
      body = this.token.id === $.TP_ID? this.next().token.prev.text : this.read('variable');
      this.read($.TP_HATCH);
      var postfix = this.try($_.arrayindex);
      return this.newNode('ConfigVariable', { value: body, postfix: postfix });
    }

    // varvar TP_AT TP_ID    -> '$_smarty_tpl->tpl_vars[' + $1 + ']->' + $3
    if (body = this.try([$_.varvar, $.TP_AT, $.TP_ID])) {
      this.trace('TODO: VARIABLE BODY varvar@id');
      this.throwError('TODO: VARIABLE BODY varvar@id');
    }

    // this.trace('VARIABLE');

    body = this.try($_.object)
      || this.try($_.varindexed)
      || this.throwError([$.TP_DOLLARID, $.TP_HATCH, 'varvar', 'varindexed', 'object']);

    // this.trace('VARIABLE', body);
    return body;
  },

  /**
   * varindexed
   *   : TP_DOLLARID arrayindex {
   *   | varvar arrayindex {
   */
  varindexed: function() {
    var res = this.try([$_.varvar, $_.arrayindex]);
    if (!res && (res = this.try([$.TP_DOLLARID, $_.arrayindex]))) {
      res[0] = this.newNode('Identifier', { name: res[0].text.slice(1), raw: res[0].text });
    }
    if (!res) {
      this.throwError([$.TP_DOLLARID, 'varvar']);
    }

    var expr = res[1];
    var node = expr;
    while (node.object) { node = node.object; }
    node.object = res[0];
    return expr;
  },

  /**
   * arrayindex
   *   : arrayindex indexdef -> $1 + $2
   */
  arrayindex: function() {
    var res, el;
    res = this.read($_.indexdef);
    while (el = this.try($_.indexdef)) {
      el.object = res;
      res = el;
    }
    return res;
  },

  /**
   * indexdef
   *   : TP_DOT TP_DOLLARID
   *   | TP_DOT TP_ID
   *   | TP_DOT TP_INTEGER             -> '[' + $2 + ']'
   *   | TP_DOT varvar (TP_AT TP_ID)? {
   *   | TP_DOT TP_LDEL expr TP_RDEL   -> '[' + $3 + ']'
   *   | TP_OPENB TP_ID (TP_DOT TP_ID)? TP_CLOSEB {
   *   | TP_OPENB TP_SINGLEQUOTESTRING TP_CLOSEB -> '[' + $2 + ']'
   *   | TP_OPENB TP_INTEGER TP_CLOSEB           -> '[' + $2 + ']'
   *   | TP_OPENB TP_DOLLARID TP_CLOSEB {
   *   | TP_OPENB variable TP_CLOSEB             -> '[' + $2 + ']'
   *   | TP_OPENB value TP_CLOSEB                -> '[' + $2 + ']'
   *   | TP_OPENB expr TP_CLOSEB                 -> '[' + $2 + ']'
   *   | TP_OPENB TP_CLOSEB                      -> '[]'
   */
  indexdef: function() {
    var property;
    this.expect([$.TP_DOT, $.TP_OPENB]);

    if (this.is($.TP_DOT)) {
      this.next();
      // TODO: varvar (TP_AT TP_ID)?
      var property;
      switch (this.token.id) {
        case $.TP_ID:
          property = this.newNodeAndNext('Literal', { value: this.token.text });
          break;
        case $.TP_INTEGER:
          property = this.newNodeAndNext('Literal', { value: Number(this.token.text) });
          break;
        case $.TP_DOLLARID:
          property = this.newNodeAndNext('Identifier', { name: this.token.text.slice(1) });
          break;
        case $.TP_LDEL:
          property = this.next().try($_.expr);
          this.read($.TP_RDEL);
          break;
      }
      property || this.throwError([$.TP_ID, $.TP_INTEGER, $.TP_DOLLARID, $.TP_LDEL]);

      return this.newNode('MemberExpression', {
        object: null,
        property: property,
        computed: false,
        pointer: false,
      });
    }

    this.next(); // skip openb
    if (this.token.id === $.TP_CLOSEB) {
      return trace.throwError('TODO: `…[]` is unsupported atm.');
      return this.throwError('TODO: `…[]` is unsupported atm.');
    }

    if (this.token.next.id === $.TP_CLOSEB) {
      switch (this.token.id) {
        case $.TP_SINGLEQUOTESTRING:
          property = this.newNodeAndNext('Literal', { value: this.token.text.slice(1, -1) });
          break;
        case $.TP_ID:
          property = this.newNodeAndNext('Literal', { value: this.token.text });
          break;
        case $.TP_INTEGER:
          property = this.newNodeAndNext('Literal', { value: Number(this.token.text) });
          break;
        case $.TP_DOLLARID:
          property = this.newNodeAndNext('Identifier', { name: this.token.text.slice(1) });
          break;
      }
      this.next();

      return this.newNode('MemberExpression', {
        object: null,
        property: property,
        computed: true,
        pointer: false,
      });
    }

    var res = this.try([$.TP_ID, $.TP_DOT, $.TP_ID, $.TP_CLOSEB]);
    if (res) {
      this.trace('TODO: `…[aaa.bbb]` is unsupported atm.')
      this.throwError('TODO: `…[aaa.bbb]` is unsupported atm.')
    }

    res = this.try([$_.value, $.TP_CLOSEB])
      || this.try([$_.expr, $.TP_CLOSEB])
      || this.throwError([$.TP_ID, $.TP_SINGLEQUOTESTRING, $.TP_INTEGER, $.TP_DOLLARID,
        'value', 'expr', $.TP_CLOSEB]);

    // this.trace('INDEXDEF: ', body);

    property = res[0];
    return this.newNode('MemberExpression', {
      object: null,
      property: property,
      computed: true,
      pointer: false,
    });
  },

  /**
   * varvar
   *   : TP_DOLLARID           - single identifier element
   *   | TP_DOLLAR             - single $
   *   // varvar varvarele      - sequence of identifier elements
   */
  varvar: function() {
    this.expect([$.TP_DOLLARID, $.TP_DOLLAR]);

    var ref = this.is($.TP_DOLLARID)?
      this.newNode('Identifier', { name: this.token.text.slice(1) })
      : this.newNode('GGExpression', { name: '' });
    this.next();

    return ref;

    // varvar varvarele      - sequence of identifier elements
    var sub = [], el;
    while (el = this.try($_.varvarele)) {
      sub.push(el);
    }

    return { id : id, sub: sub };
  },

  /**
   * varvarele
   *   : TP_ID                - fix sections of element -> '\'' + $1 + '\''
   *   | TP_LDEL expr TP_RDEL - variable sections of element -> '(' + $2 + ')'
   */
  varvarele: function() {
    if (this.is($.TP_ID)) {
      return '\'' + this.token.text + '\'';
    }
    this.read($.TP_LDEL);
    var expr = this.read('expr');
    this.read($.TP_RDEL);
    return expr;
  },

  /**
   * object
   *   : (varindexed|TP_DOLLARID) objectchain
   */
  object: function() {
    this.expect(['varindexed', $.TP_DOLLARID]);

    var object = this.try($_.varindexed)
      || this.newNodeAndNext('Identifier', { name: this.token.text.slice(1) });

    // this.trace('OBJECT obj', object);

    var chain = this.read($_.objectchain);
    // this.trace('OBJECT chain', chain);

    return _wrapObjectMember(chain, object);
  },

  /**
   * objectchain
   *   : objectelement+
   */
  objectchain: function() {
    var res = this.read($_.objectelement), el;
    while (el = this.try($_.objectelement)) {
      res = _wrapObjectMember(el, res);
    }
    // this.trace('CHAIN', res);
    return res;
  },

  /**
   * objectelement
   *   // ??? | TP_PTR method -> '->' + $2
   *   | TP_PTR (varvar|TP_ID (TP_LDEL expr TP_RDEL)?) arrayindex?
   */
  objectelement: function() {
    this.read($.TP_PTR);
    this.expect([$.TP_ID, $.TP_DOLLARID, $.TP_DOLLAR]);

    // var method = this.try($_.method);
    // if (method) {
    //   this.trace('OBJECTELEMENT method', method);
    //   return method;
    // }

    var res = this.try($_.varvar);
    if (!res && this.token.id === $.TP_ID) {
      res = this.newNodeAndNext('Literal', { value: this.token.text });
      if (this.token.id === $.TP_LDEL) {
        var _expr = this.try([$.TP_LDEL, $_.expr, $.TP_RDEL]);
        if (_expr) {
          this.trace('TODO OBJECTELEMENT id{expr}', res, _expr[1]);
          this.throwError('TODO OBJECTELEMENT id{expr}');
        }
      }
    }

    if (!res) {
      this.throwError([/*'method', */'varvar', $.TP_ID]);
    }

    res = this.newNode('MemberExpression', {
      object: null,
      property: res,
      computed: false,
      pointer: true,
    });

    // this.trace('OBJECTELEMENT res', res);
    var suffix = this.try($_.arrayindex);
    if (suffix) {
      // this.trace('OBJECTELEMENT $id.deep.fields', suffix);
      res = _wrapObjectMember(suffix, res);
    }
    // this.trace('OBJECTELEMENT', res);

    return res;
  },

  /**
   * function
   *   : (ns1|variable) TP_OPENP params? TP_CLOSEP
   */
  'function': function() {
    var callee = this.try($_.ns1)
      || this.try($_.variable)
      || this.throwError('ns1', 'variable');

    // this.trace('FUNCTION', callee);
    var res = this.newNode('CallExpression', {
      callee: callee,
      arguments: null,
    });

    this.read($.TP_OPENP);
    res.arguments = this.try($_.params) || [];
    this.read($.TP_CLOSEP);

    // this.trace('FUNCTION', res);

    return res;
  },

  /**
   * method - something(arg1, arg2, arg3)
   *   : (TP_ID|TP_DOLLARID) TP_OPENP params? TP_CLOSEP
   */
  method: function() {
    this.expect([$.TP_ID, $.TP_DOLLARID]);

    var res = this.newNodeAndNext('CallExpression', {
      callee: this.newNode('Identifier', { name: this.token.text.replace(/^\$/, '') }),
      arguments: null,
    });

    this.read($.TP_OPENP);
    res.arguments = this.try($_.params) || [];
    this.read($.TP_CLOSEP);

    // this.trace('METHOD', res);

    return res;
  },

  /**
   * params
   *   | (value|expr) (TP_COMMA (value|variable|expr))* -> [$1]
   */
  params: function() {
    var el, res = [this.read($_.expr)];
    while (el = this.try([$.TP_COMMA, $_.expr])) {
      res.push(el[1]);
    }
    // this.trace('PARAMS', res);
    return res;
  },

  /**
   * modifierlist
   *   : modifier+
   */
  modifierlist: function() {
    var el, res = this.read($_.modifier);
    while (el = this.try($_.modifier)) {
      el.arguments.unshift(res);
      res = el;
    }
    // this.trace('MODIFIERLIST', res);
    return res;
  },

  /**
   * modifier
   *   : TP_VERT TP_AT? TP_ID modparameters?
   */
  modifier: function() {
    this.read($.TP_VERT);
    var at = this.try($.TP_AT);
    var id = this.read($.TP_ID);
    var args = this.try($_.modparameters) || [];
    return this.newNode('CallExpression', {
      callee: this.newNode('Identifier', { name: id.text }),
      arguments: args,
      modifier: true,
      at: !!at,
    });
  },

  /**
   * modparameters
   *   | (TP_COLON (value|array))* -> [$2]
   */
  modparameters: function() {
    var res = [], el;
    while (el = this.try([$.TP_COLON, $_.value]) || this.try([$.TP_COLON, $_.array])) {
      res.push(el[1]);
    }
    // this.trace('MODPARAMS', res);
    return res;
  },

  /**
   * static_class_access
   *   : method                 -> [$1, '', 'method']
   *   | method objectchain     -> [$1, $2, 'method']
   *   | TP_ID                  -> [$1, '']
   *   | TP_DOLLARID arrayindex -> [$1, $2, 'property']
   *   | TP_DOLLARID arrayindex objectchain -> [$1, $2 + $3, 'property']
   */
  static_class_access: function() {
    this.trace('TODO: static_class_access');
    this.throwError('TODO: static_class_access');
  },

  /**
   * lop
   *   : TP_LOGOP { $$.op = ' ' + this.trim($1) + ' ' }
   *   | TP_TLOGOP {
   */
  lop: function() {
    this.expect([$.TP_LOGOP, $.TP_TLOGOP]);

    return this.next().token.prev;
  },

  /**
   * scond
   *   : TP_SINGLECOND {
   */
  scond: function() {
    this.expect($.TP_SINGLECOND);
    this.trace('TODO: scond');
    this.throwError('TODO: scond');
  },

  /**
   * array
   *   : TP_OPENB (arrayelement TP_COMMA)* arrayelement? TP_CLOSEB -> '[' + $2 + ']'
   */
  array: function() {
    this.read($.TP_OPENB);
    var res = [], el;
    while (el = this.try([$_.arrayelement, $.TP_COMMA])) {
      res.push(el[0]);
    }
    if (el = this.try($_.arrayelement)) {
      res.push(el);
    }
    this.read($.TP_CLOSEB);

    var elements = [], properties = [];
    res.forEach(function (el) {
      (el.type === 'Property'? properties : elements).push(el);
    });

    var data = {};
    if (!properties.length) {
      return this.newNode('ArrayExpression', { elements: elements });
    }
    if (!elements.length) {
      return this.newNode('ObjectExpression', { properties: properties });
    }

    return this.newNode('AssocArrayExpression', {
        elements: elements,
        properties: properties
    });
  },

  /**
   * arrayelement
   *   : value TP_APTR expr -> $1 + '=>' + $2
   *   | TP_ID TP_APTR expr -> '\'' + $1 + '\'=>' + $2 — TODO: really?
   *   | expr
   */
  arrayelement: function() {
    var assoc;
    if (this.token.id === $.TP_ID && this.token.next.id === $.TP_APTR) {
      assoc = [this.newNode('Literal', { value: this.token.text })];
      this.next().next();
    }
    if (!assoc && (assoc = this.try([$_.value, $.TP_APTR]))) {
      assoc = assoc[0];
    }

    if (assoc) {
      return this.newNode('Property', {
        key: assoc,
        value: this.read($_.expr),
      });
    }

    return this.read($_.expr);
  },

  /**
   * doublequoted_with_quotes
   *   : TP_QUOTE doublequoted? TP_QUOTE -> $2.to_smarty_php(this)
   * doublequoted
   *   : doublequotedcontent*
   */
  doublequoted_with_quotes: function() {
    this.expect($.TP_QUOTE).next();
    // doublequotedcontent*
    var body = [];
    if (this.token.id !== $.TP_QUOTE) {
      while (el = this.try($_.doublequotedcontent)) {
        body.push(el);
      }
    }
    this.expect($.TP_QUOTE).next();

    var quasis = [];
    var expressions = [];

    for (var i = 0, l = body.length; i < l; i += 1) {
      var el = body[i];
      if (typeof el === 'string' || !el) {
        quasis.push(this.newNode('TemplateElement', { value: el || '', tail: false }));
      } else {
        quasis.push(this.newNode('TemplateElement', { value: '', tail: false }));
        expressions.push(el);
      }
    }
    if (quasis.length === expressions.length) {
      quasis.push(this.newNode('TemplateElement', { value: '', tail: false }));
    }
    quasis[quasis.length - 1].tail = true;

    return this.newNode('TemplateLiteral', { quasis: quasis, expressions: expressions });
  },

  /**
   * doublequotedcontent
   *   : TP_TEXT
   *   | TP_BACKTICK (variable|expr) TP_BACKTICK
   *   | TP_DOLLARID
   *   | TP_LDEL variable TP_RDEL
   *   | TP_LDEL expr TP_RDEL
   *   | smartytag
   */
  doublequotedcontent: function() {
    switch (this.token.id) {
      // TP_TEXT → token
      case $.TP_TEXT:
        return _unslash(this.next().token.prev.text || '');

      // : TP_BACKTICK (variable|expr) TP_BACKTICK {
      case $.TP_BACKTICK:
        this.next();
        body = this.try($_.variable)
          || this.try($_.expr)
          || this.throwError('variable', 'expr');
        this.read($.TP_BACKTICK);
        return body;

      // | TP_DOLLARID {
      case $.TP_DOLLARID:
        return this.newNodeAndNext('Identifier', { name: this.token.text.slice(1) });

      // | TP_LDEL (variable|expr) TP_RDEL {
      case $.TP_LDEL:
        this.next();
        var body = this.try($_.variable)
          || this.try($_.expr)
          || this.throwError(['variable', 'expr']);
        this.read($.TP_RDEL);
        return body;

      // | smartytag {
      default:
        var smartytag = this.try($_.smartytag)
          || this.throwError([$.TP_TEXT, $.TP_BACKTICK, $.TP_DOLLARID, $.TP_LDEL, 'smartytag']);
        return smartytag;
    }
  },

/*if: function() {
    return this.newNode('If', {
      test: null, // Expression
      consequent: [], // Node[]
      alternate: null // Node[] | null
    });
  },
  forStatement: function() {
    return this.newNode('ForStatement', {
      // ?
    });
  },*/

  /**
   * ForEachStatement
   *  | TP_LDELFOREACH (TP_SPACE (expr | value)? TP_AS (varvar TP_APTR)? varvar)? attributes?
   */
  /*forEach: function() {
    return this.newNode('ForEachStatement', {
      left: null, // Expression
      right: null,
      body: [], // Node[]
      alternate: null // Node[] | null
    });
  },*/

  /**
   * SetFilter node
   *   TP_ID modparameters modifierlist?
   *
  setFilter: function() {
    return this.newNode('setFilter', this._readElementsUntil($.TP_SETFILTER_OFF));
  },

  closingPseudo: function() {
    throw new Error('Ooouch!!! ' + _getTokenName(this.token.id));
  },

  closingPseudo: function() {
    throw new Error('No implementation readClosingPseudo at token ' + _getTokenName(this.token.id));
  },*/
};

function _unslash(str) {
  var regexp = /\\(([abfnrtv])|o?([0-7]{1,3})|x([\da-fA-F]{1,2})|.)/g; // '"
  var symbols = {a: '\7', b: '\10', f: '\14', n: '\n', r: '\r', t: '\t', v: '\13'}; // , '\'': '\'', '"': '"'

  return str.replace(regexp, function (full, asis, seq, oct, hex) {
    if (seq) {
      return symbols[seq] || seq;
    } else if (oct || hex) {
      return String.fromCharCode(parseInt(oct, oct ? 8 : 18));
    } else {
      return asis;
    }
  });
}

function _wrapObjectMember(tree, object) {
  var node = tree;
  if (node.callee) {
//    node = tree.callee;
  }
  while (node.object) {
    node = node.object;
  }
  node.object = object;
  return tree;
}
