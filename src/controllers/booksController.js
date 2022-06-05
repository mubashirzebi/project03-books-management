const mongoose = require('mongoose')
const moment = require('moment')
const userModel = require('../models/userModel')
const reviewModel = require('../models/reviewModel')
const booksModel = require('../models/booksModel')
const aws = require('aws-sdk')
const { uploadFile } = require('../controllers/awsUpload')


//========================================VALIDATION FUNCTIONS==========================================================

const isValid = function (value) {
  if (!value || typeof value != "string" || value.trim().length == 0) return false;
  return true;
}

const isValidRequestBody = function (requestBody) {
  return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (objectId) {
  return mongoose.Types.ObjectId.isValid(objectId)
}


//========================================POST/books==========================================================//

const createBooks = async function (req, res) {
  try {

    const data = req.body;
    const decodedToken = req.decodedToken

    const { title, excerpt, ISBN, releasedAt, userId, category, subcategory } = req.body

    let files = req.files

    const ISBN_ValidatorRegEx = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;

    const releasedAt_ValidatorRegEx = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]|(?:Jan|Mar|May|Jul|Aug|Oct|Dec)))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2]|(?:Jan|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)(?:0?2|(?:Feb))\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9]|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep))|(?:1[0-2]|(?:Oct|Nov|Dec)))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;

    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Body is required" })
    }

    if ((data.isDeleted && data.isDeleted != "false")) {
      return res.status(400).send({ status: false, message: "isDeleted must be false" })
    }

    if (!userId) {
      return res.status(400).send({ status: false, message: 'user Id is must be present !!!!!!!' });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: "userId  is not valid !!!!!!" });
    }

    if (decodedToken.userId != userId) {
      return res.status(403).send({ status: false, message: 'unauthorized access' });
    }

    if (!isValid(excerpt)) {
      return res.status(400).send({ status: false, message: "excerpt is required" })
    }

    if (!isValid(ISBN)) {
      return res.status(400).send({ status: false, message: "ISBN is required..." })
    }

    if (!isValid(category)) {
      return res.status(400).send({ status: false, message: "Category is required..." })
    }

    if (!subcategory) {
      return res.status(400).send({ status: false, message: "subcategory is required..." })
    }

    if (!releasedAt) {
      return res.status(400).send({ status: false, message: "Please provide released-date" });
    }

    if (files && files.length == 0) {
      return res.status(400).send({ msg: "No file found" })
    }

    let isRegisteredTitle = await booksModel.findOne({ title }).lean();

    if (isRegisteredTitle) {
      return res.status(400).send({ status: false, message: "Title already registered" });
    }

    let validationUserId = await userModel.findById(userId).lean();

    if (!validationUserId) {
      return res.status(400).send({ status: false, message: "User is not registered ... ", });
    }

    let isRegisteredISBN = await booksModel.findOne({ ISBN }).lean();

    if (isRegisteredISBN) {
      return res.status(400).send({ status: false, message: "ISBN already registered" });
    }

    if (!ISBN_ValidatorRegEx.test(ISBN)) {
      return res.status(400).send({ status: false, message: "plz enter a valid 13 digit ISBN No." });
    }

    const subcategory1 = subcategory.split(",")
    let validSubcategory = true;

    const checkTypeofSubcategory = subcategory1.map(x => {
      if (typeof x != "string" || x.trim().length == 0) {
        validSubcategory = false
      }
    })

    if (validSubcategory == false) {
      return res.status(400).send({ status: false, message: "Subcategory is not valid..." })
    }
    data.subcategory = subcategory1

    if (!releasedAt_ValidatorRegEx.test(releasedAt)) {
      return res.status(400).send({ status: false, message: "plz enter a valid Date format" });
    }

    let uploadedFileURL = await uploadFile(files[0])
    data.bookCover = uploadedFileURL

    let bookCreated = await booksModel.create(data)

    res.status(201).send({ status: true, message: "Success", data: bookCreated });

  }
  catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

//========================================Get/books==========================================================//


