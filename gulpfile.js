var gulp = require("gulp");
var babel = require("gulp-babel");
var concat = require("gulp-concat");
var through = require('through2');

var paths = {
    runtime     : {
        out:'repository/out',
        src:[
            'runtime/runtime/utils/url.js',
            'runtime/runtime/decorators.js',
            'runtime/runtime/loader.js',
            'runtime/runtime/system.js',
            'runtime/runtime/mirrors.js',
            'runtime/runtime/reflect.js',
            'runtime/index.js'
        ]
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

gulp.task("watch-runtime", function(){
    gulp.watch(paths.runtime.src, ['runtime']);
});

