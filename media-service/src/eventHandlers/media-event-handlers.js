const Media = require('../models/Media')
const logger = require('../utils/logger')
const {deleteMediaFromCloudinary} = require('../utils/cloudinary')


const handlePostDeleted = async(event)=>{
    const {postId, mediaIds} = event
    try {
        const mediaToDelete = await Media.find({_id:{$in:mediaIds}})
        for(const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId)
            await media.findByIdAndDelete(media._id)

            logger.info(`delete media ${media._id} associated with this delete msg ${postId}`)

        }
    } catch (error) {
        logger.info(`error delete media ${media._id} associated with this delete msg ${postId}`,error)
    }
}

module.exports = {handlePostDeleted}