require('dotenv').config()
const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const MediaRoutes = require('./routes/media-routes')
const errorHandler = require('./middleware/errorHandler')
const {connectToRabbitMQ,consumeEvent} = require('./utils/rabbitmq')
const {handlePostDeleted} = require('./eventHandlers/media-event-handlers')
const app = express()

const PORT = process.env.PORT

mongoose
.connect(process.env.MONGODB_URL)
.then(()=>logger.info("connected to mongodb"))
.catch((e)=>logger.error('mongo connection error',e))

app.use(helmet()) // prevent header attracks
app.use(cors())
app.use(express.json()) // parse the data to json

app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`request body ${req.body}`)
    next()
})

// pending => implement ip base rate limiting for sensitive endpoint


app.use('/api/media',MediaRoutes)
app.use(errorHandler)

async function startServer(){
    try {
        await connectToRabbitMQ()
        //consume all the event
        await consumeEvent('post.deleted',handlePostDeleted)

        app.listen(PORT,()=>{
            logger.info(`media service running on port ${PORT}`)
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