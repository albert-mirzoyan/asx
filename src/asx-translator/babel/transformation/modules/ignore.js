import * as t from "../../types/index";

export default class IgnoreFormatter {
  exportDeclaration(node, nodes) {
    var declar = t.toStatement(node.declaration, true);
    if (declar) nodes.push(t.inherits(declar, node));
  }

  exportAllDeclaration() {}
  importDeclaration() {}
  importSpecifier() {}
  exportSpecifier() {}
}
