import "./patch";

import escapeRegExp from "../lodash/string/escapeRegExp";
import cloneDeep from "../lodash/lang/cloneDeep";
import isBoolean from "../lodash/lang/isBoolean";
import * as messages from "./messages";
import contains from "../lodash/collection/contains";
import traverse from "./traversal";
import isString from "../lodash/lang/isString";
import isRegExp from "../lodash/lang/isRegExp";
//import Module from "module";
import isEmpty from "../lodash/lang/isEmpty";
import parse from "./helpers/parse";
//import path from "path";
import each from "../lodash/collection/each";
import has from "../lodash/object/has";
//import fs from "fs";
import * as t from "./types";

//export { inherits, inspect } from "util";

export function debug(){}

export function canCompile(filename: string, altExts: Array<string>) {
  var exts = altExts || canCompile.EXTENSIONS;
  var ext = path.extname(filename);
  return contains(exts, ext);
}

canCompile.EXTENSIONS = [".js", ".jsx", ".es6", ".es",".ts"];

export function resolve(loc: string) {
  try {
    return require.resolve(loc);
  } catch (err) {
    return null;
  }
}

var relativeMod;

export function resolveRelative(loc: string) {
  // we're in the browser, probably
  if (typeof Module === "object") return null;

  if (!relativeMod) {
    relativeMod = new Module;
    relativeMod.paths = Module._nodeModulePaths(process.cwd());
  }

  try {
    return Module._resolveFilename(loc, relativeMod);
  } catch (err) {
    return null;
  }
}

export function list(val: string): Array<string> {
  if (!val) {
    return [];
  } else if (Array.isArray(val)) {
    return val;
  } else if (typeof val === "string") {
    return val.split(",");
  } else {
    return [val];
  }
}


export function arrayify(val: any, mapFn: Function): Array {
  if (!val) return [];
  if (isBoolean(val)) return arrayify([val], mapFn);
  if (isString(val)) return arrayify(list(val), mapFn);

  if (Array.isArray(val)) {
    if (mapFn) val = val.map(mapFn);
    return val;
  }

  return [val];
}

export function booleanify(val: any): boolean {
  if (val === "true") return true;
  if (val === "false") return false;
  return val;
}

export function shouldIgnore(filename, ignore, only) {
  filename = slash(filename);
  if (only.length) {
    for (var i = 0; i < only.length; i++) {
      if (only[i].test(filename)) return false;
    }
    return true;
  } else if (ignore.length) {
    for (var i = 0; i < ignore.length; i++) {
      if (ignore[i].test(filename)) return true;
    }
  }

  return false;
}

var templateVisitor = {
  enter(node, parent, scope, nodes) {
    if (t.isExpressionStatement(node)) {
      node = node.expression;
    }

    if (t.isIdentifier(node) && has(nodes, node.name)) {
      this.skip();
      this.replaceInline(nodes[node.name]);
    }
  }
};

//
exports.templates = {};
export function template(name: string, code:string): Object {
  if(code){
    var ast = parseTemplate(name,code);
    var template = (nodes,keepExpression)=>{
      return renderTemplate(ast,nodes,keepExpression);
    };
    template.ast = ast;
    return exports.templates[name] = template;
  }else{
    return exports.templates[name];
  }

}
export function renderTemplate(ast:Object, nodes: Array<Object>, keepExpression: boolean): Object {
  if (nodes === true) {
    keepExpression = true;
    nodes = null;
  }

  ast = cloneDeep(ast);

  if (!isEmpty(nodes)) {
    traverse(ast, templateVisitor, null, nodes);
  }

  if (ast.body.length > 1) return ast.body;

  var node = ast.body[0];

  if (!keepExpression && t.isExpressionStatement(node)) {
    return node.expression;
  } else {
    return node;
  }
}

export function parseTemplate(loc: string, code: string): Object {
  var ast = parse(code, { filename: loc, looseModules: true }).program;
  ast = traverse.removeProperties(ast);
  return ast;
}

function loadTemplates() {
  var templates = {};

  var templatesLoc = path.join(__dirname, "../templates");
  if (!fs.existsSync(templatesLoc)) {
    throw new ReferenceError(messages.get("missingTemplatesDirectory"));
  }

  each(fs.readdirSync(templatesLoc), function (name) {
    if (name[0] === ".") return;

    var key  = path.basename(name, path.extname(name));
    var loc  = path.join(templatesLoc, name);
    var code = fs.readFileSync(loc, "utf8");

    templates[key] = parseTemplate(loc, code);
  });

  return templates;
}
