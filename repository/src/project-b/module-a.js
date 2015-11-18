import {B,C,D} from './module-b';
import {User} from './model/user';
import {Post} from './model/post';

export const A = [C,D].join(" & ");
export const BA = 'DEFAULT '+B;

console.info(new User());
console.info(new Post());