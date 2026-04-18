


/*
Final summary
Offer received → setRemoteDescription() ✅
Answer created → setLocalDescription() ✅
ICE exchanged → addIceCandidate() ✅
 *Attach Socket.IO to the SAME HTTP server
// This allows both:
// 1. Express → handle normal HTTP routes (API requests)
// 2. Socket.IO → handle real-time communication (WebSockets)
 
const ConnectToSocket=(server)=>{
        const io= new Server(server)
        return io;
}
// default export is done when we want to export a single value from a module. 
// It can be a function, class, object, or any other JavaScript entity. 
// When another file imports this module, it will receive the default export without needing to know its specific name.
// But when we use named exports, we can export multiple values from a module, and 
// the importing file must use the exact names to access those values.
//for example, if we had multiple functions in this file and wanted to export them all, we could use named exports like this:
// export const ConnectToSocket = (server) => { ... }
// export const anotherFunction = () => { ... }
// Then, in the importing file, we would need to import them using their specific names:
// import { ConnectToSocket, anotherFunction } from './controllers/socketManager.js';
export default ConnectToSocket; */



/**
 * This server
 * manage who is in which call room,
 * relay signaling messages, relay chat messages, and notify users when someone joins or leaves.
 */


import { Server } from "socket.io"

//Stores which socket IDs belong to which room.
let connections = {}

//Stores old chat messages for each room.
let messages = {}

//Stores when each socket connected/joined.
let timeOnline = {}

/**
 * 
 * This function takes your HTTP server and attaches Socket.IO to it.
 */
export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => { // socket id is created and now shared with the client through the browser by sockie.io library in broswer

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path) => {

            if (connections[path] === undefined) { // checking if the room already exists an if not then make one
                connections[path] = []
            }

            connections[path].push(socket.id) // we push 

            timeOnline[socket.id] = new Date();

            // connections[path].forEach(elem => {
            //     io.to(elem)
            // })
            // we are sending the signal to all the users in the room the id of the new user and path of the room.
            // we are only sending it to all the users in the specific room
            // note: io.emit("user-joined", ...) sends to ALL connected users on the server
            //socket.emit("user-joined", ...) sends to  the current user (sender)
            // sending newly joined user id and everybody in the room
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

        })

       // this is just passing the message back to the client but to the specific id in the room
       // message could be offer, answer, icecandiadate info
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            // so the server has to find bsed on socket id which room this user belongs and send the message to all the users 
            // in that room
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {

                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        // socket.io calls it itself when user disconnects 

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key
             // object.entries(connections)
             /**connections = {
                "/room1": ["socket1", "socket2"],
                "/room2": ["socket3"]
                }
                changes to 
                 [key, valuelist]
                [
                ["/room1", ["socket1", "socket2"]],
                ["/room2", ["socket3"]]
                ]
            * 
            */
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }


        })


    })


    return io;
}