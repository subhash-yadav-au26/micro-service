const express = require('express')
const multer = require('multer')

const {uploadMedia,getAllMedias} = require("../controllers/media-controller")
const {authenticateRequest} = require("../middleware/authMiddleware")

const logger = require('../utils/logger')

const routers = express.Router()

//configure multer for file upload

const upload = multer({
    storage: multer.memoryStorage(),
    limits:{
        fileSize: 5*1024*1024
    }
}).single('file')

routers.post('/upload',authenticateRequest, (req,res,next)=>{
    upload(req,res,function(err){
        if(err instanceof multer.MulterError){
            logger.error('multer error while uploading',err)
            return res.status(400).json({
                message:"multer error while uploading",
                success: false,
                error: err.message,
                stack: err.stack
            })
        }else if(err){
            logger.error('unknown error occure while uploading',err)
            return res.status(400).json({
                message:"unknown error occure  while uploading",
                success: false,
                error: err.message,
                stack: err.stack
            })
        }

        if(!req.file){
            return res.status(400).json({
                message:"no file found",
                success: false,
            })
        }
        next()
    })
},uploadMedia)

routers.get('/get',authenticateRequest,getAllMedias)

module.exports = routers