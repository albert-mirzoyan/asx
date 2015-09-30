import {isFunction} from "../../../lodash/index";
import {defaults} from "../../../lodash/index";
import {includes} from "../../../lodash/index";
import {assign} from "../../../lodash/index";
import {clone} from "../../../lodash/index";
import {each} from "../../../lodash/index";

//import * as optionParsers from "./option-parsers";
import moduleFormatters from "../modules/index";
import PluginManager from "./plugin-manager";
import TraversalPath from "../../traversal/path/index";

//import sourceMap from "source-map";
import "./../index";
import generate from "../../generation/index";
//import codeFrame from "../../helpers/code-frame";
import traverse from "../../traversal/index";
//import Logger from "./logger";
import parse from "../../helpers/parse";
import Scope from "../../traversal/scope";
//import * as util from  "../../util";
//import path from "path";
//import * as t from "../../types/index";
//import OPTIONS from "./options";

var checkTransformerVisitor = {
  exit(node, parent, scope, state) {
    checkPath(state.stack, this);
  }
};

function checkPath(stack, path) {
  each(stack, function (pass) {
    if (pass.shouldRun || pass.ran) return;
    pass.checkPath(path);
  });
}

export default class File {
  static options = {
    "code": true,
    "stage": 0,
    "filename": "http/index.js",
    "moduleId": "asx-server/http/index",
    "modules": "asx",
    "extra": {},
    "retainLines": false,
    "nonStandard": true,
    "highlightCode": true,
    "suppressDeprecationMessages": false,
    "blacklist": [],
    "optional": [],
    "moduleIds": false,
    "loose": [],
    "jsxPragma": "React.createElement",
    "plugins": [],
    "ignore": [],
    "only": [],
    "ast": true,
    "comments": true,
    "compact": "auto",
    "keepModuleIdExtensions": false,
    "auxiliaryComment": "",
    "externalHelpers": false,
    "metadataUsedHelpers": false,
    "sourceMaps": false,
    "breakConfig": false
  };
  constructor(opts = {}, pipeline=null) {
    this.dynamicImportTypes = {};
    this.dynamicImportIds   = {};
    this.dynamicImports     = [];

    this.declarations = {};
    this.usedHelpers  = {};
    this.dynamicData  = {};
    this.data         = {};
    this.uids         = {};

    this.pipeline = pipeline;
    this.opts     = this.normalizeOptions(opts);
    this.ast      = {};

    this.buildTransformers();
  }




  normalizeOptions(opts: Object) {
    if (opts.project){
      this.project = opts.project;
      delete opts.project;
    }
    opts = assign(File.options, opts);
    return opts;
  };

  isLoose(key: string) {
    return false;
  }

  buildTransformers() {
    var file = this;

    var transformers = this.transformers = {};

    var secondaryStack = [];
    var stack = [];

    // build internal transformers
    each(this.pipeline.transformers, function (transformer, key) {
      var pass = transformers[key] = transformer.buildPass(file);

      stack.push(pass);

      if (transformer.metadata.secondPass) {
        secondaryStack.push(pass);
      }

      if (transformer.manipulateOptions) {
        transformer.manipulateOptions(file.opts, file);
      }
    });

    // init plugins!
    var beforePlugins = [];
    var afterPlugins = [];
    var pluginManager = new PluginManager({
      file          : this,
      transformers  : this.transformers,
      before        : beforePlugins,
      after         : afterPlugins
    });
    for (var i = 0; i < file.opts.plugins.length; i++) {
      pluginManager.add(file.opts.plugins[i]);
    }
    stack = beforePlugins.concat(stack, afterPlugins);

    // register
    this.transformerStack = stack.concat(secondaryStack);
  }

  set(key: string, val): any {
    return this.data[key] = val;
  }

  setDynamic(key: string, fn: Function) {
    this.dynamicData[key] = fn;
  }

  get(key: string): any {
    var data = this.data[key];
    if (data) {
      return data;
    } else {
      var dynamic = this.dynamicData[key];
      if (dynamic) {
        return this.set(key, dynamic());
      }
    }
  }


  attachAuxiliaryComment(node: Object): Object {
    var comment = this.opts.auxiliaryComment;
    if (comment) {
      node.leadingComments = node.leadingComments || [];
      node.leadingComments.push({
        type: "Line",
        value: " " + comment
      });
    }
    return node;
  }

