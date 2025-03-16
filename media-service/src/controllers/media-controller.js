const logger = require('../utils/logger')
const {uploadMediaToCloudinary} = require('../utils/cloudinary')
const Media = require('../models/Media')

const uploadMedia = async (req,res)=>{
    logger.info('starting media upload')
    try {
        if(!req.file){
            logger.error('no file found')
            return res.status(400).json({
                success: false,
                message: "no file found"
            })
            
        }

        const {originalname, mimetype, buffer} = req.file
        const userId = req.user.userId
        logger.info(`File detail ${originalname}, type=${mimetype}`)
        const cloudinaryMediaResult = await uploadMediaToCloudinary(req.file)
        logger.info(`cloudinaryupload successfully public id- ${cloudinaryMediaResult.public_id}`)

        const newlyCreatedMedia = new Media({
            publicId:cloudinaryMediaResult.public_id,
            originalName:originalname,
            mimeType:mimetype,
            url: cloudinaryMediaResult.secure_url,
            userId
        })

        await newlyCreatedMedia.save()

        res.status(201).json({
            success:true,
            mediaId: newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
            message:"media uploaded successfully"
        })

    } catch (error) {
        logger.error("Error upload media  ", error)
        res.status(500).json({
            success : false,
            message: "Error upload media"
        })
    }
}

const getAllMedias = async (req,res)=>{
    try {
        const result = await Media.find({})
        res.json(result)
    } catch (error) {
        logger.error("Error fetch media  ", error)
        res.status(500).json({
            success : false,
            message: "Error fetch media"
        })
    }
}

module.exports = {uploadMedia,getAllMedias}