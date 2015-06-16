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
  var shim = Decorator.take(node, 'shim');
  if (shim) {
    return new ClassPolyfillTransformer(this, file).run();
  } else {
    return new ClassDeclarationTransformer(this, file).run();
  }
}
export function ClassExpression(node, parent, scope, file) {
  return new ClassExpressionTransformer(this, file).run();
}


class Decorator {

  static has(node, name) {
    return !!Decorator.get(node, name);
  }
  static get(node, name) {
    if (node.decorators) {
      for (var i = 0; i < node.decorators.length; i++) {
        if (node.decorators[i].name == name) {
          return node.decorators[i];
        }
      }
    }
  }
  static take(node, name) {
    return Decorator.remove(node, name)[0];
  }
  static removeCompilerDecoratator(node){
    return this.remove(node,d=>(d.compiler||!d.expression));
  }
  static remove(node, filter) {
    return Decorator.all(node, filter, true);
  }

  static all(node, check, remove) {
    var removed = [];
    if (node.decorators) {
      var filter = check;
      if(typeof filter=='string'){
        filter = (decorator)=>{
          var name = ''
          if(decorator.expression){
            if(decorator.expression.callee){
              name = decorator.expression.callee.name;
            }else{
              name = decorator.expression.name;
            }
          }
          return check === name;
        }
      }
      node.decorators = node.decorators.filter(decorator=> {
        var match = filter(decorator);
        if (match) {
          removed.push(decorator);
        }
        return remove ? !match : true;
      });
    }
    return removed;
  }
}

class ClassTransformer {
  static MODIFIERS = {
    HIDDEN    : 0b0000000001,//!@hidden
    FINAL     : 0b0000000010,//!@final
    CONSTANT  : 0b0000000100 //!@constant
  };
  static getMask(node) {
    var flags = 0;
    flags = flags | ((!!Decorator.take(node, 'hidden'))   ? ClassTransformer.MODIFIERS.HIDDEN:0);//enum
    flags = flags | ((!!Decorator.take(node, 'final'))    ? ClassTransformer.MODIFIERS.FINAL:0);//conf
    flags = flags | ((!!Decorator.take(node, 'constant')) ? ClassTransformer.MODIFIERS.CONSTANT:0);//wr
    if(flags>0){
      flags = flags.toString(32);
      if (flags.length < 2) {
        flags = '0' + flags;
      }
      return flags;
    }
  }

  get isPolyfilled() {
    return false;
  }

  get className() {
    return Object.defineProperty(this, 'className', {
      value: this.node.id
    }).className;
  }

  get classReference() {
    return Object.defineProperty(this, 'classReference', {
      value: this.className
    }).classReference;
  }

  get superName() {
    return Object.defineProperty(this, 'superName', {
      value: this.node.superClass
    }).superName;
  }

  get superReference() {
    return Object.defineProperty(this, 'superReference', {
      value: t.identifier('E56P')
    }).superReference;
  }



  get closureParameters() {
    return Object.defineProperty(this, 'closureParameters', {
      value: [this.superReference]
    }).closureParameters;
  }

  get closureArguments() {
    return Object.defineProperty(this, 'closureArguments', {
      value: []
    }).closureArguments;
  }

  get closureBody() {
    return Object.defineProperty(this, 'closureBody', {
      value: t.blockStatement([
        this.classConstructor,
        ... this.classMembers,
        t.returnStatement(this.classReference)
      ])
    }).closureBody;
  }

