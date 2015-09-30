import {Compiler} from "./compiler/compiler"

export class CLI {
    exec(config,args){
        Compiler.run();
    }
}

export default new CLI().exec(null,process.argv);