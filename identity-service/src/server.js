require('dotenv').config()
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const {RateLimiterRedis} = require('rate-limiter-flexible')
const Redis = require('ioredis');
const {rateLimit} = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis')
const userRoutes = require('./routes/identity-service')
const errorHandler = require('./middleware/errorHandler')

mongoose
.connect(process.env.MONGODB_URL)
.then(()=>logger.info("connected to mongodb"))
.catch((e)=>logger.error('mongo connection error',e))

const redisClient = new Redis(process.env.REDIS_URL)
const app = express()
const PORT = process.env.PORT

// middleware
app.use(helmet()) // prevent header attracks
app.use(cors())
app.use(express.json()) // parse the data to json

app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`request body ${req.body}`)
    next()
})

// ddos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient : redisClient,
    keyPrefix: 'middleware', // key for redis to store the request count
    point:10, // point to make request given time 10s
    duration:1 // means 10 request in 1 second
})

app.use((req,res,next)=>{
    // keep ip address is key 
    rateLimiter.consume(req.ip).then(()=>next()).catch(()=>{
        logger.warn(`rate limit exceeded for ip:${req.ip}`)
        res.status(429).json({
            success: false,
            message: 'Too many request'
        })
    })
})

// ip base rate limiting for sepecific endpoint
const sensitiveRateLimiter = rateLimit({
    windowMs: 15*60*1000,
    max: 50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`sensitive endpoint rate limit exceeded for ip : ${req.ip}`)
        res.status(429).json({
            success: false,
            message: 'Too many request'
        })
    },
    store: new RedisStore({
        sendCommand: (...args)=> redisClient.call(...args)
    })
})

// apply to sensitiveRateLimiter to route
app.use('/api/auth/register',sensitiveRateLimiter)

app.use('/api/auth',userRoutes)

// error handler

app.use(errorHandler)

app.listen(PORT,()=>{
    logger.info(`identity service running on port ${PORT}`)
})

// unhandled promise rejection error
process.on('unhandledRejection',(reason,promise)=>{
    logger.error(`unhandle rejection at`,promise,"reason",reason)
})


//4:18:00 min tak dekha h