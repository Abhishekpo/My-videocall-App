import {Router } from 'express';
import { addToHistory, getUserHistory, login, register } from "../controllers/user.controller.js";

const router=Router();

/**
 * route() is useful when:
 router.route("/user")
  .get(getUser)
  .post(createUser)
  .put(updateUser);

  same path, multiple methods
 */
router.route("/login").post(login); // same as router.post("/login", login);
router.route("/register").post(register); // 
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);


export default router;

