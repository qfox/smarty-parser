var util = require('util');
var chalk = require('chalk');

module.exports = {
  SyntaxError: SyntaxError,
  explain: explainError
};

// Create a new object, that prototypally inherits from the Error constructor.
function SyntaxError(message, cons) {
  Error.captureStackTrace(this, cons || this.constructor);
  if (message) this.message = message;
}
util.inherits(SyntaxError, Error);
SyntaxError.prototype.name = SyntaxError.name;

function explainError(lines, error, colorize) {
    var lineNumber = error.line - 1;
    lines = typeof lines === 'string'? lines.split(/\n/g) : lines;
    var result = [
        renderLine(lineNumber, lines[lineNumber], colorize),
        renderPointer(error.column, colorize)
    ];
    var i = lineNumber - 1;
    var linesAround = 2;
    while (i >= 0 && i > (lineNumber - linesAround)) {
        result.unshift(renderLine(i, lines[i], colorize));
        i--;
    }
    i = lineNumber + 1;
    while (i < lines.length && i < (lineNumber + linesAround)) {
        result.push(renderLine(i, lines[i], colorize));
        i++;
    }
    result.unshift(formatErrorMessage(error.message, error.filename, colorize));
    return result.join('\n');
}

function renderPointer(column, colorize) {
    var res = (new Array(column + 9)).join('-') + '^';
    return colorize ? chalk.grey(res) : res;
}

function renderLine(n, line, colorize) {
    // Convert tabs to spaces, so errors in code lines with tabs as indention symbol
    // could be correctly rendered, plus it will provide less verbose output
    line = line.replace(/\t/g, ' ');

    // "n + 1" to print lines in human way (counted from 1)
    var lineNumber = prependSpaces((n + 1).toString(), 5) + ' |';
    return ' ' + (colorize ? chalk.grey(lineNumber) : lineNumber) + line;
}

function prependSpaces(s, len) {
    while (s.length < len) {
        s = ' ' + s;
    }
    return s;
}

function formatErrorMessage(message, filename, colorize) {
    return (colorize ? chalk.bold(message) : message) +
        (filename ? ' at ' + (colorize ? chalk.green(filename) : filename) : '') +
        ' :';
}
