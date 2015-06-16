import * as messages from "../../messages";
import * as t from "../../types";

function isIllegalBareSuper(node, parent) {
  if (!t.isSuper(node)) return false;
  if (t.isMemberExpression(parent, { computed: false })) return false;
  if (t.isCallExpression(parent, { callee: node })) return false;
  return true;
}

function isMemberExpressionSuper(node) {
  return t.isMemberExpression(node) && t.isSuper(node.object);
}

var visitor = {
  enter(node, parent, scope, state) {
    var topLevel = state.topLevel;
    var self = state.self;

    if (t.isFunction(node) && !t.isArrowFunctionExpression(node)) {
      // we need to call traverseLevel again so we're context aware
      self.traverseLevel(this, false);
      return this.skip();
    }

    if (t.isProperty(node, { method: true }) || t.isMethodDefinition(node)) {
      // break on object methods
      return this.skip();
    }

    var getThisReference = topLevel ?
      // top level so `this` is the instance
      t.thisExpression :
      // not in the top level so we need to create a reference
      self.getThisReference.bind(self);

    var callback = self.looseHandle;
    if (self.isLoose) callback = self.looseHandle;
    var result = callback.call(self, this, getThisReference);
    if (result) this.hasSuper = true;
    if (result === true) return;
    return result;
  }
};

export default class ReplaceSupers {

  /**
   * Description
   */

  constructor(opts: Object, inClass: boolean = false) {
    this.topLevelThisReference = opts.topLevelThisReference;
    this.methodPath            = opts.methodPath;
    this.methodNode            = opts.methodNode;
    this.superRef              = opts.superRef;
    this.isStatic              = opts.isStatic;
    this.hasSuper              = false;
    this.inClass               = inClass;
    this.isLoose               = opts.isLoose;
    this.scope                 = opts.scope;
    this.file                  = opts.file;
    this.opts                  = opts;
  }

  getObjectRef() {
    return this.opts.objectRef || this.opts.getObjectRef();
  }


  /**
   * Description
   */

  replace() {
    this.traverseLevel(this.methodPath.get("value"), true);
  }

  /**
   * Description
   */

  traverseLevel(path: TraversalPath, topLevel: boolean) {
    var state = { self: this, topLevel: topLevel };
    path.traverse(visitor, state);
  }

  /**
   * Description
   */

  getThisReference() {
    if (this.topLevelThisReference) {
      return this.topLevelThisReference;
    } else {
      var ref = this.topLevelThisReference = this.scope.generateUidIdentifier("this");
      this.methodNode.value.body.body.unshift(t.variableDeclaration("var", [
        t.variableDeclarator(this.topLevelThisReference, t.thisExpression())
      ]));
      return ref;
    }
  }

  /**
   * Description
   */

  getLooseSuperProperty(id: Object, parent: Object) {
    var methodNode = this.methodNode;
    console.info(methodNode);

    var methodName = methodNode.key;
    var superRef   = t.memberExpression(
      t.identifier("$class"),
      t.identifier("supper")
    );
    if (parent.property === id) {
      return;
    } else
    if (t.isCallExpression(parent, { callee: id })) {
      // super(); -> objectRef.prototype.MethodName.call(this);
      //parent.arguments.unshift(t.thisExpression());
      if (methodName.name === "constructor") {
        // constructor() { super(); }
        return t.callExpression(
          superRef,[
          t.identifier("this")
        ]) ;
      } else {
        return t.callExpression(superRef,[
          t.identifier("this"),
          t.literal(methodName.name)
        ]);
      }
    } else
    if (t.isMemberExpression(parent) && !methodNode.static) {
      // super.test -> objectRef.prototype.test
      return t.callExpression(superRef,[
        t.identifier("this"),
        t.literal(parent.property.name)
      ])
    } else {
      return superRef;
    }
  }

  addSuper(path,name){
    var superScope = path.scope;
    var superPath = superScope.path;
    var superData = superPath.getData('_super',false);
    if(!superData){
      var superVar = t.identifier('_super');
      var superVars = [t.identifier('this')];
      var superCall = t.callExpression(t.memberExpression(
        t.identifier('_class'),
        t.identifier('supers')
      ),superVars);
      path.scope.path.setData('_super',superVars);
      path.scope.push({
        id     : superVar,
        init   : superCall
      })
    }
    if(name){
      var found = false;
      for(var i=0;i<superData.length;i++){
        if(superData[i].value==name){
          found = true;
          break;
        }
      }
      if(!found){
        superData.push(t.literal(name));
      }
    }
  }

  /**
   * Description
   */

  looseHandle(path: TraversalPath, getThisReference: Function) {
    if(path.isSuper()){
      var methodName = this.methodNode.key
      var superField = false;
      this.addSuper(path);
      if(t.isMemberExpression(path.parent)){
        this.addSuper(path,path.parent.property.name);
      } else
      if(t.isCallExpression(path.parent)){
        if(methodName.name!='constructor'){
          this.addSuper(path,methodName.name);
          return t.memberExpression(t.identifier('_super'),methodName)
        }else{
          var c = path.parentPath.parentPath.node
          var s = path.parentPath.parentPath.parentPath.node
          s.body.splice(s.body.indexOf(c)+1,0,t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('_class'),t.identifier('defaults')),
              [getThisReference()]
            )
          ))
        }
      }
      return t.identifier('_super');
    }
    /*
    var node = path.node;
    var methodName = this.methodNode.key.name;
    var prefix = this.methodNode.static?':':'.';
    var superRef   = t.memberExpression(
      t.identifier("$class"),
      t.identifier("supper")
    );
    if(path.isMemberExpression()){
      if(t.isSuper(node.object)){
        var superName = '_super_'+node.property.name;
        var superData = path.scope.path

        if(!superData){
          var superVar = path.scope.generateUidIdentifier(superName);
          var lit = t.literal('SUPER GAGO');
          path.scope.path.setData(superName,lit);
          console.info(superName,superData)
          path.scope.push({
            id     : superVar,
            init   : lit,
            unique : true
          })
        }

        return t.memberExpression(t.callExpression(superRef,[
          getThisReference(),
          t.literal(prefix+node.property.name)
        ]),t.identifier('value'))
      }
    }else
    if(path.isCallExpression()) {
      var callee = node.callee;
      if(t.isSuper(callee)){
        var args = [getThisReference()];
        if(methodName!='constructor'){
          args.push(t.literal(prefix+methodName));
        }
        node.callee = t.callExpression(superRef,args);
        return true;
      }

      if (!t.isMemberExpression(callee)) return;
      if (!t.isSuper(callee.object)) return;
      node.callee = t.callExpression(superRef,[
        getThisReference(),
        t.literal(prefix+callee.property.name)
      ])
      return true;
    }
    */
  }

}
