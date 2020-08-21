const postCollection = require('../db').db().collection('posts')
const ObjectID = require('mongodb').ObjectID

let Post = function (data, userid) {
    this.data = data
    this.errors = []
    this.userid = userid
}

Post.prototype.cleanUp = function() {
    let {title, body} = this.data
    if (typeof(title) !== 'string') { title = "" }
    if (typeof(body) !== 'string') { body = "" }
    this.data = {
        title: title.trim(),
        body: body.trim(),
        createdDate: new Date(),
        author: ObjectID(this.userid)
    }
}

Post.prototype.validate = function() {
    let {title, body} = this.data
    if(title ==="") {this.errors.push('Title is required.')}
    if(body ==="") {this.errors.push('Post content is required.')}

}

Post.prototype.create = function() {
    return new Promise((resolve, reject)=> {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            postCollection.insertOne(this.data)
            .then(()=>{
                resolve()
            })
            .catch(()=>{
                this.errors.push('Something wrong, please try again later')
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

Post.findSingleById = function(id) {
    return new Promise(async (resolve, reject)=> {
        if(typeof(id) !== "string" || !ObjectID.isValid(id)){
            reject()
            return
        }
        let post = await postCollection.findOne({_id: new ObjectID(id)})
        if (post) {
            resolve(post)
        } else {
            reject()
        }
    })
}

module.exports = Post