
import express from 'express';
import {createServer} from 'http';

import {connectToSocket as ConnectToSocket }  from './controllers/socketManager.js';

import dotenv from 'dotenv';

dotenv.config();



import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/users.routes.js';

const app=express();

/**
 We create the HTTP server manually instead of using app.listen()
 because app.listen() creates the server internally and we don't get access to it.
 Here, we need the server instance so we can share it with Socket.IO.
 * 
 */
const server =createServer(app);

/**
 *Attach Socket.IO to the SAME HTTP server
// This allows both:
// 1. Express → handle normal HTTP routes (API requests)
// 2. Socket.IO → handle real-time communication (WebSockets)
 */
const io= ConnectToSocket(server);

// Set the port for the app
// If running in production, use the PORT provided by the environment
// Otherwise, default to 4002 for local development
app.set("port", process.env.PORT || 4002); // key, value
app.use(cors());
app.use(express.json({limit:'40kb'})); // to parse JSON request bodies with a size limit of 40kb json data back to the jsobject from <frontend />
app.use(express.urlencoded({limit:"40kb", extended:true})); 
// to parse URL-encoded request bodies (like form data) and extended:true 
// allows for rich objects and arrays to be encoded into the URL-encoded format,
//  which can be useful for complex data structures.
app.use("/api/v1/users", userRoutes); // Mount the user routes at the /api/users path


const PORT=app.get("port");

app.get('/', (req, res)=>{
        res.send('Welcome to video call app');
} )

const startServer= async ()=>{
                try{
                await mongoose.connect(process.env.MONGODB_URI)
                console.log('Connected to MongoDB');

                server.listen(PORT, ()=>{
                console.log(`Server is running on Port http://localhost:${PORT}`);
                })}
                
                catch(error){
                console.error('Error connecting to MongoDB:', error);

         }
}
startServer();