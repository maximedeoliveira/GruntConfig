// https://github.com/gruntjs/grunt-contrib-uglify
// https://www.npmjs.com/package/grunt-assets-versioning
// https://github.com/gruntjs/grunt-contrib-clean
// https://github.com/gruntjs/grunt-contrib-cssmin
// https://github.com/gruntjs/grunt-contrib-copy
// https://github.com/gruntjs/grunt-contrib-watch

var path = require('path'), fs = require('fs');

function fileByType(startPath,filter,callback){
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            fileByType(filename,filter,callback);
        }
        else if (filter.test(filename)) callback(filename);
    };
};

module.exports = function(grunt) {
    
    const jsFolder = './assets/js/';
    const cssFolder = './assets/css/';
    const FILES = {};
    const VERSION = [];
    const config = {
        buildFolder: "build",
        assetFolder: "assets",
        versionFile: "version.json"
    };

    grunt.initConfig({
        clean: {
            build: [
                config.buildFolder + '/js/*', 
                config.buildFolder + '/css/*'
            ]
        },
        uglify : {
            options: {
                comments: false,
                beautify: false,
                compress: {
                    drop_console: true
                }
            },
            files: {
                expand: true,
                cwd: config.assetFolder + "/js/",
                src: ["*.js", "!*.min.js"],
                dest: config.buildFolder + "/js/",
                ext: ".js"
            }
        },
        cssmin: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: config.assetFolder + '/css',
                        src: ['*.css', '!*.min.css'],
                        dest: config.buildFolder + '/css',
                        ext: '.css'
                    }
                ]
            },
            theme: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        cwd: 'theme/',
                        src: ['**/*.css', '!*.min.css'],
                        dest: config.buildFolder + '/css',
                        ext: '.css'
                    }
                ]
            }
        },
        assets_versioning: {
            options: {
                versionsMapFile: config.buildFolder + '/' + config.versionFile
            },
            main: {
                options: {
                    tag: 'hash',
                    hashLength: 8,
                    tasks: ['uglify:files', 'cssmin:main', 'cssmin:theme']
                }
            }
        },
        copy: {
            main: {
                expand: true,
                cwd: config.assetFolder,
                src: '**',
                dest: config.buildFolder + '/',
            },
            theme: {
                cwd: 'theme/',
                src: ['**/*.css'],
                dest: 'build/css',
                expand: true,
                flatten: true,
                /*rename: function (dest, src) {
                    let split = src.split(".");
                    if(split[split.length - 1] === "css"){
                        return dest + '/' + split[0] + '-dev.' + split[split.length - 1] 
                    }else{
                        return dest + '/' + src;
                    }
                },*/
            }
        },
        watch: {
            css: {
                files: [config.assetFolder + '/css/*.css'],
                tasks: ['copy:main']
            },
            themeCss: {
                files: ['theme/*/css/*.css'],
                tasks: ['copy:main']
            },
            js: {
                files: [config.assetFolder + '/js/*.js'],
                tasks: ['copy:main']
            }
          },
    });
      
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-assets-versioning');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('build', ['clean', 'assets_versioning:main']);
    grunt.registerTask('dev', function(){

        // Clean build folder
        var done = this.async();
        grunt.util.spawn({cmd: 'grunt', args: ['clean']}, function(e){
            grunt.log.writeln('Clean')
            done();
        });
        /*grunt.task.run('clean');*/

        // Build FILES array and VERSION array
        fs.readdirSync(jsFolder).forEach(file => {
            FILES[String(config.buildFolder + "/js/" + file)] = [String(config.assetFolder + "/js/" + file)];
            VERSION.push({version: "", originalPath: String(config.assetFolder + "/js/" + file), versionedPath: String(config.assetFolder + "/js/" + file)});
        });
    
        fs.readdirSync(cssFolder).forEach(file => {
            FILES[String(config.buildFolder + "/css/" + file)] = [String(config.assetFolder + "/css/" + file)];
            VERSION.push({version: "", originalPath: String(config.assetFolder + "/css/" + file), versionedPath: String(config.assetFolder + "/css/" + file)})
        });

        fileByType('./theme',/\.css$/,function(filename){
            filename = filename.replace(/\\/gi, '/');
            let split = filename.split("\\");

            FILES[String(config.buildFolder + "/css/" + split[split.length - 1])] = [String(filename)];
            VERSION.push({version: "", originalPath: String(filename), versionedPath: String(config.buildFolder + "/css/" + split[split.length - 1])})
        });

        // Create version.json file
        if(fs.existsSync(config.buildFolder + '/' + config.versionFile)){
            fs.unlink(config.buildFolder + '/' + config.versionFile, (err) => {
                if (err) throw err;
            });
        }
        var json = JSON.stringify(VERSION);
        fs.writeFile(config.buildFolder + '/' + config.versionFile, json, (err) => {
            console.log("Version.json as been saved")
            if (err) throw err;
        });

        grunt.task.run('copy');
        grunt.task.run('watch');
    });

    grunt.event.on('watch', function(action, filepath, target) {
        if(action === "added"){
            let split = filepath.split("\\");
            if(split[0] === config.assetFolder){
                let destination = filepath.replace(config.assetFolder, config.buildFolder);
                FILES[destination] = [filepath];
            }
        }
        
        //grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    });
};