const GetFilteredBook = async function (req, res) {
  try {
    let queryData = req.query

    if (queryData.isDeleted && queryData.isDeleted != "false") {
      return res.status(400).send({ status: false, data: "isDeleted must be false" })
    }

    let obj = {}

    if (queryData.userId != undefined) {
      obj.userId = queryData.userId
    }
    if (queryData.category != undefined) {
      obj.category = queryData.category
    }
    if (queryData.subcategory != undefined) {
      obj.subcategory = { $all: [].concat(queryData.subcategory) }
    }

    obj.isDeleted = false;

    const bookData = await booksModel.find(obj).sort({ title: 1 }).select({ __v: 0, ISBN: 0, subcategory: 0, isDeleted: 0, createdAt: 0, updatedAt: 0, deletedAt: 0, }).lean()

    if (bookData.length == 0) {
      return res.status(404).send({ status: false, message: "No Books found" })
    }

    return res.status(200).send({ status: true, message: 'Success', data: bookData })

  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

//========================================GET /books/:bookIds========================================================//


const getBooksById = async function (req, res) {
  try {
    const bookId = req.params.bookId

    if (!bookId) {
      return res.status(400).send({ status: false, message: "Book-Id is required" })
    }

    if ((!isValidObjectId(bookId))) {
      return res.status(400).send({ status: false, message: "Invalid Book-Id" });
    }

    const isbookIdInDB = await booksModel.findOne({ _id: bookId, isDeleted: false }).select({ __v: 0, ISBN: 0 }).lean()

    if (!isbookIdInDB) {
      return res.status(404).send({ status: false, message: "Book-Id is not present in DB" });
    }

    const reviewByBookId = await reviewModel.find({ bookId: bookId, isDeleted: false }).select({ createdAt: 0, updatedAt: 0, isDeleted: 0, __v: 0 })

    isbookIdInDB["reviewsData"] = reviewByBookId

    return res.status(200).send({ status: true, message: "Success", message: 'Books list', data: isbookIdInDB })


  }
  catch (error) {
    return res.status(500).send({ status: false, error: error.message })
  }
}



//========================================PUT /books/:bookId========================================================//


const updateByBookId = async function (req, res) {

  try {
    const bookId = req.params.bookId

    const data = req.body

    const { title, excerpt, ISBN, releasedAt } = req.body

    const ISBN_ValidatorRegEx = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;

    const releasedAt_ValidatorRegEx = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]|(?:Jan|Mar|May|Jul|Aug|Oct|Dec)))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2]|(?:Jan|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)(?:0?2|(?:Feb))\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9]|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep))|(?:1[0-2]|(?:Oct|Nov|Dec)))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;

    //const releasedAt_ValidatorRegEx = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/

    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Body is required" })
    }

    if (!(title || excerpt || ISBN || releasedAt)) {
      return res.status(400).send({ status: false, message: "Invalid Filters" })
    }

    if (!bookId) {
      return res.status(400).send({ status: false, message: "Book-Id is required" })
    }

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid Book-Id" });
    }
    const isbookIdInDB = await booksModel.findOne({ _id: bookId, isDeleted: false }).lean()

    if (!isbookIdInDB) {
      return res.status(404).send({ status: false, message: "Book-Id is not present in DB" });
    }

    let isRegisteredtitle = await booksModel.findOne({ title: title }).lean();

    if (isRegisteredtitle) {
      return res.status(400).send({ status: false, message: "Title already registered" });
    }

    let isRegisteredISBN = await booksModel.findOne({ ISBN: ISBN }).lean();

    if (isRegisteredISBN) {
      return res.status(400).send({ status: false, message: "ISBN already registered" });
    }

    if (ISBN && !ISBN_ValidatorRegEx.test(ISBN)) {
      return res.status(400).send({ status: false, message: "plz enter a valid 13 digit ISBN No." });
    }

    if (data.releasedAt && !releasedAt_ValidatorRegEx.test(releasedAt)) {
      return res.status(400).send({ status: false, message: "plz enter a valid Date format" });
    }

    const updateById = await booksModel.findOneAndUpdate({ _id: bookId, isDeleted: false }, {
      $set: {
        title: title, excerpt: excerpt, releasedAt: releasedAt, ISBN: ISBN
      }
    }, { new: true });

    if (!updateById) {
      return res.status(404).send({ status: false, message: "No Data Match" });
    }

    return res.status(200).send({ status: true, message: "Success", data: updateById })

  }
  catch (error) {
    return res.status(500).send({ status: false, error: error.message })
  }
}



//========================================DELETE /books/:bookId======================================================//


const deleteBooksBYId = async function (req, res) {

  try {
    let bookId = req.params.bookId
    const queryParams = req.query
    const requestBody = req.body

    if (isValidRequestBody(queryParams)) {
      return res.status(400).send({ status: false, message: "Data is not required in quary params" })
    }

    if (isValidRequestBody(requestBody)) {
      return res.status(400).send({ status: false, message: "Data is not required in request body" })
    }

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid Book-Id" });
    }

    let checkBook = await booksModel.findOne({ _id: bookId, isDeleted: false }).lean()

    if (!checkBook) {
      return res.status(404).send({ status: false, message: 'book not found or already deleted' })
    }

    let updateBook = await booksModel.findOneAndUpdate({ _id: bookId }, { isDeleted: true, deletedAt: moment().format("DD-MM-YYYY, hh:mm a") }, { new: true })

    res.status(200).send({ status: true, message: 'sucessfully deleted', data: updateBook })

  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
}

module.exports = {
  createBooks,
  GetFilteredBook,
  getBooksById,
  updateByBookId,
  deleteBooksBYId

}

