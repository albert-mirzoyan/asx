import callDelegate from "../../helpers/call-delegate";
import * as util from  "../../../util";
import traverse from  "../../../traversal";
import * as t from "../../../types";
export var metadata = {
    group: "builtin-pre"
};
export function shouldVisit(node) {
    return t.isFunction(node);
}

exports.Super = function (node, parent, scope, file) {
    var path = scope.path;
    var id = path.getData('_super');
    if(!id){

        id = t.identifier('_super');
        scope.push({id:id,init:t.memberExpression(
            t.identifier('_local'),t.identifier('super')
        )});
        path.setData('_super',id);
        return id;
    }
    return id;
};
exports.Function = function (node, parent, scope, file) {
    if (node.params) {
        var rest = false,inits = {},argsInit = false;
        node.params = node.params.map((param,id)=> {
            var result = param;
            switch (param.type) {
                case 'AssignmentPattern':
                    argsInit = true;
                    inits[id] = param.right;
                    result = param.left;
                    result.init = param.right;
                    result.isOptional = false;
                    return param.left;
                    break;
                case 'RestElement':
                    argsInit = true;
                    rest = true;
                    result = param.argument;
                    result.isRest = true;
                    result.typeAnnotation = param.typeAnnotation;
                    break;
            }
            return result;
        });

        if(argsInit){
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
            var local = t.identifier('_local');
            scope.push({id:local,init:t.callExpression(t.memberExpression(
                t.identifier('__'),t.identifier('locals')
            ),args)});
        }

    }
};
