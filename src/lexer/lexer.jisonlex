/* lexical grammar */

SMARTYldel         "{"
SMARTYrdel         "}"

%import 'bits.jisonlex'
%import 'tokens.jisonlex'

/* Define all possible states
 * ST_TEXT = INITIAL
 * ST_DOUBLE_QUOTES = DOUBLEQUOTEDSTRING
 */
%x ST_LITERAL
%x ST_TAG
%x ST_TAGBODY
%x ST_DOUBLEQUOTEDSTRING

%x ST_CHILDBODY
%x ST_CHILDBLOCK
%x ST_CHILDLITERAL

// %x ST_VAR_OFFSET
// %x ST_LOOKING_FOR_PROPERTY
// %x ST_BACKQUOTE
// %x ST_LOOKING_FOR_VARNAME

%options case-insensitive

%%

/* Import lexer rules
 */
%import 'state_initial.jisonrules'
%import 'state_tag.jisonrules'
%import 'state_tagbody.jisonrules'
%import 'state_literal.jisonrules'
%import 'state_doublequotedstring.jisonrules'
%import 'state_child-related.jisonrules'

// %import 'php_strings.jisonlex'
// %import 'php_main.jisonlex'
// %import 'php_constants.jisonlex'
// %import 'php_mixed.jisonlex'
// %import 'php_numbers.jisonlex'
