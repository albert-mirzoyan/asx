import memoiseDecorators from "../../helpers/memoise-decorators";
import * as defineMap from "../../helpers/define-map";
import * as t from "../../../types/index";


export function shouldVisit(node) {
  return !!node.decorators;
}
export function ObjectExpression(node, parent, scope, file) {
}
