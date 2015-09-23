import {User} from './models/user';
import {Mirror} from 'runtime';
import {Field} from 'runtime';

var user:User = new User('Sergey Mamyan','sergey.mamyan@gmail.com');

user.addPost("Hello");
user.addPost("World");

console.info(user);


var UserClass = Mirror.reflect(User);
UserClass.definitions.filter(d=>d instanceof Field).forEach(d=>{
    console.info(d.name,d.type.value,d.type.params);
});