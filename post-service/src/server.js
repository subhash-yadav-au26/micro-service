require('dotenv').config()
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const Redis = require('ioredis');
const errorHandler = require('./middleware/errorHandler')
const postRoutes = require("./routes/post-routes")
const {connectToRabbitMQ} = require('./utils/rabbitmq')
const app = express()
const PORT = process.env.PORT

mongoose
.connect(process.env.MONGODB_URL)
.then(()=>logger.info("connected to mongodb"))
.catch((e)=>logger.error('mongo connection error',e))

const redisClient = new Redis(process.env.REDIS_URL)

app.use(helmet()) // prevent header attracks
app.use(cors())
app.use(express.json()) // parse the data to json

app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`request body ${req.body}`)
    next()
})

// pending => implement ip base rate limiting for sensitive endpoint



// routes => pass redisclient to routes
app.use('/api/posts',(req,res,next)=>{
    req.redisClient = redisClient
    next()
},postRoutes)

app.use(errorHandler)

async function startServer(){
    try {
        await connectToRabbitMQ()
        app.listen(PORT,()=>{
            logger.info(`post service running on port ${PORT}`)
        })
    } catch (error) {
        logger.error('failed to connect to server',error)
        process.exit(1)
    }
}

startServer()



// unhandled promise rejection error
process.on('unhandledRejection',(reason,promise)=>{
    logger.error(`unhandle rejection at`,promise,"reason",reason)
})