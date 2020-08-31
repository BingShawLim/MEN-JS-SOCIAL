const User = require('../models/User')
const Post = require('../models/Post')

exports.login = (req, res)=> {
    let user = new User(req.body)
    user.login().then((result)=> {
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(()=> {
            res.redirect('/')
        })
    })
    .catch((err)=>{
        req.flash('errors', err)
        // req.session.flash.errors =[err]
        req.session.save(()=> {
            res.redirect('/')
        })
    })
}

exports.logout = (req, res)=> {
    req.session.destroy(()=>{
        res.redirect('/')
    })

}

exports.register = (req, res)=> {
    let user = new User(req.body)
    user.register()
    .then(()=> {
        req.session.user ={avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(()=> {
            res.redirect('/')
        })
    })
    .catch((regErrors) => {
        regErrors.forEach(function(err) {
            req.flash('regErrors', err)
        })
        req.session.save(()=> {
            res.redirect('/')
        })
    })

}

exports.mustBeLoggedIn = function(req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash("error", "you shell no pass, unless you login.")
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.home = (req, res)=> {
    if (req.session.user) {
        res.render("home-dashboard")
    } else {
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists= function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
        req.profileUser = userDocument
        next()
    }).catch(function() {
        res.render('404')
    })
}

exports.profilePostsScreen = function(req, res) {
    Post.findByAuthorId(req.profileUser._id).then((posts)=>{
        res.render('profile', {
            posts: posts,
            username:req.profileUser.username,
            avatar: req.profileUser.avatar
        })
    }).catch(()=>{
        res.render('404')
    })
}