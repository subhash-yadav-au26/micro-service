const Post = require('../models/Post');
const logger = require('../utils/logger')
const {validateCreatePost} = require('../utils/validation')
const {publishEvent} = require('../utils/rabbitmq')
async function invalidPostCache(req,input){
    if(input){
        const cachedKey = `post:${input}`
        await req.redisClient.del(cachedKey)
    }

    const keys = await req.redisClient.keys("posts:*");
    if(keys.length > 0){
        await req.redisClient.del(keys)
    }  
}

const createPost = async (req,res)=>{
    logger.warn('create post api hit',)
    try {
        const {content, mediaIds} = req.body;
        const {error} = validateCreatePost(req.body)
        if(error){
            logger.warn('validation post error', error.details[0].message)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const newlycreatedPost = new Post({
            user : req.user.userId,
            content,
            mediaIds: mediaIds || []
        })
        await newlycreatedPost.save()
        await publishEvent('post.created',{
            postId: newlycreatedPost._id.toString(),
            userId: newlycreatedPost.user.toString(),
            content: newlycreatedPost.content,
            createdAt: newlycreatedPost.createdAt
        })
        
        await invalidPostCache(req,newlycreatedPost._id.toString())
        logger.info("post created successfully",newlycreatedPost)
        res.status(201).json({
            success: true,
            message: 'post created successfully'
        })
        
    } catch (error) {
        logger.error("Error creating post ", error)
        res.status(500).json({
            success : false,
            message: "Error creating post"
        })
    }
}

const getAllPosts = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const startIndex = (page - 1) * limit

        const cacheKey = `posts:${page}:${limit}`
        const cachePosts = await req.redisClient.get(cacheKey)

        if(cachePosts){
            return res.json(JSON.parse(cachePosts))
        }

        const posts = await Post.find({}).sort({createdAt: -1}).skip(startIndex).limit(limit)

        const totalNoofPosts = await Post.countDocuments()

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoofPosts/limit),
            totalPosts:totalNoofPosts
        }

        // save post in redis caches with expires
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result))

        res.json(result)

    } catch (error) {
        logger.error("Error getAllPosts  ", error)
        res.status(500).json({
            success : false,
            message: "Error getAllPosts"
        })
    }
}

const getPost = async (req,res)=>{
    try {
        const postId = req.params.id
        const cachekey = `post:${postId}`
        const cachedPost = await req.redisClient.get(cachekey);
        if(cachedPost){
            return res.json(JSON.parse(cachedPost))
        }

        const singlePostDetailbyId = await Post.findById({_id:postId})
        if(!singlePostDetailbyId){
            return res.status(404).json({
                message: "post not found",
                success: false
            }) 
        }

        await req.redisClient.setex(cachekey, 3600, JSON.stringify(singlePostDetailbyId))

        res.json({singlePostDetailbyId})


    } catch (error) {
        logger.error("Error getPost  ", error)
        res.status(500).json({
            success : false,
            message: "Error getPost"
        })
    }
}

const deletePost = async (req,res)=>{
    try {
        const postId = req.params.id
        const post = await Post.findOneAndDelete({
            _id:postId,
            user:req.user.userId
        })

        if(!post){
            return res.status(404).json({
                message: "post not found",
                success: false
            }) 
        }
        // publish post delete method
        await publishEvent('post.deleted',{
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        })
        await invalidPostCache(req, req.params.id)
        res.json({
            message: "post delete successfully"
        })


    } catch (error) {
        logger.error("Error deletePost  ", error)
        res.status(500).json({
            success : false,
            message: "Error deletePost"
        })
    }
}

module.exports = {
    createPost,
    getAllPosts,
    getPost,
    deletePost 
}