var enums = require('../enums');

module.exports = {
    Position: Position,
    SourceLocation: SourceLocation,

    Node: Node,
    SourceLocation: SourceLocation,
    Position: Position,

    Document: Document,

    Literal: Literal,
    Statement: Statement,
    InlineStatement: InlineStatement,
    BlockStatement: BlockStatement,

    Attribute: Attribute,
    // IfStatement,
    // Identifier,
    // WhileStatement,
};

// Essensial
// ----------

/** @interface */
function Node () {}
/** @type {string} */
Node.prototype.type = null;
/** @type {?SourceLocation} */
Node.prototype.loc = null;

/**
 * SourceLocation
 *
 * @class
 * @param {Position} start - First position
 * @param {Position} end - Last position
 * @param {?string} source -
 */
function SourceLocation (start, end, source) {
  this.start = new Position(start);
  this.end = new Position(end);
  if (source) this.source = source;
}
/** @type {?string} */
SourceLocation.prototype.source = null;
/** @type {Position} */
SourceLocation.prototype.start = null;
/** @type {Position} */
SourceLocation.prototype.end = null;

SourceLocation.prototype.inspect = function (depth, opts) {
  return '[' +
    this.start.inspect(depth + 1, opts) + ' ' +
    this.end.inspect(depth + 1, opts) + ']';
};

/** @interface */
function Position (pos) {
  this.line = pos.line || pos[0];
  this.column = pos.column || pos[1];
  if (this.line < 1 || this.column < 0) {
    throw new Error('Column should be positive, line should be natural, but got: ' +
      '@' + this.line + ':' + this.column);
  }
}
/** @type {number} */
Position.prototype.line = 1;
/** @type {number} */
Position.prototype.column = 0;

Position.prototype.inspect = function (depth, opts) {
  if (!opts || !opts.stylize) return this.line + ':' + this.column;
  return opts.stylize(this.line, 'number') +
    ':' + opts.stylize(this.column, 'number');
};

// Core
// ----

/** @constructor */
function Document () {} _inherits(Document, Node);
/** @type {string} */
Document.prototype.type = 'Document';
/** @type {Statement[]} */
Document.prototype.body = [];


// Basics
// ------

/** @constructor */
function Attribute () {} _inherits(Attribute, Node);
/** @type {string} */
Attribute.prototype.type = "Attribute";
/** @type {string} */
Attribute.prototype.left = null;
/** @type {Expression} */
Attribute.prototype.right = null;

/** @interface */
function Statement () {} _inherits(Statement, Node);

/** @interface */
function InlineStatement () {} _inherits(InlineStatement, Statement);
/** @type {?Attribute[]} */
InlineStatement.prototype.attributes = null;

/** @interface */
function BlockStatement () {} _inherits(BlockStatement, Statement);
/** @type {Statement[]} */
BlockStatement.prototype.body = [];
/** @type {?Attribute[]} */
BlockStatement.prototype.attributes = null;

/** @interface */
function Expression () {} _inherits(Expression, Node);

/** @interface */
function Identifier () {} _inherits(Identifier, Node);
/** @type {string} */
Identifier.prototype.type = 'Identifier';
/** @type {string} */
Identifier.prototype.name = null;

/** @interface */
function Literal () {} _inherits(Literal, Node);
/** @type {string} */
Literal.prototype.type = 'Literal';
/** @type {?string|boolean|number} */
Literal.prototype.value = null;

// Statements
// ----------

/** @interface */
function IfStatement () {} _inherits(IfStatement, Statement);
/** @type {string} */
IfStatement.prototype.type = "IfStatement";
/** @type {Expression} */
IfStatement.prototype.test = null;
/** @type {Statement[]} */
IfStatement.prototype.consequent = null;
/** @type {?Statement[]} */
IfStatement.prototype.alternate = null;

// {while $foo > $bar}{/while}
/** @interface */
function WhileStatement () {} _inherits(WhileStatement, BlockStatement);
/** @type {string} */
WhileStatement.prototype.type = "WhileStatement";
/** @type {Expression} */
WhileStatement.prototype.test = null;
/** @type {Statement[]} */
WhileStatement.prototype.body = [];

/** @interface */
function BreakStatement () {} _inherits(BreakStatement, Statement);
/** @type {string} */
BreakStatement.prototype.type = "BreakStatement";
/** @type {?Identifier} */
BreakStatement.prototype.label = null;

/** @interface */
function ContinueStatement () {} _inherits(ContinueStatement, Statement);
/** @type {string} */
ContinueStatement.prototype.type = "ContinueStatement";
/** @type {?number} */
ContinueStatement.prototype.label = null;

/** @interface */
function ReturnStatement () {} _inherits(ReturnStatement, Statement);
/** @type {string} */
ReturnStatement.prototype.type = "ReturnStatement";
/** @type {?Expression} */
ReturnStatement.prototype.argument = null;

// {section loop=$array item=el key=k}...[{sectionelse}...]{/section}
/** @interface */
function SectionStatement () {} _inherits(SectionStatement, BlockStatement);
/** @type {string} */
SectionStatement.prototype.type = "SectionStatement";
/** @type {Identifier} */
SectionStatement.prototype.left = null;
/** @type {Expression} */
SectionStatement.prototype.right = null;
/** @type {?Expression} */
SectionStatement.prototype.start = null;
/** @type {?Expression} */
SectionStatement.prototype.step = null;
/** @type {?Statement[]} */
SectionStatement.prototype.alternate = null;

