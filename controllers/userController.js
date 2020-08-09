const User = require('../models/User')

exports.login = ()=> {

}

exports.logout = ()=> {
    
}

exports.register = (req, res)=> {
    let user = new User(req.body)
    user.register()
    if(user.errors.length > 0) {
        res.send(user.errors)
    }else{
        res.send("Register completed.")
    }
}

exports.home = (req, res)=> {
    res.render('home-guest')
}