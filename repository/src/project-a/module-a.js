import {B,C,D} from './module-b';
import {BA} from 'project-b/module-a';

export default X;

export const A:String = [C,D].join(" & ");
export const X:String = 'DEFAULT '+B+' Project B '+BA;
console.info(X);


