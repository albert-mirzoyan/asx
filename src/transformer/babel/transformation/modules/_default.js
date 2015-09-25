import * as messages from "../../messages";
import traverse from "../../traversal";
import extend from "../../../lodash/object/extend";
import object from "../../helpers/object";
import * as util from  "../../util";
import * as t from "../../types";

var remapVisitor = traverse.explode({
  enter(node, parent, scope, formatter) {
    if (node._skipModulesRemap) {
      return this.skip();
    }
  },

  Identifier(node, parent, scope, formatter) {
    var remap = formatter.internalRemap[node.name];

    if (this.isReferencedIdentifier() && remap && node !== remap) {
      if (!scope.hasBinding(node.name) || scope.bindingIdentifierEquals(node.name, formatter.localImports[node.name])) {
        return remap;
      }
    }
  },

  AssignmentExpression: {
    exit(node, parent, scope, formatter) {
      if (!node._ignoreModulesRemap) {
        var exported = formatter.getExport(node.left, scope);
        if (exported) {
          return formatter.remapExportAssignment(node, exported);
        }
      }
    }
  },

  UpdateExpression(node, parent, scope, formatter) {
    var exported = formatter.getExport(node.argument, scope);
    if (!exported) return;

    this.skip();

    // expand to long file assignment expression
    var assign = t.assignmentExpression(node.operator[0] + "=", node.argument, t.literal(1));

    // remap this assignment expression
    var remapped = formatter.remapExportAssignment(assign, exported);

    // we don't need to change the result
    if (t.isExpressionStatement(parent) || node.prefix) {
      return remapped;
    }

    var nodes = [];
    nodes.push(remapped);

    var operator;
    if (node.operator === "--") {
      operator = "+";
    } else { // "++"
      operator = "-";
    }
    nodes.push(t.binaryExpression(operator, node.argument, t.literal(1)));

    return t.sequenceExpression(nodes);
  }
});

var importsVisitor = {
  ImportDeclaration: {
    enter(node, parent, scope, formatter) {
      formatter.hasLocalImports = true;
      extend(formatter.localImports, this.getBindingIdentifiers());
    }
  }
};

var exportsVisitor = traverse.explode({
  ExportDeclaration: {
    enter(node, parent, scope, formatter) {
      formatter.hasLocalExports = true;

      var declar = this.get("declaration");
      if (declar.isStatement()) {
        var bindings = declar.getBindingIdentifiers()
        for (var name in bindings) {
          var binding = bindings[name];
          formatter._addExport(name, binding);
        }
      }

      if (this.isExportNamedDeclaration() && node.specifiers) {
        for (var i = 0; i < node.specifiers.length; i++) {
          var specifier = node.specifiers[i];
          var local = specifier.local;
          if (!local) continue;

          formatter._addExport(local.name, specifier.exported);
        }
      }

      if (!t.isExportDefaultDeclaration(node)) {
        var onlyDefault = node.specifiers && node.specifiers.length === 1 && t.isSpecifierDefault(node.specifiers[0]);
        if (!onlyDefault) {
          formatter.hasNonDefaultExports = true;
        }
      }
    }
  }
});

export default class DefaultFormatter {
  constructor(file) {
    this.internalRemap = object();
    this.defaultIds    = object();
    this.scope         = file.scope;
    this.file          = file;
    this.ids           = object();

    this.hasNonDefaultExports = false;

    this.hasLocalExports = false;
    this.hasLocalImports = false;

    this.localExports = object();
    this.localImports = object();

    this.getLocalExports();
    this.getLocalImports();
  }

  isModuleType(node, type) {
    var modules = this.file.dynamicImportTypes[type];
    return modules && modules.indexOf(node) >= 0;
  }

  transform() {
    this.remapAssignments();
  }

  doDefaultExportInterop(node) {
    return (t.isExportDefaultDeclaration(node) || t.isSpecifierDefault(node)) && !this.noInteropRequireExport && !this.hasNonDefaultExports;
  }

  getLocalExports() {
    this.file.path.traverse(exportsVisitor, this);
  }

  getLocalImports() {
    this.file.path.traverse(importsVisitor, this);
  }

  remapAssignments() {
    if (this.hasLocalExports || this.hasLocalImports) {
      this.file.path.traverse(remapVisitor, this);
    }
  }

  remapExportAssignment(node, exported) {
    var assign = node;

    for (var i = 0; i < exported.length; i++) {
      assign = t.assignmentExpression(
        "=",
        t.memberExpression(t.identifier("exports"), exported[i]),
        assign
      );
    }

    return assign;
  }

  _addExport(name, exported) {
    var info = this.localExports[name] = this.localExports[name] || {
      binding: this.scope.getBindingIdentifier(name),
      exported: []
    };
    info.exported.push(exported);
  }

  getExport(node, scope) {
    if (!t.isIdentifier(node)) return;

    var local = this.localExports[node.name];
    if (local && local.binding === scope.getBindingIdentifier(node.name)) {
      return local.exported;
    }
  }

  getModuleName() {
    var opts = this.file.opts;
    // moduleId is n/a if a `getModuleId()` is provided
    if (opts.moduleId && !opts.getModuleId) {
      return opts.moduleId;
    }

    var filenameRelative = opts.filenameRelative;
    var moduleName = "";

    if (opts.moduleRoot) {
      moduleName = opts.moduleRoot + "/";
    }

    if (!opts.filenameRelative) {
      return moduleName + opts.filename.replace(/^\//, "");
    }

    if (opts.sourceRoot) {
      // remove sourceRoot from filename
      var sourceRootRegEx = new RegExp("^" + opts.sourceRoot + "\/?");
      filenameRelative = filenameRelative.replace(sourceRootRegEx, "");
    }

    if (!opts.keepModuleIdExtensions) {
      // remove extension
      filenameRelative = filenameRelative.replace(/\.(\w*?)$/, "");
    }

    moduleName += filenameRelative;

    // normalize path separators
    moduleName = moduleName.replace(/\\/g, "/");

    if (opts.getModuleId) {
      // If return is falsy, assume they want us to use our generated default name
      return opts.getModuleId(moduleName) || moduleName;
    } else {
      return moduleName;
    }
  }

  _pushStatement(ref, nodes) {
    if (t.isClass(ref) || t.isFunction(ref)) {
      if (ref.id) {
        nodes.push(t.toStatement(ref));
        ref = ref.id;
      }
    }

    return ref;
  }

  _hoistExport(declar, assign, priority) {
    if (t.isFunctionDeclaration(declar)) {
      assign._blockHoist = priority || 2;
    }

    return assign;
  }

  getExternalReference(node, nodes) {
    var ids = this.ids;
    var id = node.source.value;

    if (ids[id]) {
      return ids[id];
    } else {
      return this.ids[id] = this._getExternalReference(node, nodes);
    }
  }

  checkExportIdentifier(node) {
    if (t.isIdentifier(node, { name: "__esModule" })) {
      throw this.file.errorWithNode(node, messages.get("modulesIllegalExportName", node.name));
    }
  }

  exportAllDeclaration(node, nodes) {
    var ref = this.getExternalReference(node, nodes);
    nodes.push(this.buildExportsWildcard(ref, node));
  }

  isLoose() {
    return this.file.isLoose("es6.modules");
  }


}