  get classInheritace() {
    return [t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('E56'), t.identifier('IC')), [
        this.classReference,
        this.superReference
      ]))];
  }

  get classMembers() {
    return [t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('Class'), t.identifier('define')), [
        this.classReference, t.objectExpression(this.members)
      ]))];
  }


  get classConstructor() {
    return Object.defineProperty(this, 'classConstructor', {
      value: t.variableDeclaration("var", [
        t.variableDeclarator(this.classReference,
          t.functionDeclaration(this.className, this.constructorParameters, this.constructorBody)
        )
      ])
    }).classConstructor;
  }

  get constructorParameters() {
    return Object.defineProperty(this, 'constructorParameters', {
      value: this.construct ? this.construct.params : []
    }).constructorParameters;
  }

  get constructorBody() {
    return Object.defineProperty(this, 'constructorBody', {
      value: this.construct ? this.construct.body : t.blockStatement([])
    }).constructorBody;
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

  /**
   * Description
   *
   * @returns {Array}
   */

  run() {
    this.initMembers();
    this.initConstructor();
    return this.buildClosure();
  }

  initConstructor() {
    var params = [];
    var body = [];
    if(this.construct){
      params = this.construct.params;
      this.construct.body.body.forEach(s=>{
        body.push(s);
      });
    }else{
      if(this.superName){
        var superCall = t.callExpression(t.memberExpression(t.identifier('_class'),t.identifier('supers')),[t.identifier('this')])
        var superApply = t.callExpression(t.memberExpression(superCall,t.identifier('apply')),[t.identifier('this'),t.identifier('arguments')])
        var defaultCall = t.callExpression(t.memberExpression(t.identifier('_class'),t.identifier('defaults')),[t.identifier('this')])
        body.push(t.expressionStatement(superApply));
        body.push(t.expressionStatement(defaultCall));
      }
    }
    this.construct = t.functionDeclaration(
      this.node.id,params,
      t.blockStatement(body)
    );

  }

  initMembers() {
    var classBody = this.node.body.body;
    var classBodyPaths = this.path.get("body").get("body");
    var p = this.members = [], members = {
      i: [],
      n: {s: {}, i: {}}
    };
    if (classBody) {
      for (var i = 0; i < classBody.length; i++) {
        var member = classBody[i];
        var node = classBody[i];
        var path = classBodyPaths[i];
        member.index = i;
        if (member.computed) {
          members.i.push(member);
        } else
        if (member.kind == 'constructor') {
          this.initSupers(member);
          if(member.static){
            if(!this.initializer){
              this.initializer = member.value;
            } else {
              throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
            }
          }else{
            if (!this.construct) {
              this.construct = member.value;
            } else {
              throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
            }
          }

        } else {
          var s, holder;
          holder = member.static ? (s = ':', members.n.s) : (s = '.', members.n.i);
          var key = s + (member.key.name);
          if (!holder[key]) {
            holder = holder[key] = {}
          } else {
            holder = holder[key];
          }
          if (member.type == 'ClassProperty') {
            member.kind = 'field';
          }
          if (!member.kind) {
            //console.info(member);
          }
          if (!holder[member.kind]) {
            holder[member.kind] = member;
          } else {
            throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
          }
          if (holder.method && (holder.get || holder.set || holder.field)) {
            throw this.file.errorWithNode(member.key, messages.get("scopeDuplicateDeclaration", key));
          }
        }
      }
    }
    Object.keys(members.n.s).forEach((key)=> {
      p.push(this.initMember(key,members.n.s[key]));
    });
    Object.keys(members.n.i).forEach((key)=> {
      p.push(this.initMember(key,members.n.i[key]));
    });
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
  initMember(key,member) {
    var k,v;
    if (member.method) {
      this.initSupers(member.method);
      k = t.literal(key);
      v = this.initMethod(member.method);
    } else {
      this.initSupers(member.get);
      this.initSupers(member.set);
      k = t.literal(key);
      v = this.initField(member.field, member.get, member.set);
    }
    return t.property("init",k,v);
  }
  initField(field, getter, setter) {
    var p = [], d = [],m;
    if (getter) {
      if(getter.decorators){
        Decorator.removeCompilerDecoratator(getter)
        d = d.concat(getter.decorators.map(d=>d.expression));
      }
      getter.value.id = t.identifier(getter.key.name + '_getter');
      p.push(t.property("init", t.literal("#g"), getter.value))
    }
    if (setter) {
      if(setter.decorators){
        Decorator.removeCompilerDecoratator(setter)
        d = d.concat(setter.decorators.map(d=>d.expression));
      }
      setter.value.id = t.identifier(setter.key.name + '_setter');
      p.push(t.property("init", t.identifier("#s"), setter.value))
    }
    if (field) {
      if(field.decorators){
        Decorator.removeCompilerDecoratator(field)
        d = d.concat(field.decorators.map(d=>d.expression));
      }
      m = ClassTransformer.getMask(field);
      if(m){
        p.unshift(t.property("init", t.identifier("#m"), t.literal(m)));
      }
      if(field.value){
        p.push(t.property("init", t.identifier("#v"), t.functionExpression(null, [], t.blockStatement([
          t.returnStatement(field.value)
        ]))));
      }
    }
    if(d.length){
      p.push(t.property("init", t.identifier("#a"), t.arrayExpression(d)))
    }
    return t.objectExpression(p);
  }

  initMethod(member) {
    var p = [], m = ClassTransformer.getMask(member);
    member.value.id = member.key;
    if (member.decorators) {
      Decorator.all(member,'decorator').forEach(d=>{
        d.expression = t.memberExpression(t.identifier('Asx'),d.expression);
      });
      Decorator.removeCompilerDecoratator(member);
      p.unshift(t.property("init", t.literal("#a"), t.arrayExpression(
        member.decorators.map(d=>d.expression)
      )));
    }
    if(member.value.id.name=='default'){
      member.value.id = t.identifier('_default');
    }
    p.push(t.property("init", t.identifier("#f"), member.value));
    if(m){
      p.unshift(t.property("init", t.identifier("#m"), t.literal(m)));
    }
    return t.objectExpression(p);
  }

  buildClosure(){
    var closure = t.functionDeclaration(
      t.identifier(this.node.id.name+'Class'),
      [t.identifier('_class')],
      t.blockStatement([
        t.returnStatement(this.buildBody())
      ])
    );
    closure._class = this.node.id.name;
    return closure;
  }
  buildBody(){
    var body = [];
    //console.info(this.members);
    var native = Decorator.take(this.node,'native');
    var override = Decorator.take(this.node,'override');
    if(override){
      override = override.expression;
      var scope = 'local'
      if(override.arguments){
        scope = override.arguments[0].value||scope;
      }
      body.push(t.property('init',
        t.identifier('#override'),
        t.literal(scope)
      ));
    }
    if(!native) {
      body.push(t.property('init',
        t.identifier('#constructor'),
        this.construct
      ));
    }
    if(this.initializer) {
      this.initializer.id = t.identifier(this.node.id.name+'$init'),
      body.push(t.property('init',
        t.identifier('#initializer'),
        this.initializer
      ));
    }
    if (this.node.decorators) {
      body.push(t.property("init", t.literal("#decorators"), t.arrayExpression(
        this.node.decorators.map(d=>d.expression)
      )))
    }
    if(this.superName){
      body.push(t.property('init',
        t.identifier('#extend'),
        this.superName
      ));
    }
    this.members.forEach(m=>{
      body.push(m)
    });
    return t.objectExpression(body);
  }
}

class ClassExpressionTransformer extends ClassTransformer {
  constructor(path:TraversalPath, file:File) {
    super(path,file);
  }
  buildClosure(body) {
    return t.expressionStatement(super.buildClosure(body));
  }
}
class ClassDeclarationTransformer extends ClassTransformer {
  constructor(path:TraversalPath, file:File) {
    super(path,file);
  }
  get closureParameters() {
    return [t.identifier('E56P')];
  }
  /*
  get classClosure() {
    var classClosure = Object.getOwnPropertyDescriptor(ClassTransformer.prototype, 'classClosure').get;
    return t.variableDeclaration("var", [
      t.variableDeclarator(this.className, classClosure.call(this))
    ]);
  }*/
}
class ClassPolyfillTransformer extends ClassTransformer {
  constructor(path:TraversalPath, file:File) {
    super(path,file);
  }

  get closureArguments() {
    return [this.namespace];
  }

  get namespace() {
    return Object.defineProperty(this, 'namespace', {
      value: t.memberExpression(t.identifier("global"), this.className)
    }).namespace;
  }

  get classConstructor() {
    return Object.defineProperty(this, 'classConstructor', {
      value: t.variableDeclaration("var", [
        t.variableDeclarator(this.classReference,
          t.logicalExpression('||',
            this.superReference,
            t.functionDeclaration(this.className, this.constructorParameters, this.constructorBody)
          )
        )
      ])
    }).classConstructor;
  }
  /*
  get classClosure() {
    var classClosure = Object.getOwnPropertyDescriptor(ClassTransformer.prototype, 'classClosure').get;
    return t.expressionStatement(t.assignmentExpression("=",
      this.namespace,
      classClosure.call(this)
    ));
  }*/
  get classMembers() {
    return [t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('E56'), t.identifier('polyfill')), [
        this.classReference, t.objectExpression(this.members)
      ]))];
  }
}
