const mongoose = require('mongoose')

const refreshTokenSchema = mongoose.Schema({
    token:{
        type: String,
        required: true,
        unique: true
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    expireAt:{
        type: Date,
        required: true
    }

},{timestamps:true})

refreshTokenSchema.index({expireAt:1},{expireAfterSecond:0})
const RefreshToken = mongoose.model('RefreshToken',refreshTokenSchema)

module.exports = RefreshToken