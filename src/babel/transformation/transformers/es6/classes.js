import memoiseDecorators from "../../helpers/memoise-decorators";
import * as nameMethod from "../../helpers/name-method";
import * as defineMap from "../../helpers/define-map";
import * as messages from "../../../messages";
import * as util from  "../../../util";
import traverse from "../../../traversal";
import each from "../../../../lodash/collection/each";
import has from "../../../../lodash/object/has";
import Ast from "../../../helpers/ast-utils";
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
        this.bodyPath = this.path.get('body').get('body');
    }
    run() {
        this.initMembers();
        this.initConstructor();
        this.buildMembers();
        this.buildClosure();
        return this.closure;
    }
    initMembers() {
        var classBody = this.node.body.body;
        var members = this.members = {};
        if (classBody) {
            for (var i = 0; i < classBody.length; i++) {
                var member = classBody[i];
                member._index = i;
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
    buildSuperCall(){
        return t.expressionStatement(t.callExpression(Ast.CLASS_SUPER,[
            t.identifier('this'),t.identifier('arguments')
        ]));
    }
    initConstructor() {
        var constructor = this.members['.constructor'];
        if (!constructor) {
            constructor = this.members['.constructor'] = t.methodDefinition(
                t.identifier('constructor'),t.functionExpression(null,[],
                    t.blockStatement([this.buildSuperCall()])
                )
            );
            constructor._key = '.constructor';
            constructor.kind = 'constructor';
        }else{
            var path = this.bodyPath[constructor._index].get('value');
            if(!path.getData('_super')){
                constructor.value.body.body.unshift(this.buildSuperCall())
            }
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
        var isStatic = field.static?1:0;
        if (field.typeAnnotation) {
            p.push(t.functionExpression(t.identifier(field.key.name+'$type'), [], t.blockStatement([
                t.returnStatement(Ast.convertType(field.typeAnnotation))
            ])));
        }
        if (field.decorators) {
            d = d.concat(field.decorators);
        }
        if (getter) {
            if (getter.decorators) {
                d = d.concat(getter.decorators);
            }
            getter.value.id = t.identifier(getter.key.name + '$getter');
            p.push(getter.value);
        }
        if (setter) {
            if (setter.decorators) {
                d = d.concat(setter.decorators);
            }
            setter.value.id = t.identifier(setter.key.name + '$setter');
            p.push(setter.value)
        }
        if (field.value) {
            p.unshift(t.functionExpression(field.key, [], t.blockStatement([
                t.returnStatement(field.value)
            ])));
        }
        if (d.length) {
            p.push(Ast.convertDecorators(d,t.identifier(field.key.name + '$decorators')))
        }
        o = [t.literal(field.key.name),t.literal(isStatic)];

        if(p.length){
            o.push(t.arrayExpression(p))
        }

        this.properties.push(
            t.callExpression(Ast.CLASS_FIELD,o)
        );
    }
    buildMethod(method) {
        var p = [], d = [], o, v, k;
        var isConstructor = method.kind == 'constructor'?1:0;
        var isStatic = method.static?1:0;
        if (method.kind == 'method') {
            k = method.value.id = method.key;
        } else
        if (method.kind == 'constructor') {
            k = method.value.id = this.node.id;
        }
        if (method.value.returnType) {
            p.push(t.functionExpression(t.identifier(k.name+'$type'), [], t.blockStatement([
                t.returnStatement(Ast.convertType(method.value.returnType.typeAnnotation))
            ])));
        }
        if (method.value.params && method.value.params.length) {
            p.push(t.functionExpression(t.identifier(k.name+'$parameters'), [], t.blockStatement([
                t.returnStatement(Ast.convertArguments(method.value.params))
            ])));
        }
        if (method.kind == 'constructor') {
            if (this.node.decorators) {
                d = d.concat(this.node.decorators);
            }
            if (this.superName) {
                p.push(t.functionExpression(t.identifier(k.name+'$extends'), [], t.blockStatement([
                    t.returnStatement(this.superName)
                ])));
            }
            if (this.node.implements && this.node.implements.length) {
                p.push(t.functionExpression(t.identifier(k.name+'$implements'), [], t.blockStatement([
                    t.returnStatement(t.arrayExpression(this.node.implements.map(i=>i.id)))
                ])));
            }
        }
        if (method.decorators) {
            d = d.concat(method.decorators);
        }
        p.unshift(method.value);
        if (d.length) {
            p.push(Ast.convertDecorators(d,t.identifier(k.name+'$decorators')));
        }
        o = t.arrayExpression(p);

        this.properties.push(
            t.callExpression(Ast.CLASS_METHOD,[
                t.literal(method.key.name),t.literal(isStatic),o
            ])
        );

    }
    buildClosure() {
        var ws;
        this.closure = t.callExpression(Ast.CLASS,[
            t.literal(this.node.id.name),
            t.functionDeclaration(null,[t.identifier('Asx')], ws = this.buildBody())
        ]);
        ws._compact = false;
        this.closure._class = this.node.id;
    }
    buildBody() {
        return t.blockStatement(this.properties.map(e=>t.expressionStatement(e)));
    }
}
