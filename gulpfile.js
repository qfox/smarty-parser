var fs = require('graceful-fs');
var gulp = require('gulp');
var clone = require('gulp-clone');
var cu = require('gulp-concat-util');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var merge = require('merge2');

var jison = require('./.gulp/jison');


var paths = {
    license: 'src/license.js',
    lexer: {
      initial: 'src/lexer/lexer.jisonlex',
      footer: 'src/lexer/footer.js',
    },
    watch: ['src/lexer/*'],
    dist: 'lib'
};

gulp.task('build', function (cb) {
  var licenseJsdoc = fs.readFileSync(paths.license, 'utf8');

  var preparedLexer = gulp.src(paths.lexer.initial)
    .pipe(jison.prepareLexer());

  var tokens = preparedLexer.pipe(clone())
    .pipe(jison.compileTokens())
    .pipe(rename('tokens.js'));

  var lexer = merge(
      preparedLexer
        .pipe(clone())
        .pipe(jison.compileTokens({asVars: true})),
      preparedLexer
        .pipe(clone())
        .pipe(jison.compileLexer()),
      gulp.src(paths.lexer.footer)
    )
    .pipe(concat({ path: 'lexer.js' }));

  var rawLexer = preparedLexer.pipe(clone())
    .pipe(jison.removeTokens())
    .pipe(rename('lexer.l'));

  return merge(tokens, lexer, rawLexer)
    .pipe(cu.header(licenseJsdoc))
    .pipe(gulp.dest(paths.dist));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
  gulp.watch(paths.watch, ['build']);
});

gulp.task('default', ['build']);
