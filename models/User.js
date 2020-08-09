const userCollection = require('../db').collection('user')
const validator = require('validator')

let User = function(data) {
    this.data = data
    this.errors = []
}

User.prototype.cleanUp = function () {
    let {username, email, password} = this.data
    if (typeof(username) !== "string") {username = ""}
    if (typeof(email) !== "string") {email = ""}
    if (typeof(password) !== "string") {password = ""}

    //get rid of bogus properties
    this.data = {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: password
    }
}

User.prototype.validate = function() {
    let {username, email, password} = this.data
    if(username ===""){this.errors.push("Username can't be empty")}
    if(username !="" && !validator.isAlphanumeric(username, ['en-US'])){this.errors.push("Username can only contain letters and numbers.")}
    if(!validator.isEmail(email)){this.errors.push("Email address can't be empty")}
    if(password ===""){this.errors.push("Password can't be empty")}
    if(username.length >0 && username.length < 3){this.errors.push("Username must be at least 3 characters.")}
    if(username.length >30){this.errors.push("Username can't exceed 30 characters.")}
    if(password.length >0 && password.length < 6){this.errors.push("Password must be at least 6 characters.")}
    if(password.length >80){this.errors.push("Username can't exceed 80 characters.")}
}

User.prototype.register = function() {
    this.cleanUp()
    // validate user data
    this.validate()
    // no errors && save to database
    if (!this.errors.length) {
        userCollection.insertOne(this.data)
    }

}
module.exports = User