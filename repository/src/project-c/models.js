import {User} from './models/user';
import FS from 'http';

var user:User = new User('Sergey Mamyan','sergey.mamyan@gmail.com');

user.addPost("Hello");
user.addPost("World");

console.info(FS);
console.info(user);