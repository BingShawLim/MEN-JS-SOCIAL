const postCollection = require('../db').db().collection('posts')
const followsCollection = require('../db').db().collection('follows')
const ObjectID = require('mongodb').ObjectID
const User = require('./User')
const sanitizeHTML = require('sanitize-html')

let Post = function (data, userid, requestedPostId) {
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanUp = function() {
    let {title, body} = this.data
    if (typeof(title) !== 'string') { title = "" }
    if (typeof(body) !== 'string') { body = "" }

    this.data = {
        title: sanitizeHTML(title.trim(),{allowTags: [], allowedAttributes: {}}),
        body: sanitizeHTML(body.trim(),{allowTags: [], allowedAttributes: {}}),
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
            postCollection.insertOne(this.data).then((info)=>{
                resolve(info.ops[0]._id)
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

Post.prototype.update = function() {
    return new Promise(async (resolve, reject)=> {
        try{
            let post = await Post.findSingleById(this.requestedPostId, this.userid)
            if (post.isVisitorOwner) {
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
                reject()
            }
        }catch{
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function() {
    return new Promise( async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            await postCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)}, {$set: {title: this.data.title, body: this.data.body}})
            resolve("success")
        } else {
            resolve('failure')
        }
    })
}

Post.reusablePostQuery = function(uniqueOperations, visitorId) {
    return new Promise(async (resolve, reject)=> {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from:"user", localField:"author", foreignField:"_id", as:"authorDocument"}},
            {$project: {
                title:1,
                body:1,
                createdDate:1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]}
            }}
        ])

        let posts = await postCollection.aggregate(aggOperations).toArray()

        posts = posts.map((post)=>{
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.authorId = undefined
            post.author ={
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
}

Post.findSingleById = function(id, visitorId) {
    return new Promise(async (resolve, reject)=> {
        //verify
        if(typeof(id) !== "string" || !ObjectID.isValid(id)){
            reject()
            return }

        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectID(id)}}
        ], visitorId)

        if (posts.length) {
            resolve(posts[0])
        } else {reject()}
    })
}

Post.findByAuthorId = function(authorId) {
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createdDate: -1}}
    ])
}

Post.delete = function(postIdToDelete, currentUserId) {
    return new Promise(async (resolve, reject) => {
    try{
        let post = await Post.findSingleById(postIdToDelete, currentUserId)
        if (post.isVisitorOwner) {
           await postCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
           resolve()
        } else {
           reject() 
        }
    }catch{
        reject()
    }
    })
}

Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
      if (typeof(searchTerm) == "string") {
        let posts = await Post.reusablePostQuery([
          {$match: {$text: {$search: searchTerm}}},
          {$sort: {score: {$meta: "textScore"}}}
        ])
        resolve(posts)
      } else { 
        reject()
      }
    })
  }


Post.countPostsByAuthor = function (id) {
    return new Promise(async (resolve, reject) => {
        let postCount = await postCollection.countDocuments({ author: id })
        resolve(postCount)
      })
  }
  
Post.getFeed = async function (id) {
    // gather followed ids
    let followedUsers = await followsCollection.find({ authorId: new ObjectID(id) }).toArray()
    followedUsers = followedUsers.map(function (followDoc) {
        return followDoc.followedId
    })
    // found followed users posts
    return Post.reusablePostQuery([
        { $match: { author: { $in: followedUsers } } },
        {$sort: {createdDate: -1}}
    ])
}

module.exports = Post