const bcrypt = require('bcryptjs')
const userCollection = require('../db').db().collection('user')
const validator = require('validator')
const md5 = require('md5')

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
    return new Promise( async (resolve, reject) => {
        let {username, email, password} = this.data
        if(username ===""){this.errors.push("Username can't be empty")}
        if(username !="" && !validator.isAlphanumeric(username, ['en-US'])){this.errors.push("Username can only contain letters and numbers.")}
        if(!validator.isEmail(email)){this.errors.push("Email address can't be empty")}
        if(password ===""){this.errors.push("Password can't be empty")}
        if(username.length >0 && username.length < 3){this.errors.push("Username must be at least 3 characters.")}
        if(username.length >30){this.errors.push("Username can't exceed 30 characters.")}
        if(password.length >0 && password.length < 6){this.errors.push("Password must be at least 6 characters.")}
        if(password.length >50){this.errors.push("Username can't exceed 50 characters.")}
    
        // username/email valid && taken?
        if(username.length >2 && username.length < 31 && validator.isAlphanumeric(username)) {
            let usernameExists = await userCollection.findOne({username: username})
            if (usernameExists) { this.errors.push("Username is already taken")}
        }
        if(validator.isEmail(email)) {
            let emailTaken = await userCollection.findOne({email: email})
            if(emailTaken) { this.errors.push("this email is already being used.")}
        }
        resolve()
    })
}

User.prototype.getAvatar = function() {
    this.avatar =`https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.prototype.login = function() {
   return new Promise((resolve, reject)=>{
    this.cleanUp()
    userCollection.findOne({username: this.data.username})
    .then((attemptedUser)=>{
        if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
            this.data = attemptedUser
            this.getAvatar()
            resolve("yes!")
        }else{
            reject("wrong informations!")
        }
    })
    .catch(()=> {reject("please try again later")})
    })
}

User.prototype.register = function() {
    return new Promise( async (resolve, reject) => {
            this.cleanUp()
            await this.validate()
            // no errors && save to database
            if (!this.errors.length) {
                // hash the password
                let salt = bcrypt.genSaltSync(10)
                this.data.password = bcrypt.hashSync(this.data.password, salt)
                await userCollection.insertOne(this.data)
                this.getAvatar()
                resolve()
            }else{
                reject(this.errors)
            }
        
        }
    )
}

module.exports = User