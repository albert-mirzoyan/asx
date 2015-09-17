import {B,C,D} from './module-b';
import {BA} from 'project-b/module-a';

export default 'DEFAULT '+B+' Project B '+BA;

export const A:String = [C,D].join(" & ");
