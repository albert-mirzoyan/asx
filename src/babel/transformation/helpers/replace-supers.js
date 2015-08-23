import * as messages from "../../messages";
import * as t from "../../types";

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
    path.traverse({
      enter(node, parent, scope, state) {
        if(this.isSuper()){
          return t.memberExpression(t.identifier('_l'),t.identifier('super'));
        }
      }
    });
  }



}
