import DefaultFormatter from "./_default";
import * as t from "../../types/index";
import Ast from "../../helpers/ast-utils";

export default class AsxFormatter extends DefaultFormatter {
    static options(ast) {
        var options = {};
        if (ast.comments && ast.comments.length) {
            var comment = ast.comments.shift();
            if (comment.type == 'Block') {
                options = comment.value.match(/\*\s*@module\s+(\{[^}]*\})/g);
                if (options) {
                    options = options[0].split('\n').map(l=> {
                        return l.replace(/\s*\*(.*)/, '$1').trim()
                    });
                    options = options.join(' ').replace(/\s*\@module\s*/, '');
                    options = (new Function('return ' + options + ';'))();
                }
            } else {
                ast.comments.unshift(comment);
            }
        }
        return options || {};
    }

    moduleId:String;
    project:Project;

    constructor(file) {
        super(file);
        this.project = this.file.project;
        this.moduleId = this.file.opts.moduleId;
        this.imports = {};
        this.proxies = {};
        this.exports = {};
    }
    getImport(name) {
        name = this.project.resolveModule(
            this.moduleId, name
        );
        if (!this.imports[name]) {
            this.imports[name] = {}
        }
        return this.imports[name];
    }
    getExport(name) {
        var isSelf = (!name || name == this.moduleId);
        if(isSelf){
           return this.exports;
        }
        var exports = this.proxies;
        name = this.file.project.resolveModule(
            this.moduleId, name || this.moduleId
        );
        exports = this.proxies;
        if (!exports[name]) {
            exports[name] = {}
        }
        return exports[name];
    }

    transform(program) {
        var options = AsxFormatter.options(this.file.ast);
        var locals = [];
        var classes=[],methods=[],fields=[],definitions;
        var body = [];
        var execution = [];
        program.body.forEach(item=> {
            switch (item.type) {
                case 'VariableDeclaration':
                    if(item._const){
                        item.declarations.forEach(d=>{
                            fields.push(this.convertField(d));
                        });
                        return;
                    }
                break;
                case 'ExpressionStatement':
                    if(item.expression._class){
                        classes.push(this.convertClass(item.expression));
                        return;
                    }
                break;
                case 'FunctionDeclaration':
                    methods.push(this.convertMethod(item));
                    return;
                break;
                default : console.info(item.type);
            }
            execution.push(item);
        });
        definitions = [].concat(fields).concat(methods).concat(classes);

        if(this.defaultExport){
            execution.push(t.returnStatement(this.defaultExport));
        }
        if(execution.length){
            definitions.unshift(t.callExpression(Ast.MODULE_FIELD,[
                t.literal('default'),t.literal(0),t.arrayExpression([
                    t.functionExpression(null, [], t.blockStatement(execution))
                ])
            ]));
        }

        this.proxies[this.moduleId] = this.exports;
        this.project.module(this.moduleId,{
            imports: this.imports,
            exports: this.proxies
        });


        var definer,oe;
        if(definitions.length){
            definitions.map(d=>{
                body.push(t.expressionStatement(d));
            })
        }
        if (body.length) {
            definer = t.functionExpression(null, [t.identifier('Asx')], t.blockStatement([
                t.withStatement(t.identifier('this'), oe=t.blockStatement(body))
            ]));
        }
        body = [];

        definer = t.callExpression(Ast.MODULE,[
            t.literal(this.moduleId),
            definer
        ]);
        body.push(t.expressionStatement(definer));

        oe._compact = false;
        program._compact = true;
        program.body = body;
    }
    convertField(field){
        var p = [],d=[],v,f;
        if(field.id.typeAnnotation){
            p.push(t.functionExpression(t.identifier(field.id.name+'$type'), [], t.blockStatement([
                t.returnStatement(Ast.convertType(field.id.typeAnnotation))
            ])));
        }


        if(d.length){
            p.push(Ast.convertDecorators(d,t.identifier(field.id.name+'$decorators')));
        }
        if(field.init){
            p.unshift(t.functionExpression(field.id, [], t.blockStatement([
                t.returnStatement(field.init)
            ])));
        }
        f = t.arrayExpression(p);
        //f._compact = true;
        //v._compact = false;

        return t.callExpression(Ast.MODULE_FIELD,[
            t.literal(field.id.name),t.literal(0),f
        ]);
    }
    convertMethod(method){
        var p = [],d=[];
        method._compact = false;
        if(method.returnType){
            p.push(t.functionExpression(t.identifier(method.id.name+'$type'), [], t.blockStatement([
                t.returnStatement(Ast.convertType(method.returnType.typeAnnotation))
            ])));
        }
        if(method.params && method.params.length){
            p.push(t.functionExpression(t.identifier(method.id.name+'$parameters'), [], t.blockStatement([
                t.returnStatement(Ast.convertArguments(method.params))
            ])));
        }

        //def._compact=true;

        if(d.length){
            p.push(Ast.convertDecorators(d,t.identifier(method.id.name+'$decorators')));
        }
        p.unshift(method);


        //method.id = null;

        return t.callExpression(Ast.MODULE_METHOD,[
            t.literal(method.id.name),t.literal(0),t.arrayExpression(p)
        ]);
    }
    convertMethodParam(param,rests) {
        var name, args, rest = false;
        if (param.type == 'RestElement') {
            name = param.argument;
            rests.push(name);
        } else
        if (param.type == 'AssignmentPattern') {
            name = param.left;
        } else {
            name = param;
        }
        if (param.typeAnnotation) {
            args = Ast.convertType(param.typeAnnotation.typeAnnotation)
        } else {
            args = Ast.convertType(t.genericTypeAnnotation(t.identifier('Object')))
        }
        return t.property("init", name, args)
    }

    convertClass(closure){
        return closure;
    }
    importDeclaration(node) {
        this.getImport(node.source.value)['*'] = '*';
    }
    importSpecifier(specifier, node, nodes) {
        var imp = this.getImport(node.source.value);
        switch (specifier.type) {
            case 'ImportNamespaceSpecifier' :
                imp['*'] = specifier.local.name;
                break;
            case 'ImportDefaultSpecifier' :
                imp['default'] = specifier.local.name;
                break;
            case 'ImportSpecifier' :
                var imported = specifier.imported.name;
                var local = specifier.local.name;
                if (imported == local) {
                    imp[imported] = '*';
                } else {
                    imp[imported] = local;
                }
                break;
        }
    }
    exportAllDeclaration(node, nodes) {
        this.getExport(node.source.value)['*'] = '*';
    }
    exportDeclaration(node, nodes) {
        switch (node.type) {
            case 'ExportDefaultDeclaration' :
                this.exports.default = '*';
                this.defaultExport = node.declaration;
        }
    }
    exportSpecifier(specifier, node, nodes) {
        var exp = this.getExport(node.source ? node.source.value : false);
        switch (specifier.type) {
            case 'ExportSpecifier' :
                var exported = specifier.exported.name;
                var local = specifier.local.name;
                exp[exported] = local == exported ? '*' : local;
                break;
            default :
                JSON.ast_print(specifier);
                break;
        }
    }
}
