import memoiseDecorators from "../../helpers/memoise-decorators";
//import ReplaceSupers from "../../helpers/replace-supers";
import * as nameMethod from "../../helpers/name-method";
import * as defineMap from "../../helpers/define-map";
import * as messages from "../../../messages";
import * as util from  "../../../util";
import traverse from "../../../traversal";
import each from "lodash/collection/each";
import has from "lodash/object/has";
import ast from "../../../helpers/ast-utils";
import * as t from "../../../types";
export function ClassDeclaration(node, parent, scope, file) {
    return new ClassTransformer(this, file).run();
}
export function ClassExpression(node, parent, scope, file) {
    return new ClassTransformer(this, file).run();
}
class ClassTransformer {
    get className() {
        return Object.defineProperty(this, 'className', {
            value: this.node.id
        }).className;
    }

    get superName() {
        return Object.defineProperty(this, 'superName', {
            value: this.node.superClass
        }).superName;
    }

    constructor(path:TraversalPath, file:File) {
        this.file = file;
        this.path = path;
        this.parent = path.parent;
        this.scope = path.scope;
        this.node = path.node;
    }

    run() {
        this.initMembers();
        this.initConstructor();
        this.buildMembers();
        this.buildClosure();
        return this.closure;
    }

    initSupers(node) {
        if (t.isMethodDefinition(node)) {
            var classBodyPaths = this.path.get("body").get("body");
            var path = classBodyPaths[node.index];
            var replaceSupers = new ReplaceSupers({
                methodPath: path,
                methodNode: node,
                objectRef: this.className,
                superRef: this.superName,
                isStatic: node.static,
                isLoose: this.isLoose,
                scope: this.scope,
                file: this.file
            }, true);
            replaceSupers.replace();
        }
    }

    initMembers() {
        var classBody = this.node.body.body;
        var members = this.members = {};
        if (classBody) {
            for (var i = 0; i < classBody.length; i++) {
                var member = classBody[i];
                member.index = i;
                if (member.static) {
                    member._key = ':' + member.key.name;
                } else {
                    member._key = '.' + member.key.name;
                }
                if (member.type == 'ClassProperty') {
                    member.kind = 'field';
                }
                var id;
                switch (member.kind) {
                    case 'field'  :
                    case 'method' :
                    case 'constructor' :
                        id = member._key;
                        break;
                    case 'get' :
                    case 'set' :
                        id = member._key;
                        if (!members[id]) {
                            members[id] = t.classProperty(member.key);
                            members[id].kind = 'field';
                        }
                        id = member._key + '.' + member.kind;
                }
                if (!members[id]) {
                    members[id] = member;
                } else {
                    throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
                }
            }
        }
    }

    initConstructor() {
        var constructor = this.members['.constructor'];
        if (!constructor) {
            constructor = this.members['.constructor'] = t.methodDefinition(
                t.identifier('.constructor'),t.functionExpression(null,[],
                    t.blockStatement(this.superName?[util.template("super-call")]:[])
                )
            );
            constructor._key = '.constructor';
            constructor.kind = 'constructor';
        }
    }

    buildMembers() {
        this.properties = [];
        Object.keys(this.members).forEach(k=> {
            switch (this.members[k].kind) {
                case 'field' :
                    this.buildField(
                        this.members[k],
                        this.members[k + '.get'],
                        this.members[k + '.set']
                    );
                break;
                case 'constructor' :
                case 'method' :
                    this.buildMethod(
                        this.members[k]
                    );
                break;
            }
        })
    }

    buildField(field, getter, setter) {
        var p = [], d = [], o, v;
        if (field.typeAnnotation) {
            d.push(ast.convertType(field.typeAnnotation));
        }
        if (field.decorators) {
            d = d.concat(field.decorators);
        }
        if (getter) {
            if (getter.decorators) {
                d = d.concat(getter.decorators);
            }
            //getter.value.id = t.identifier(getter.key.name + '_getter');
            p.push(t.property("init", t.identifier("G"), getter.value));
        }
        if (setter) {
            if (setter.decorators) {
                d = d.concat(setter.decorators);
            }
            p.push(t.property("init", t.identifier("S"), setter.value))
        }
        if (field.value) {
            p.push(t.property("init", t.identifier("V"), v = t.functionExpression(field.key, [], t.blockStatement([
                t.returnStatement(field.value)
            ]))));
        }
        if (d.length) {
            p.push(t.property("init", ast.decoratorId, ast.convertDecorators(d)))
        }
        o = t.objectExpression(p);
        /*o._compact = true;
         if(v){
         v._compact = false;
         }*/
        this.properties.push(t.property('init', t.identifier(field._key), o));
    }

    buildMethod(method) {
        var p = [], d = [], o, v;
        if (method.value.returnType) {
            d.push(ast.convertType(method.value.returnType.typeAnnotation));
        }
        if (method.value.params && method.value.params.length) {
            d.push(ast.convertArguments(method.value.params));
        }
        if (method.kind == 'method') {
            method.value.id = method.key;
        } else
        if (method.kind == 'constructor') {
            method.value.id = this.node.id;
            if (this.node.decorators) {
                d = d.concat(this.node.decorators);
            }
            if (this.superName) {
                d.unshift(t.decorator(t.callExpression(t.memberExpression(t.identifier('__'),t.identifier('extend')),[
                    this.superName
                ])));
            }
        }
        //this.initSupers(method.value);
        if (method.decorators) {
            d = d.concat(method.decorators);
        }
        p.push(t.property("init", t.identifier("F"), v = method.value));
        if (d.length) {
            p.push(t.property("init", ast.decoratorId, ast.convertDecorators(d)));
        }
        o = t.objectExpression(p);
        /*o._compact = true;
         if(v){
         v._compact = false;
         }*/
        this.properties.push(t.property('init', t.identifier(method._key), o));
    }

    buildClosure() {
        var ws, bs, bb;
        this.closure = t.functionDeclaration(
            this.node.id,
            [t.identifier('__')],
            ws = t.blockStatement([
                t.withStatement(t.identifier('this'), bs = t.blockStatement([
                    t.returnStatement(
                        t.assignmentExpression('=', t.identifier('__'),
                            bb = t.callExpression(t.identifier('__'), [this.buildBody()])
                        )
                    )
                ]))
            ])
        );
        bs._compact = ws._compact = true;
        bb._compact = false;
        this.closure._class = this.node.id.name;
    }

    buildBody() {
        return t.objectExpression(this.properties);
    }
}
