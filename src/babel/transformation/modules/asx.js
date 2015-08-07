import DefaultFormatter from "./_default";
import CommonFormatter from "./common";
import includes from "lodash/collection/includes";
import values from "lodash/object/values";
import * as util from  "../../util";
import * as t from "../../types";

export default class AsxFormatter extends DefaultFormatter {
  static options(ast){
    var options = {};
    if(ast.comments && ast.comments.length){
      var comment = ast.comments.shift();
      if(comment.type == 'Block'){
        options = comment.value.match(/\*\s*@module\s+(\{[^}]*\})/g);
        if(options){
          options = options[0].split('\n').map(l=>{
            return l.replace(/\s*\*(.*)/,'$1').trim()
          });
          options = options.join(' ').replace(/\s*\@module\s*/,'');
          options = (new Function('return '+options+';'))();
        }
      }else{
        ast.comments.unshift(comment);
      }
    }
    return options || {};
  }

  constructor(...args){
    super(...args);
    this.imports = {};
    this.exports = {};
  }

  getImport(name){
    if(!this.imports[name]){
      this.imports[name] = {}
    }
    return this.imports[name];
  }
  getExport(name){
    name = name || '*';
    if(!this.exports[name]){
      this.exports[name] = {}
    }
    return this.exports[name];
  }
  buildDependencyLiterals() {
    var names = [];
    for (var name in this.ids) {
      names.push(t.literal(name));
    }
    return names;
  }

  /**
   * Wrap the entire body in a `define` wrapper.
   */

  transform(program) {
    var options = AsxFormatter.options(this.file.ast);
    //DefaultFormatter.prototype.transform.apply(this, arguments);

    var locals = [];
    var definitions = [];
    var body = [];
    program.body.forEach(item=>{
      switch(item.type){
        case 'ExpressionStatement':
          var exp = item.expression;
          if(exp.type=='Literal' && exp.value.toLowerCase()=='use strict'){
            return;
          }
        break;
        case 'VariableDeclaration':
            item.declarations.forEach(d=>{
              locals.push(d.id);
            });
        break;
        case 'FunctionDeclaration':
          if(item.id.name=='module'){
            item.body.body.forEach(s=>{
              body.push(s);
            })
            return;
          }else
          if(item._class){
            item.id =t.identifier('c$'+item._class);
            body.push(t.expressionStatement(t.callExpression(
              t.memberExpression(
                t.identifier('asx'),
                t.identifier('c$')
              ),[item])));
            return;
          }else{
            locals.push(item.id);
          }
        break;
      }
      body.push(item);
    });

    var definer = [];



    if(Object.keys(this.imports).length){

      Object.keys(this.imports).forEach(key=>{
        var items = this.imports[key];
        if(items['*'] && typeof items['*']=='string'){
          this.imports[key]=items['*'];
        }
      });
      definer.push(t.property('init',
        t.identifier('imports'),
        t.valueToNode(this.imports)
      ))
    }
    var exports;
    if(this.exports['*']){
      exports = this.exports['*'];
      delete this.exports['*'];
    }
    if(Object.keys(this.exports).length){
      definer.push(t.property('init',
        t.identifier('exports'),
        t.valueToNode(this.exports)
      ))
    }
    if(body.length){
      if(exports){
        var ret = [];
        Object.keys(exports).forEach(key=>{
          var val = exports[key];
          if(typeof val=='string') {
            ret.push(t.property('init',
              t.identifier(key),
              t.functionExpression(null,[],t.blockStatement([
                t.returnStatement(t.identifier(val == '*' ? key : val))
              ]))
            ))
          }else{
            ret.push(t.property('init',
              t.identifier(key),
              t.functionExpression(null,[],t.blockStatement([
                t.returnStatement(val)
              ])))
            );
          }
        });

        body.push(t.expressionStatement(t.callExpression(t.memberExpression(
            t.identifier('__'),
            t.identifier('export')),
            [t.objectExpression(ret)]
        )));
      }
      var initializer  = t.functionExpression(null, [t.identifier('__')], t.blockStatement([
          t.withStatement(t.identifier('this'), t.blockStatement(body))
      ]));
      definer.push(t.property('init',
        t.identifier('execute'),
        initializer
      ))
    }
    definitions.forEach(item=>{

      if(item._class){
        definer.push(t.property('init',
          t.literal('.'+item._class),
          item
        ))
      }else{
        definer.push(t.property('init',
          t.literal(':'+item.id.name),
          item
        ))
      }

    });
    definer = t.objectExpression(definer);



    /*
    var definer = t.functionExpression(null, [t.identifier("module")], t.blockStatement(body));
    if(options.bind){
      definer = t.callExpression(
        t.memberExpression(
          definer,
          t.identifier("bind")
        ),[
          t.callExpression(t.identifier("eval"),[t.literal("this.global=this")])
        ]
      );
    }*/
    var body = [];
    var definer = util.template("asx-module",{
      MODULE_NAME: t.literal(this.getModuleName()),
      MODULE_BODY: definer
    });
    if(options.runtime){
      var rt = util.template("asx-runtime")
      //rt._compact = true;
      body.push(t.expressionStatement(rt));
    }
    body.push(t.expressionStatement(definer))
    program.body = body;
  }

  /**
   * Get the AMD module name that we'll prepend to the wrapper
   * to define this module
   */
  getModuleName() {
    return super.getModuleName();
  }
  importDeclaration(node) {
    this.getImport(node.source.value)['*'] = '*';
  }
  importSpecifier(specifier, node, nodes) {
    var imp = this.getImport(node.source.value);
    switch(specifier.type){
      case 'ImportNamespaceSpecifier' :
        imp['*'] = specifier.local.name;
      break;
      case 'ImportDefaultSpecifier' :
        imp['#'] = specifier.local.name;
      break;
      case 'ImportSpecifier' :
        var imported = specifier.imported.name;
        var local = specifier.local.name;
        if(imported == local){
          imp[imported] = '*';
        }else{
          imp[imported] = local;
        }
      break;
    }
  }
  exportAllDeclaration(node, nodes) {
    this.getExport(node.source.value)['*'] = '*';
  }
  exportDeclaration(node, nodes) {
    //console.info("Declaration");
    switch(node.type){
      case 'ExportDefaultDeclaration' :
        var exp = this.getExport();
        exp['#'] = node.declaration;
    }
    //JSON.ast_print(node);
  }
  exportSpecifier(specifier, node, nodes) {
    var exp = this.getExport(node.source?node.source.value:false);
    switch(specifier.type){
      case 'ExportSpecifier' :
        var exported = specifier.exported.name;
        var local = specifier.local.name;
        exp[exported] = local==exported?'*':local;
      break;
      default :
        JSON.ast_print(specifier);
      break;
    }
  }
}
