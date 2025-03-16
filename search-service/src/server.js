require('dotenv').config()
const mongoose = require('mongoose')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const Redis = require('ioredis');
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')
const {connectToRabbitMQ, consumeEvent} = require('./utils/rabbitmq')
const searchRoutes = require('./routes/search-routes')
const {handlePostCreated,handlePostDeleted} = require('./event-handler/search-event-handler')
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

app.use('/api/search',searchRoutes)

app.use(errorHandler)

async function startServer(){
    try {
        await connectToRabbitMQ()
        // consume the events // subscribe to the events
        await consumeEvent('post.created',handlePostCreated)
        await consumeEvent('post.deleted',handlePostDeleted)
        app.listen(PORT,()=>{
            logger.info(`search service running on port ${PORT}`)
        })
    } catch (error) {
        logger.error(e,'failed to start search')
        process.exit(1)
    }
}

startServer()

// unhandled promise rejection error
process.on('unhandledRejection',(reason,promise)=>{
    logger.error(`unhandle rejection at`,promise,"reason",reason)
})


