import callDelegate from "../../helpers/call-delegate";
import * as util from  "../../../util";
import * as t from "../../../types/index";
export var metadata = {
    group: "builtin-pre"
};
export function shouldVisit(node) {
    return t.isFunction(node);
}
var ArgInitTemplate = util.template('arg-init',`
    NAME = arguments.has(INDEX)?NAME:DEFAULT;
`);
var ArgRestTemplate = util.template('arg-init',`
    NAME = arguments.rest(INDEX);
`);
exports.Super = function (node, parent, scope, file) {
    /*var path = scope.path;
    var id = path.getData('_super');
    if(!id){
        id = t.identifier('_super');
        scope.push({
            id:id,
            init:t.callExpression(t.memberExpression(t.identifier('__'),t.identifier('super')),[
                t.identifier('this')
            ])
        });

        return id;
    }*/
    scope.path.setData('_super',true);
    return t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('super')),[t.identifier('this')]);
};
exports.Function = function (node, parent, scope, file) {
    if (node.params) {
        var rest = false,inits = [],argsInit = false;
        node.params = node.params.map((param,id)=> {
            var result = param;
            switch (param.type) {
                case 'AssignmentPattern':
                    argsInit = true;
                    result = param.left;
                    result.init = param.right;
                    result.isOptional = false;
                break;
                case 'RestElement':
                    argsInit = true;
                    rest = true;
                    result = param.argument;
                    result.isRest = true;
                    result.typeAnnotation = param.typeAnnotation;
                    break;
            }
            if(result.init){
                inits.push(t.expressionStatement(ArgInitTemplate({
                    NAME    :result,
                    INDEX   :t.literal(id),
                    DEFAULT :result.init
                })));
                delete result.init;
            }
            if(result.isRest){
                inits.push(t.expressionStatement(ArgRestTemplate({
                    NAME    :result,
                    INDEX   :t.literal(id)
                })));
            }
            return result;
        });
        if(argsInit){
            node.body.body = inits.concat(node.body.body);
            node.body.body.unshift(t.expressionStatement(t.callExpression(t.memberExpression(
                t.identifier('Asx'),t.identifier('args')
            ),[
                t.thisExpression(),
                t.identifier('arguments')
            ])));
        }
        /*if(argsInit){
            var args = [
                t.thisExpression(),
                t.identifier('arguments')
            ];

            if(
                !this.parentPath.isProgram() &&
                !this.parentPath.isMethodDefinition()
            ){
                args.push(t.literal(rest));
                var p,o,keys=Object.keys(inits);
                if(keys.length){
                    p=Array(keys.length);
                    keys.forEach(key=>{
                        p.push(o=t.property('init',t.identifier('_'+key),inits[key]));
                        o._compact = false;
                    });
                    p=t.objectExpression(p);
                    p._compact = keys.length<=1;
                    args.push(p);
                }
            }
            var local = t.identifier('_args');
            scope.push({id:local,init:t.callExpression(t.memberExpression(
                t.identifier('__'),t.identifier('args')
            ),args)});
        }*/

    }
};
