/*global require*/
var gulp = require('gulp'),
    concat = require("gulp-concat"),
    ts = require('gulp-typescript'),
    tsd = require('gulp-tsd'),
    gnf = require('gulp-npm-files'),
    sourcemaps = require('gulp-sourcemaps'),
    sass = require('gulp-sass'),
    qunit = require("gulp-qunit"), 
    serve = require("gulp-serve"),
    uglify = require("gulp-uglify"),
    rename = require("gulp-rename"),
    html2ts = require("gulp-html-to-ts"),
    sequence = require("gulp-sequence"),
    project = require("./project.json");

var Server = require("karma").Server;

var paths = {
    webroot: "./" + project.webroot + "/",
    dist: "./dist/",
    dist_dts: "./dist/typings/",
    tsTests: "./tests/*.ts",
    package_ko_dist: "./packages/survey-knockout/dist/",
    typings: "./typings/**/*.d.ts",
    styles: "./src/*.scss",
};
paths.jsFolder = paths.webroot + "js/";
paths.testsFolder = paths.webroot + "tests/";



var config_ko_standard = {
    templates: [{ path: "./src/knockout/standard/templates/*.html", fileName: "template.ko.html", dest: "./src/knockout/standard/" },
                { path: "./src/knockout/standard/templates.window/*.html", fileName: "template.window.ko.html", dest: "./src/knockout/standard/" }],
    src: ["./src/*.ts", "./src/knockout/*.ts", "./src/knockout/standard/*.ts"],
    mainJSfile: "survey.js",
    dtsfile: "survey.d.ts",
    packageDistPath: "./packages/survey-knockout/dist/"
}
var config_ko_bootstrap = {
    templates: [{ path: "./src/knockout/bootstrap/templates/*.html", fileName: "template.ko.html", dest: "./src/knockout/bootstrap/" },
                { path: "./src/knockout/bootstrap/templates.window/*.html", fileName: "template.window.ko.html", dest: "./src/knockout/bootstrap/" }],
    src: ["./src/*.ts", "./src/knockout/*.ts", "./src/knockout/bootstrap/*.ts"],
    mainJSfile: "survey.bootstrap.js",
    dtsfile: "survey.d.ts",
    packageDistPath: "./packages/survey-knockout-bootstrap/dist/"
}

var config_test_ko = {
    dtsfile: "survey.d.ts",
    src: "./tests/ko/*.ts",
    mainJSfile: "survey.tests.ko.js",
    htmlFile: "./tests/ko/index_tests_ko.html"
}

var configs = {};
configs["ko_standard"] = config_ko_standard;
configs["ko_bootstrap"] = config_ko_bootstrap;
var testconfigs = {};
testconfigs["ko"] = config_test_ko;

function buildTemplates(configName) {
    var curConfig = configs[configName];
    //Build templates
    for (var i = 0; i < curConfig.templates.length; i++) {
        var curTemplate = curConfig.templates[i];
        gulp.src(curTemplate.path)
            .pipe(concat(curTemplate.fileName))
            .pipe(html2ts())
            .pipe(gulp.dest(curTemplate.dest));
    }
}
function buildFromSources(configName) {
    var curConfig = configs[configName];
    //Build js file
    var tsResult = gulp.src([
          paths.webroot + "/lib/survey/**/*.d.ts",
          paths.typings
    ].concat(curConfig.src))
       .pipe(sourcemaps.init())
       .pipe(ts({
           target: "ES5",
           noImplicitAny: false,
           declarationFiles: true
       }));
    tsResult.js
        .pipe(concat(curConfig.mainJSfile))
        .pipe(sourcemaps.write({ sourceRoot: "src" }))
        //Source map is a part of generated file
        .pipe(gulp.dest(paths.dist))
        .pipe(gulp.dest(paths.jsFolder))
        .pipe(gulp.dest(curConfig.packageDistPath));

    //Build typescript definition
    var tscResult = gulp.src([
          paths.webroot + "/lib/survey/**/*.d.ts",
          paths.typings
    ].concat(curConfig.src))
       .pipe(sourcemaps.init())
       .pipe(ts({
           target: "ES5",
           noExternalResolve: true,
           declaration: true
       }));
    tscResult.dts
        .pipe(concat(curConfig.dtsfile))
        .pipe(gulp.dest(paths.dist_dts));
}

