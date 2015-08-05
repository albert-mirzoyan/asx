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

export var visitor = {
  ClassDeclaration(node, parent, scope, file) {
    return new ClassTransformer(this, file).init();
  },
  ClassExpression(node, parent, scope, file) {
    return new ClassTransformer(this, file).init();
  }
};
class ClassTransformer {
  constructor(path:TraversalPath, file:File) {
    this.file   = file;
    this.path   = path;
    this.parent = path.parent;
    this.scope  = path.scope;
    this.node   = path.node;
  }
  init() {
    this.initMembers();
    this.buildConstructor();
    this.buildClosure();
    return this.closure;
  }
  initMembers() {
    var body = this.node.body.body;
    if(body){
      for(var member of body){
        switch(member.type){
          case 'ClassProperty' : this.initField(member);
          case 'MethodDefinition' : this.initMethod(member);
        }
      }
    }
  }
  initConstructor() {}
  initField(field){
    console.info(field.computed,field.static);
  }
  initMethod(method){
    console.info(method.computed,method.static);
  }
  initSupers(node){
    if(t.isMethodDefinition(node)){
      var classBody = this.node.body.body;
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
  convertMethodParam(param) {
    var name, args = [], rest = 0;
    if (param.type == 'RestElement') {
      rest = 1;
      name = param.argument

    } else if (param.type == 'AssignmentPattern') {
      name = param.left;
      args.push(t.functionExpression(null,[],t.blockStatement([
        t.returnStatement(param.right)
      ])))
    } else {
      name = param;
    }
    if (param.typeAnnotation) {
      args.unshift(this.convertType(param.typeAnnotation.typeAnnotation))
    } else {
      args.unshift(this.convertType(t.genericTypeAnnotation(t.identifier('Object'))))
    }

    var ret = t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('arg')),args);
    if (rest){
      ret = t.memberExpression(ret,t.identifier('rest'));
    }
    return t.property("init", name, ret)
  }
  convertType(type){
    var parameters = [type.id];
    if(type.typeParameters){
      var tps  = type.typeParameters;
      tps.params.forEach(p=>{
        parameters.push(this.convertType(p));
      })
    }
    var exp = t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('type')),parameters);
    return exp;
  }
  buildConstructor(){}
  buildClosure(){
    /*
    var closure = t.functionDeclaration(
      t.identifier(this.node.id.name+'Class'),
      [t.identifier('_class')],
      t.blockStatement([
        t.returnStatement(this.buildBody())
      ])
    );
    closure._class = this.node.id.name;
    */
    return this.closure = t.expressionStatement(util.template("asx-class",{
      CLASS_NAME : t.identifier(this.node.id.name+'ꓽclass'),
      CLASS_BODY : this.buildBody()
    }))

  }
  buildBody(){
    var body = [
      //todo implement me
    ];
    return body;
  }
}
