import {User} from "../models/users.model.js";
import httpStatus from "http-status";
import bcryt from "bcrypt";
import crypto from "crypto";

import { Meeting } from "../models/meeting.model.js";
const login = async(req, res)=>{

        const {username, password}= req.body;

        if (!username || !password){
                return res.status(httpStatus.BAD_REQUEST).json({message:"All fields are required"});
        }
        try{
                const user= await User.findOne({username});
                if (!user){
                        return res.status(httpStatus.NOT_FOUND).json({message:"User not found"});
                }  
                if (await bcryt.compare(password, user.password)){
                        let token= crypto.randomBytes(20).toString("hex");

                        user.token=token;
                        await user.save();
                        return res.status(httpStatus.OK).json({token: token});
                }
        }
        catch(error){
               return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error:error.message});
        }

}

const register = async (req,res)=>{
        const {name, username, password}=req.body;

        if (!name || !username || !password){
                return res.status(httpStatus.BAD_REQUEST).json({message:"All fields are required"});
        }

        if (password.length <6){
                return res.status(httpStatus.BAD_REQUEST).json({message:"Passowrd must me gratter than 6 characters"});
        }
        try{
                const existingUser= await User.findOne({username});
                if (existingUser){
                        return res.status(httpStatus.FOUND).json({message:"Username already exists"});
                }
                const hashedPasssword= await bcryt.hash(password, 10); 
                // 10 is the number of salt rounds, which determines how many times the hashing algorithm will be applied.
                // A higher number of salt rounds increases the time it takes to hash a password, making it more secure against brute-force attacks.
                //what is actually happening is that the bcrypt library generates a random salt and combines it with the password before hashing. 
                // and the salt is stored along with the hashed password in the database. when a user tries to log in, bcrypt retrieves the salt from
                //  the database and uses it to hash the provided password, allowing it to compare the hashed values securely.
                //ALSO, the salt is unique for each password, so even if two users have the same password, their hashed values will be different due to the different salts.
                //it randomly shakes the password and adds some random data to it before hashing, making it more secure against attacks that try to guess passwords by comparing hashed values.
                //and the number of salt rounds determines how many times this process is repeated, making it more time-consuming for attackers to crack the hashed passwords.

                const newUser= new User({
                        name:name,
                        username:username,
                        password:hashedPasssword
                })
                await newUser.save();
                // ststus codes are used to indicate the outcome of an HTTP request.
                // 201 Created: This status code indicates that a new resource has been successfully created as a result of the request. 
                // It is typically used in response to POST requests when a new resource is created on the server.
                res.status(httpStatus.CREATED).json({message:"User registerd successfully"});

        }
        catch(error){
                // 500 Internal Server Error: This status code indicates that the server encountered an unexpected condition that prevented
                //  it from fulfilling the request.
                //error is an error object that contains information about the error that occurred during the execution of the code.
                res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error:error.message});

        }
}


const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token: token });

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

export {login, register, getUserHistory, addToHistory};