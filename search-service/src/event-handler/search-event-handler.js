const Search = require("../models/Search");
const logger = require("../utils/logger");


async function handlePostCreated(event){
    try {
        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createAt: event.createAt
        })

        await newSearchPost.save()

        logger.info('search post created')

    } catch (error) {
        logger.error(error,'Error handling post creation event')
    }
}

async function handlePostDeleted(event){
    try {
        await Search.findOneAndDelete({postId: event.postId})
        logger.info('search post deleted')
    } catch (error) {
        logger.error(error,'Error handling post delete event')

    }
}

module.exports = {handlePostCreated,handlePostDeleted}