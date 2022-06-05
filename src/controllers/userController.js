const userModel = require('../models/userModel')
const jwt = require("jsonwebtoken");



//========================================VALIDATION FUNCTIONS==========================================================


const isValid = function (value) {

  if (!value || typeof value != "string" || value.trim().length == 0) return false;
  return true;
}

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (objectId) { // change -- add this validation to check object id type
  return mongoose.Types.ObjectId.isValid(objectId)
}

//========================================POST /register==========================================================


const createUser = async function (req, res) {
  try {
    const data = req.body
    
    const { title, name, phone, email, password, address } = req.body

    const phoneValidator = /^(?:(?:\+|0{0,2})91(\s*|[\-])?|[0]?)?([6789]\d{2}([ -]?)\d{3}([ -]?)\d{4})$/

    const emailValidator = /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/

    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Body is required" })
    }

    if (!isValid(title)) {
      return res.status(400).send({ status: false, message: "title is required" })
    }

    if (!(title == 'Mr' || title == 'Mrs' || title == 'Miss')) {
      return res.status(400).send({ status: false, message: "title only can be Mr, Mrs and Miss" })
    }

    if (!isValid(name)) {
      return res.status(400).send({ status: false, message: "Name is required" })
    }

    if (!(phone)) {
      return res.status(400).send({ status: false, message: "Phone No. is required" })
    }

    if (!phoneValidator.test(
      phone
    )) {
      return res.status(400).send({ status: false, message: "plz enter a valid Phone no" });
    }

    const isRegisteredphone = await userModel.findOne({ phone }).lean();

    if (isRegisteredphone) {
      return res.status(400).send({ status: false, message: "phoneNo. number already registered" });
    }

    if (!isValid(email)) {
      return res.status(400).send({ status: false, message: "Email is required" })
    }

    if (!emailValidator.test(email)) {
      return res.status(400).send({ status: false, message: "plz enter a valid Email" });
    }

    const isRegisteredEmail = await userModel.findOne({ email }).lean();
    if (isRegisteredEmail) {
      return res.status(400).send({ status: false, message: "email id already registered" });
    }

    if (!isValid(password)) {
      return res.status(400).send({ status: false, message: "Password is required" })
    }
    if (password.length < 8) {
      return res.status(400).send({ status: false, message: "Your password must be at least 8 characters" })
    }
    if (password.length > 15) {
      return res.status(400).send({ status: false, message: "Password cannot be more than 15 characters" })
    }

    if (address != undefined) {
      if (address.street != undefined) {
        if (typeof address.street != 'string' || address.street.trim().length == 0) {
          return res.status(400).send({ status: false, message: "street can not be a empty string" })
        }
      }

      if (address.city != undefined) {
        if (typeof address.city != 'string' || address.city.trim().length == 0) {
          return res.status(400).send({ status: false, message: "city can not be a empty string" })
        }
      }
      
      if (address.pincode != undefined) {
        if (address.pincode.toString().trim().length == 0 || address.pincode.toString().trim().length != 6) {
          return res.status(400).send({ status: false, message: "Pincode can not be a empty string or must be 6 digit number " })
        }
      }
    }

    const userCreated = await userModel.create(data)

    res.status(201).send({ status: true,message:"Success" ,data: userCreated })

  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}




//========================================POST /login==========================================================

let loginUser = async (req, res) => {

  try {

    const body = req.body
    const { email, password } = req.body

    if (!isValidRequestBody(body)) {
      return res.status(400).send({ status: false, message: "Body is required" })
    }

    if (!isValid(email)) {
      return res.status(400).send({ status: false, message: "Email requrid" })

    }

    if (!(/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/).test(email)) {
      return res.status(400).send({ status: false, message: "Please mention valid Email" })

    }
    if (!isValid(password)) {
      return res.status(400).send({ status: false, message: "Password requrid" })

    }

    const UserLogin = await userModel.findOne({ email, password }).lean()

    if (!UserLogin) {
      return res.status(404).send({ status: false, message: "Email and password is not correct" })
    }

    const token = jwt.sign({
      userId: UserLogin._id.toString(),
      orgnaisation: "function_Up_friend",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60)
    },
      "group_31_functionUp"
    );

    res.setHeader("x-api-key", token);

    res.status(200).send({ status: true, message: 'Success', data: { token } });

  } catch (error) {
    res.status(500).send({ status: false, message: error.message })
  }
}
//-------------------------- User login part end ------------------------------------//


module.exports = {
  createUser,
  loginUser
}


