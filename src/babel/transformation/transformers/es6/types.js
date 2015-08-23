/**
 * Created by Sergey on 8/20/15.
 */

import * as t from "../../../types/index";
export function ClassProperty(node){
    console.info(node)
}
export function Flow(node,parent) {
    console.info(parent.type,this.key,node.type);
}
