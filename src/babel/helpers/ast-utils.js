import * as t from '../types/index';

export class AstUtils {
    static decoratorId = t.identifier("A");

    static convertDecorators(decorators){
        return t.functionExpression(null,[t.identifier('__')],t.blockStatement(decorators.map(d=>t.expressionStatement(
            t.callExpression(t.identifier('__'),[d.expression])
        ))))
    }

    static convertType(type){
        var parameters = [];
        switch(type.type){
            case 'TypeAnnotation' : this.convertType(type.typeAnnotation); break;
            case 'VoidTypeAnnotation' : break;
            case 'AnyTypeAnnotation' : parameters.push(t.identifier('Object')); break;
            case 'NumberTypeAnnotation' : parameters.push(t.identifier('Number')); break;
            case 'BooleanTypeAnnotation' : parameters.push(t.identifier('Boolean')); break;
            case 'StringTypeAnnotation' : parameters.push(t.identifier('String')); break;
            default : parameters.push(type.id);
        }
        if(type.typeParameters){
            var tps  = type.typeParameters;
            tps.params.forEach(p=>{
                parameters.push(this.convertType(p));
            })
        }
        return t.decorator(t.callExpression(t.memberExpression(t.identifier('__'),t.identifier('type')),parameters));
    }

    static convertArguments(params){
        var p=[];
        params.forEach(i=>p.push(this.convertArgument(i)));
        return t.decorator(t.callExpression(t.memberExpression(t.identifier('__'),t.identifier('args')),[t.objectExpression(p)]))
    }
    static convertArgument(param) {
        var type,init=param.init,rest=param.isRest,optional=param.isOptional,args=[];
        if (param.typeAnnotation) {
            type = this.convertType(param.typeAnnotation.typeAnnotation)
        } else {
            type = this.convertType(t.genericTypeAnnotation(t.identifier('Object')))
        }
        args.push(optional ? t.literal(true):t.literal(false));
        args.push(rest ? t.literal(true):t.literal(false));
        args.push(type.expression);
        args.push(init?init:t.literal(null));
        return t.property("init", param, t.arrayExpression(args))
    }
}
export default AstUtils;