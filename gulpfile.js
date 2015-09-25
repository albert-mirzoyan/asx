var gulp = require("gulp");
var babel = require("gulp-babel");
var concat = require("gulp-concat");
var through = require('through2');

var paths = {
    runtime     : {
        out     : 'repository/out',
        src     : [
            'src/runtime/loader.js',
            'src/runtime/mirrors.js',
            'src/runtime/index.js'
        ]
    },
    transformer : {
        out     : 'lib/transformer',
        src     : 'src/transformer/**/*.js'
    },
    compiler    : {
        out     : 'lib/compiler',
        src     : 'src/compiler/**/*.js'
    }
};

var helpers = [];
function logFileHelpers() {
    return through.obj(function (file, enc, cb) {
        file.babel.usedHelpers.forEach(function(helper){
            if(helpers.indexOf(helper)<0){
                helpers.push(helper);
            }
        });
        cb(null, file);
    });
}
function printFileHelpers() {
    return through.obj(function (file, enc, cb) {
        var content = '(function(global){\n\n';
        content += require("babel").buildExternalHelpers(helpers,'var')+'\n\n';
        content += file.contents.toString()+'\n\n';
        content += '})(typeof global!="undefined"?global:self);';
        file.contents = new Buffer(content);
        this.push(file);
        cb();
    });
}

gulp.task("runtime", function () {
    return gulp.src(paths.runtime.src)
        .pipe(babel({
            blacklist       : ['strict'],
            stage           : 0,
            modules         : 'ignore',
            moduleIds       : true,
            externalHelpers : true
        })).on('error',function (error) {
            console.error(error.stack);
            this.emit('end');
        })
        .pipe(logFileHelpers())
        .pipe(concat("runtime.js", {newLine: '\n\n'}))
        .pipe(printFileHelpers())
        .pipe(gulp.dest(paths.runtime.out));
});
gulp.task("transformer", function () {
    return gulp.src(paths.transformer.src)
        .pipe(babel({
            stage           : 0
        })).on('error',function (error) {
            console.error(error.stack);
            this.emit('end');
        })
        .pipe(gulp.dest(paths.transformer.out));
});
gulp.task("compiler", function () {
    return gulp.src(paths.compiler.src)
        .pipe(babel({
            stage           : 0
        })).on('error',function (error) {
            console.error(error.stack);
            this.emit('end');
        })
        .pipe(gulp.dest(paths.compiler.out));
});

gulp.task("watch-runtime", function(){
    gulp.watch(paths.runtime.src, ['runtime']);
});

