//import transform from '../babel/transformation/index'
import Files from '../utils/files'
import Parser from './parser';
import Transformer from './transformer';
import Generator from './generator';

export class Project {
    static options={
        "filename": "base.js",
        "highlightCode": true,
        "looseModules": true,
        "nonStandard": true,
        "plugins": {},
        "sourceType": "module",
        "strictMode": true,
        "features": {
            "es3.memberExpressionLiterals": true,
            "es3.propertyLiterals": true,
            "es5.properties.mutators": true,
            "es6.arrowFunctions": true,
            "es6.blockScoping": true,
            "es6.classes": "es7.decorators",
            "es6.constants": true,
            "es6.destructuring": "es7.objectRestSpread",
            "es6.forOf": true,
            "es6.modules": true,
            "es6.objectSuper": true,
            "es6.parameters.default": true,
            "es6.parameters.rest": true,
            "es6.properties.computed": true,
            "es6.properties.shorthand": true,
            "es6.regex.sticky": true,
            "es6.regex.unicode": true,
            "es6.spec.blockScoping": false,
            "es6.spec.symbols": false,
            "es6.spec.templateLiterals": false,
            "es6.spread": true,
            "es6.tailCall": false,
            "es6.templateLiterals": true,
            "es7.asyncFunctions": true,
            "es7.classProperties": true,
            "es7.comprehensions": true,
            "es7.decorators": true,
            "es7.doExpressions": true,
            "es7.exponentiationOperator": true,
            "es7.exportExtensions": true,
            "es7.functionBind": true,
            "es7.objectRestSpread": true,
            "es7.trailingFunctionCommas": true,
            "eval": false,
            "flow": true,
            "jscript": false,
            "minification.constantFolding": false,
            "minification.deadCodeElimination": false,
            "minification.memberExpressionLiterals": false,
            "minification.propertyLiterals": false,
            "minification.removeConsole": false,
            "minification.removeDebugger": false,
            "react": true,
            "reactCompat": false,
            "regenerator": true,
            "runtime": false,
            "spec.blockScopedFunctions": true,
            "spec.functionName": true,
            "spec.protoToAssign": false,
            "spec.undefinedToVoid": false,
            "strict": true,
            "utility.inlineEnvironmentVariables": false,
            "validation.react": true,
            "validation.undeclaredVariableCheck": false
        }
    }
    static compile(config, sources) {
        return new Project(config, sources).compile();
    }
    constructor(config, sources) {
        this.config = config;
        this.sources = sources;
        this.dependencies = {}
    }
    compile() {
        this.sources.forEach(s=>this.compileSource(s));
        return this;
    }
    resolve(module, dependency) {
        if(dependency.charAt(0)=='.'){
            return Files.resolve('/'+module,dependency).substring(1);
        }else{
            return dependency;
        }
    }
    compileSource(file) {
        try {
            /*var result = transform(file.source, {
                code        : true,
                stage       : 0,
                filename    : file.path,
                //sourceMap: 'inline',
                moduleId    : [
                    this.config.group,
                    this.config.project,
                    file.path
                ].join('/'),
                modules: 'asx',
                project: this
            });*/

            var srcAst = Parser.parse(file.source,Project.options);
            var outAst = Transformer.transform(srcAst,Project.options);
            var outJs  = Generator.generate(outAst,Project.options);
            file.output = result.code;
            file.ast = {
                src : JSON.stringify(srcAst,null,2),
                out : JSON.stringify(outAst,null,2)
            }
        } catch (ex) {
            console.error(ex);
            console.error(ex.stack);
        }

    }
}