// {for $var=$start to $end step $step}
/** @interface */
function ForRangeStatement () {} _inherits(ForRangeStatement, BlockStatement);
/** @type {string} */
ForRangeStatement.prototype.type = "ForRangeStatement";
/** @type {Identifier} */
ForRangeStatement.prototype.left = null;
/** @type {Expression} */
ForRangeStatement.prototype.start = null;
/** @type {Expression} */
ForRangeStatement.prototype.end = null;
/** @type {?Expression} */
ForRangeStatement.prototype.step = null;
/** @type {?Statement[]} */
ForRangeStatement.prototype.alternate = null;

// {foreach from=$array item=el key=k}...[{foreachelse}...]{/foreach}
/** @interface */
function ForEachStatement () {} _inherits(ForEachStatement, BlockStatement);
/** @type {string} */
ForEachStatement.prototype.type = "ForEachStatement";
/** @type {Identifier} */
ForEachStatement.prototype.left = null;
/** @type {?Expression} */
ForEachStatement.prototype.right = null;
/** @type {?Identifier} */
ForEachStatement.prototype.key = null;
/** @type {?Statement[]} */
ForEachStatement.prototype.alternate = null;

/** @interface */
function CustomStatement () {} _inherits(CustomStatement, InlineStatement);
/** @type {string} */
CustomStatement.prototype.type = "CustomStatement";
/** @type {Identifier} */
CustomStatement.prototype.name = null;

/** @interface */
function CustomBlockStatement () {} _inherits(CustomBlockStatement, BlockStatement);
/** @type {string} */
CustomBlockStatement.prototype.type = "CustomBlockStatement";
/** @type {Identifier} */
CustomBlockStatement.prototype.name = null;


// Expressions
// -----------

/** @constructor */
function ThisExpression () {} _inherits(ThisExpression, Expression);
/** @type {string} */
ThisExpression.prototype.type = "ThisExpression";

/** @constructor */
function ArrayExpression () {} _inherits(ArrayExpression, Expression);
/** @type {string} */
ArrayExpression.prototype.type = "ArrayExpression";
/** @type {Array.<?Expression>} */
ArrayExpression.prototype.elements = [];

/** @constructor */
function Property () {} _inherits(Property, Node);
/** @type {string} */
Property.prototype.type = "Property";
/** @type {Literal|Identifier} */
Property.prototype.key = null;
/** @type {Expression} */
Property.prototype.value = null;

/** @constructor */
function UnaryExpression () {} _inherits(UnaryExpression, Expression);
/** @type {string} */
UnaryExpression.prototype.type = "UnaryExpression";
/** @type {UnaryOperator} */
UnaryExpression.prototype.operator = null;
/** @type {boolean} */
UnaryExpression.prototype.prefix = true;
/** @type {Expression} */
UnaryExpression.prototype.argument = null;

/** @constructor */
function BinaryExpression () {} _inherits(BinaryExpression, Expression);
/** @type {string} */
BinaryExpression.prototype.type = "BinaryExpression";
/** @type {BinaryOperator} */
BinaryExpression.prototype.operator = null;
/** @type {Expression} */
BinaryExpression.prototype.left = null;
/** @type {Expression} */
BinaryExpression.prototype.right = null;

/** @constructor */
function UpdateExpression () {} _inherits(UpdateExpression, Expression);
/** @type {string} */
UpdateExpression.prototype.type = "UpdateExpression";
/** @type {UpdateOperator} */
UpdateExpression.prototype.operator = null;
/** @type {Expression} */
UpdateExpression.prototype.argument = null;
/** @type {boolean} */
UpdateExpression.prototype.prefix = null;

/** @constructor */
function LogicalExpression () {} _inherits(LogicalExpression, Expression);
/** @type {string} */
LogicalExpression.prototype.type = "LogicalExpression";
/** @type {LogicalOperator} */
LogicalExpression.prototype.operator = null;
/** @type {Expression} */
LogicalExpression.prototype.left = null;
/** @type {Expression} */
LogicalExpression.prototype.right = null;

/** @constructor */
function ConditionalExpression () {} _inherits(ConditionalExpression, Expression);
/** @type {string} */
ConditionalExpression.prototype.type = "ConditionalExpression";
/** @type {Expression} */
ConditionalExpression.prototype.test = Expression;
/** @type {Expression} */
ConditionalExpression.prototype.alternate = Expression;
/** @type {Expression} */
ConditionalExpression.prototype.consequent = Expression;

/** @constructor */
function CallExpression () {} _inherits(CallExpression, Expression);
/** @type {string} */
CallExpression.prototype.type = "CallExpression";
/** @type {Expression} */
CallExpression.prototype.callee = null;
/** @type {Expression[]} */
CallExpression.prototype.arguments = [];

/** @constructor */
function MemberExpression () {} _inherits(MemberExpression, Expression);
/** @type {string} */
MemberExpression.prototype.type = "MemberExpression";
/** @type {Expression} */
MemberExpression.prototype.object = null;
/** @type {Identifier|Expression} */
MemberExpression.prototype.property = null;
/** @type {boolean} */
MemberExpression.prototype.computed = true;

/** @enum {UnaryOperator} */
var UnaryOperator = new enums.Enum(
    "-", "+", "!", "~"
);

var BinaryOperator = new enums.Enum(
    "==", "!=", "===", "!==",
    "<", "<=", ">", ">=",
    "<<", ">>", ">>>",
    "+", "-", "*", "/", "%",
    "|", "^", "&"
);

var LogicalOperator = new enums.Enum(
    "||", "&&"
);

var AssignmentOperator = new enums.Enum(
    "=", "+=", "-=", "*=", "/=", "%=",
    "<<=", ">>=", ">>>=",
    "|=", "^=", "&="
);

var UpdateOperator = new enums.Enum(
    "++", "--"
);



function _inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