  errorWithNode(node, msg, Error = SyntaxError) {
    var loc = node.loc.start;
    var err = new Error(`Line ${loc.line}: ${msg}`);
    err.loc = loc;
    return err;
  }

  checkPath(path) {
    if (Array.isArray(path)) {
      for (var i = 0; i < path.length; i++) {
        this.checkPath(path[i]);
      }
      return;
    }

    var stack = this.transformerStack;

    checkPath(stack, path);

    path.traverse(checkTransformerVisitor, {
      stack: stack
    });
  }



  getModuleFormatter(type: string) {
    var ModuleFormatter = isFunction(type) ? type : moduleFormatters[type];
    if (!ModuleFormatter) {
      throw new ReferenceError(`Unknown module formatter type ${JSON.stringify(type)}`);
    }
    return new ModuleFormatter(this);
  }

  parse(code: string) {
    var opts = this.opts;

    //

    var parseOpts = {
      highlightCode: opts.highlightCode,
      nonStandard:   opts.nonStandard,
      filename:      opts.filename,
      plugins:       {}
    };

    var features = parseOpts.features = {};
    for (var key in this.transformers) {
      features[key] = !!this.transformers[key];
    }

    parseOpts.looseModules = this.isLoose("es6.modules");
    parseOpts.strictMode = false;//features.strict;
    parseOpts.sourceType = "module";
    var tree = parse(code, parseOpts);
    return tree;
  }

  _addAst(ast) {

    this.path  = TraversalPath.get(null, null, ast, ast, "program", this);
    this.scope = this.path.scope;
    this.ast   = ast;
    //this.sast  = JSON.parse(JSON.ast(ast));
    var deps = {}
    this.path.traverse({
      enter(node, parent, scope) {
        if(this.isImportDeclaration()){
          deps[node.source.value] = true;
        }
        if(this.isExportDeclaration()){
          if(node.source){
            deps[node.source.value] = true;
          }
        }
        if (this.isScope()) {
          for (var key in scope.bindings) {
            scope.bindings[key].setTypeAnnotation();
          }
        }
      }
    });
    this.deps = Object.keys(deps);
  }

  addAst(ast) {

    this._addAst(ast);



    this.checkPath(this.path);



    var modFormatter = this.moduleFormatter = this.getModuleFormatter(this.opts.modules);
    if (modFormatter.init) {
      modFormatter.init();
    }


    this.call("pre");
    each(this.transformerStack, function (pass) {
      pass.transform();
    });
    this.call("post");
  }

  wrap(code, callback) {
    try {
      callback();
      return this.generate();
    } catch (err) {
      if (err._babel) {
        throw err;
      } else {
        err._babel = true;
      }

      var message = err.message = `${this.opts.filename}: ${err.message}`;

      if (err.stack) {
        var newStack = err.stack.replace(err.message, message);
        try {
          err.stack = newStack;
        } catch (e) {
          // `err.stack` may be a readonly property in some environments
        }
      }
      throw err;
    }
  }

  addCode(code: string, parseCode) {
    code = (code || "") + "";
    this.code = code;

    if (parseCode) {
      this.addAst(this.parse(this.code));
    }
  }
  call(key: string) {
    var stack = this.transformerStack;
    for (var i = 0; i < stack.length; i++) {
      var transformer = stack[i].transformer;
      var fn = transformer[key];
      if (fn) fn(this);
    }
  }
  resolveModuleSource(source: string): string {
    return source;
  }
  generate(){
    var opts = this.opts;
    var ast  = this.ast;

    var result = {
      metadata: {},
      code:     "",
      map:      null,
      ast:      null,
      deps: this.deps
    };

    if (this.opts.metadataUsedHelpers) {
      result.metadata.usedHelpers = Object.keys(this.usedHelpers);
    }

    if (opts.ast) {
      result.ast = ast;
      //result.sast = sast;
    }
    if (!opts.code) return result;



    var _result = generate(ast, opts, this.code);
    result.code = _result.code;
    result.map  = _result.map;



    if (this.shebang) {
      // add back shebang
      result.code = `${this.shebang}\n${result.code}`;
    }

    return result;
  }
}
