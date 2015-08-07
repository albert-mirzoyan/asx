import memoiseDecorators from "../../helpers/memoise-decorators";
import ReplaceSupers from "../../helpers/replace-supers";
import * as nameMethod from "../../helpers/name-method";
import * as defineMap from "../../helpers/define-map";
import * as messages from "../../../messages";
import * as util from  "../../../util";
import traverse from "../../../traversal";
import each from "lodash/collection/each";
import has from "lodash/object/has";
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

  /**
   * Description
   */
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
  initSupers(node){
    if(t.isMethodDefinition(node)){
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
    var classBodyPaths = this.path.get("body").get("body");
    var members = this.members = {};
    if (classBody) {
      for (var i = 0; i < classBody.length; i++) {
        var member = classBody[i];
        member.index = i;
        if(member.static){
          member.key.name = ':'+member.key.name;
        }else{
          member.key.name = '.'+member.key.name;
        }
        if(member.type =='ClassProperty') {
          member.kind = 'field';
        }
        var id;
        switch(member.kind){
          case 'field'  :
          case 'method' :
          case 'constructor' :
            id = member.key.name;
            break;
          case 'get' :
          case 'set' :
            id = member.key.name+'.'+member.kind;
        }
        if(!members[id]){
          members[id]=member;
        }else{
          throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
        }
      }
    }
    console.info(Object.keys(members));
  }
  initConstructor() {
    var constructor = this.members['.constructor'];
    if(!constructor){
      constructor = this.members['.constructor'] = t.methodDefinition(
          t.identifier('.constructor'), t.functionExpression(null,[],t.blockStatement([])), null
      );
    }
    var body = constructor.value.body.body;
    /*if(this.superName){
      if(!body.length){
        var superCall = t.callExpression(t.memberExpression(t.identifier('_class'),t.identifier('supers')),[t.identifier('this')])
        var superApply = t.callExpression(t.memberExpression(superCall,t.identifier('apply')),[t.identifier('this'),t.identifier('arguments')])
        var defaultCall = t.callExpression(t.memberExpression(t.identifier('_class'),t.identifier('defaults')),[t.identifier('this')])
        body.push(t.expressionStatement(superApply));
        body.push(t.expressionStatement(defaultCall));
      }else{
        console.info('INSPECT THIS CASE');
      }
    }*/
  }
  buildMembers() {
    this.properties=[];
    Object.keys(this.members).forEach(k=>{
      switch(this.members[k].kind){
        case 'field' : this.buildField(
            this.members[k],
            this.members[k+'.get'],
            this.members[k+'.set']
        );
        break;
        case 'constructor' :
        case 'method' : this.buildMethod(
            this.members[k]
        );
        break;
      }
    })
  }
  buildField(field,getter,setter){
    console.info("PROPERTY",field.key.name,!!getter,!!setter);
    var p = [], d = [];

    if(field.typeAnnotation){
      p.push(t.property("init", t.identifier("T"),this.convertType(field.typeAnnotation.typeAnnotation)))
    }
    if(field.decorators){
      d = d.concat(field.decorators.map(d=>d.expression));
    }
    if (getter) {
      if(getter.decorators){
        d = d.concat(getter.decorators.map(d=>d.expression));
      }
      //getter.value.id = t.identifier(getter.key.name + '_getter');
      p.push(t.property("init", t.identifier("G"), getter.value));
    }
    if (setter) {
      if(setter.decorators){
        d = d.concat(setter.decorators.map(d=>d.expression));
      }
      //setter.value.id = t.identifier(setter.key.name + '_setter');
      p.push(t.property("init", t.identifier("S"), setter.value))
    }
    if(d.length){
      p.unshift(t.property("init", t.identifier("A"), t.arrayExpression(d)))
    }
    if(field.value){
      p.push(t.property("init", t.identifier("V"), t.functionExpression(null, [], t.blockStatement([
        t.returnStatement(field.value)
      ]))));
    }
    this.properties.push(t.property('init',field.key,t.objectExpression(p)));
  }
  buildMethod(method){
    console.info("FUNCTION",method.key.name);

    var p = [],d=[];


    if(method.value.returnType){
      p.push(t.property("init", t.identifier("T"), this.convertType(method.value.returnType.typeAnnotation)));
    }
    if(method.value.params && method.value.params.length){
      var ps  = [],rests = [];
      method.value.params.forEach(p=>ps.push(this.convertMethodParam(p,rests)));
      p.push(t.property("init", t.identifier("P"), t.objectExpression(ps)));
      if(rests.length){
        p.push(t.property("init", t.identifier("R"), t.arrayExpression(rests.map(r=>t.literal(r.name)))));
      }
    }



    if(method.kind=='method'){
      method.value.id = t.identifier(method.key.name.substring(1));
    }else
    if(method.kind=='constructor'){
      method.value.id = this.node.id;
      if (this.node.decorators) {
        d = d.concat(this.node.decorators.map(d=>d.expression));
      }
      if(this.superName){
        p.push(t.property("init", t.identifier("E"), this.superName));
      }
    }

    if(this.superName){
      this.initSupers(method);
    }
    if (method.decorators) {
      d = d.concat(method.decorators.map(d=>d.expression));
    }
    if(d.length){
      p.unshift(t.property("init", t.identifier("A"), t.arrayExpression(d)));
    }
    p.push(t.property("init", t.identifier("F"), method.value));
    this.properties.push(t.property('init',method.key,t.objectExpression(p)));
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
      args = this.convertType(param.typeAnnotation.typeAnnotation)
    } else {
      args = this.convertType(t.genericTypeAnnotation(t.identifier('Object')))
    }
    return t.property("init", name, args)
  }
  convertType(type){
    var parameters = [type.id];
    if(type.typeParameters){
      var tps  = type.typeParameters;
      tps.params.forEach(p=>{
        parameters.push(this.convertType(p));
      })
    }
    //var exp = t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('type')),parameters);
    var exp = t.arrayExpression(parameters);
    return exp;
  }
  buildClosure(){
    this.closure = t.expressionStatement(t.callExpression(t.memberExpression(t.identifier('__'),t.identifier('class')),[
      t.literal(this.node.id.name),
      t.functionExpression(
        null,
        [t.identifier('__')],
        t.blockStatement([
          t.expressionStatement(
              t.assignmentExpression('=',t.identifier('__'),
                  t.callExpression(t.identifier('__'),[this.buildBody()])
              )
          )
        ])
    )]));
    this.closure._class = this.node.id.name;
  }
  buildBody(){
    return t.objectExpression(this.properties);
  }

}
