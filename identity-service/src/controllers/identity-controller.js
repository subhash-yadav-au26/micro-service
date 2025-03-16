const logger = require('../utils/logger')
const {validateRegistration} = require('../utils/validation')
const User = require('../models/User')
const generateToken = require('../utils/generateToken')
// user registration
const registerUser = async(req,res)=>{
    logger.info("Register")
    try {
        const {error} = validateRegistration(req.body)
        if(error){
            logger.warn('validation error', error.details[0].message)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const {email, password, username} = req.body
        let user = await User.findOne({ $or: [{email},{username}]});
        if(user){
            logger.warn('user exist')
            return res.status(400).json({
                success: false,
                message: "user exist"
            })
        }  
        
        user =  new User({email,password,username})
        await user.save()
        logger.warn('user save successfully',user._id)
        const {accessToken, refreshToken} = await  generateToken(user)
        res.status(201).json({
            success: true,
            message: "user register successfully",
            accessToken,
            refreshToken
        })

    } catch (error) {
        logger.error('register error',error)
        res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
} 
// user login

// refresh token

// logout

module.exports = {
    registerUser
}