function compressMainJS(configName) {
    var curConfig = configs[configName];
    //Build templates
    for (var i = 0; i < curConfig.templates.length; i++) {
        var curTemplate = curConfig.templates[i];
        gulp.src(curTemplate.path)
            .pipe(concat(curTemplate.fileName))
            .pipe(html2ts())
            .pipe(gulp.dest(curTemplate.dest));
    }
    //Compress
    gulp.src(paths.dist + curConfig.mainJSfile)
        .pipe(uglify())
            .pipe(rename({
                extname: '.min.js'
            }))
        .pipe(gulp.dest(curConfig.packageDistPath))
        .pipe(gulp.dest(paths.dist));
}

function buildTests(configName) {
    var curConfig = testconfigs[configName];
    //Build sources
    var tsResult = gulp.src([
              paths.typings,
              paths.tsTests,
              curConfig.src])
           .pipe(sourcemaps.init())
           .pipe(ts({
               target: "ES5",
               noImplicitAny: false
           }));

    tsResult.js
        .pipe(concat(curConfig.mainJSfile))
        .pipe(sourcemaps.write({ sourceRoot: "src" }))
        //Source map is a part of generated file
        .pipe(gulp.dest(paths.testsFolder));
    //Copy html file
    gulp.src(curConfig.htmlFile)
    // Perform minification tasks, etc here
    .pipe(gulp.dest(paths.testsFolder));
}

gulp.task("ko_standard_tempates", function () {
    buildTemplates("ko_standard");
});
gulp.task("ko_standard_source", function () {
    buildFromSources("ko_standard");
});
gulp.task("ko_standard_compress", function () {
    compressMainJS("ko_standard");
});
gulp.task("build_ko_standard", sequence("ko_standard_tempates", "ko_standard_source", "ko_standard_compress"));

gulp.task("ko_bootstrap_tempates", function () {
    buildTemplates("ko_bootstrap");
});
gulp.task("ko_bootstrap_source", function () {
    buildFromSources("ko_bootstrap");
});
gulp.task("ko_bootstrap_compress", function () {
    compressMainJS("ko_bootstrap");
});
gulp.task("build_ko_bootstrap", sequence("ko_bootstrap_tempates", "ko_bootstrap_source", "ko_bootstrap_compress"));

gulp.task("buildTests_ko", function () {
    buildTests("ko");
});

gulp.task('tsd', function (callback) {
    tsd({
        command: 'reinstall',
        latest: true,
        config: 'tsd.json'
    }, callback);
});

gulp.task('copyfiles', function (callback) {
    gulp.src(gnf(null, 'package.json'), { base: './' })
        .pipe(rename(function (path) {
            path.dirname = "";
            path.basename = path.basename.replace("-latest", "");
        }))
        .pipe(gulp.dest(paths.jsFolder));
});

gulp.task('sass', function () {
    "use strict";
    gulp.src(paths.styles)
      .pipe(sass.sync().on('error', sass.logError))
      .pipe(concat("survey.css"))
      .pipe(gulp.dest(paths.webroot + 'css'))
        .pipe(gulp.dest(paths.package_ko_dist + 'css'))
      .pipe(gulp.dest(paths.dist + 'css'));
});
gulp.task("makedist", sequence(["sass", "build_ko_standard", "build_ko_bootstrap"], "buildTests_ko"));

gulp.task("test_ci", function (done) { 
        new Server({ 
            configFile: __dirname + "/karma.conf.js", 
            singleRun: true 
}, done).start(); 
}); 
 
gulp.task("server", serve({ 
     root: ["wwwroot"], 
     port: 30001 
})); 
