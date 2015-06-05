
ldel {SMARTYldel}\s*
rdel \s*{SMARTYrdel}

// LNUM                \d+
// DNUM                (\d*"."\d+)|(\d+"."\d*)
// EXPONENT_DNUM       (({LNUM}|{DNUM})[eE][+-]?{LNUM})
// HNUM                "0x"[0-9a-fA-F]+
// BNUM                "0b"[01]+
// LABEL               [a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*
// WHITESPACE          [ \n\r\t]+
// TABS_AND_SPACES     [ \t]*
// NEWLINE             (\r\n|\n|\r)
// TOKENS              [;:,.\[\]()|^&+-\/*=%!~$<>?@]

linebreak           [\t ]*[\r\n]+[\t ]*
text                [^]
textdoublequoted    ([^\"\\]*?)((?:\\.[^\"\\]*?)*?)(?=({SMARTYldel}|\$|\`\$|\"))
namespace           ([0-9]*[a-zA-Z_]\w*)?(\\[0-9]*[a-zA-Z_]\w*)+
all                 [^]+
emptyjson           "{}"

dollarid            "$"[0-9]*[a-zA-Z_]\w*
namespace           ([0-9]*[a-zA-Z_]\w*)?(\\[0-9]*[a-zA-Z_]\w*)+

// xmltag            \<\?xml\s+([\S\s]*?)\?\>
// PHP_inside        (\'[^\'\\]*(?:\\.[^\'\\]*)*\')|(\"[^\"\\]*(?:\\.[^\"\\]*)*\")|(\/\*(.)*?\*\/)|. //"
// PHP_start         \<\?|\<\?=|\<\?php\s+
// php               {PHP_start}({PHP_inside})*?\?\>
// phpscript         \<script\s+language\s*=\s*[\"\']?\s*php\s*[\"\']?\s*\>((('[^'\\]*(?:\\.[^'\\]*)*')|("[^"\\]*(?:\\.[^"\\]*)*")|(\/\*(.)*?\*\/)|.)*?)\<\/script\>
// phptag_open       {S_LDEL}\s*php\s*(.)*?{S_RDEL}((.)*?){S_LDEL}\s*\/php\s*{S_RDEL}
// phptag_close      {S_LDEL}\s*[\/]?php\s*(.)*?{S_RDEL}
// phptag            {phptag_open}|{phptag_close}
// asp               \<%((('[^'\\]*(?:\\.[^'\\]*)*')|("[^"\\]*(?:\\.[^"\\]*)*")|(\/\*(.)*?\*\/)|.)*?)%\>
// unmatched         (\<(\?(?:php\s+|=)?|(script\s+language\s*=\s*[\"\']?\s*php\s*[\"\']?\s*\>)|%))|\?\>|%\>

// smartyblockchild  \$smarty\.block\.child
// smartyblockparent \$smarty\.block\.parent

slash             "/"

//buggy:
nocacherdel       (\s+"nocache")?\s*{SMARTYrdel}

notblockid        (?:(?!"block")[0-9]*[a-zA-Z_]\w*)
smartyblockchildparent "$smarty.block."("child"|"parent")
integer           \d+
hex               "0"[xX][0-9a-fA-F]+

math              \s*("*"|"/"|"%")\s*
comment           {SMARTYldel}\*
incdec            "++"|"--"
unimath           \s*("+"|"-")\s*
openP             \s*"("\s*
closeP            \s*")"
openB             "["\s*
closeB            \s*"]"
dollar            "$"
dot               "."
comma             \s*","\s*
doublecolon       "::"
colon             \s*":"\s*
at                "@"
hatch             "#"
semicolon         \s*";"
equal             \s*"="\s*
space             \s+
ptr               \s*"->"\s*
aptr              \s*"=>"\s*
singlequotestring \'[^'\\]*(?:\\.[^'\\]*)*\'
backtick          "`"
backtickdollar    "`$"
vert              "|"
andsym            \s*"&"\s*
qmark             \s*"?"\s*
constant          ([_]+[A-Z0-9][0-9A-Z_]*|[A-Z][0-9A-Z_]*)(?![0-9A-Z_]*[a-z])
attr              \s+[0-9]*[a-zA-Z_][a-zA-Z0-9_\-:]*\s*\=\s*
id                [0-9]*[a-zA-Z_]\w*
literal           "literal"
strip             "strip"
lop               \s*(([!=][=]{1,2})|([<][=>]?)|([>][=]?)|[&|]{2})\s*
tlop              \s+("eq"|"ne"|"neq"|"gt"|"ge"|"gte"|"lt"|"le"|"lte"|"mod"|"and"|"or"|"xor"|("is"\s+("not"\s+)?("odd"|"even"|"div")\s+"by"))\s+
scond             \s+"is"\s+("not"\s+)?("odd"|"even")
equals            \s*"=="\s*|\s+"eq"\s+
notequals         \s*"!="\s*|\s*"<>"\s*|\s+"ne"\s+|\s+"neq"\s+
greaterthan       \s*">"\s*|\s+"gt"\s+
lessthan          \s*"<"\s*|\s+"lt"\s+
greaterequal      \s*">="\s*|\s+"ge"\s+|\s+"gte"\s+
lessequal         \s*"<="\s*|\s+"le"\s+|\s+"lte"\s+
mod               \s+"mod"\s+
identity          \s*"==="\s*
noneidentity      \s*"!=="\s*
isoddby           \s+"is"\s+"odd"\s+"by"\s+
isnotoddby        \s+"is"\s+"not"\s+"odd"\s+"by"\s+
isodd             \s+"is"\s+"odd"
isnotodd          \s+"is"\s+"not"\s+"odd"
isevenby          \s+"is"\s+"even"\s+"by"\s+
isnotevenby       \s+"is"\s+"not"\s+"even"\s+"by"\s+
iseven            \s+"is"\s+"even"
isnoteven         \s+"is"\s+"not"\s+"even"
isdivby           \s+"is"\s+"div"\s+"by"\s+
isnotdivby        \s+"is"\s+"not"\s+"div"\s+"by"\s+
isin              \s+"is"\s+"in"\s+
as                \s+"as"\s+
to                \s+"to"\s+
step              \s+"step"\s+
block             "block"
if                "if"\s+|"elseif"\s+|"else if"\s+|"while"\s+
for               "for"\s+
foreach           "foreach"(?![^\s])
setfilter         "setfilter"\s+
instanceof        \s+"instanceof"\s+
not               \!\s*|"not"\s+
land              \s*\&\&\s*|\s*"and"\s+
lor               \s*\|\|\s*|\s*"or"\s+
lxor              \s*"xor"\s+
typecast_types    "integer"|"int"|"boolean"|"bool"|"float"|"double"|"real"|"string"|"binary"|"array"|"object"
typecast          \({typecast_types}\)\s*
single_quote      "'"
double_quote      "\""
