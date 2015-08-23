import callDelegate from "../../helpers/call-delegate";
import * as util from  "../../../util";
import traverse from  "../../../traversal";
import * as t from "../../../types";
export function shouldVisit(node) {
    return t.isFunction(node);
}
exports.Function = function (node, parent, scope, file) {
    if (!node._generated && node.params && node.params.length) {
        console.info('parent',scope.dump());
        node.params = node.params.map(param=> {
            var result = param;
            switch (param.type) {
                case 'AssignmentPattern':
                    result = param.left;
                    result.init = param.right;
                    result.isOptional = false;
                    return param.left;
                break;
                case 'RestElement':
                    result = param.argument;
                    result.isRest = true;
                    result.typeAnnotation = param.typeAnnotation;
                break;
            }
            return result;
        });

        node.body.body.unshift(t.expressionStatement(
            t.callExpression(t.memberExpression(
                t.identifier('Function'),t.identifier('args')),[
                t.literal(node.id?node.id.name:'anonymous'),
                t.identifier('arguments'),
                t.identifier('this')
            ])
        ))
    }
};
