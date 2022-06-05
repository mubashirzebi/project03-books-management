const userModel = require('../models/userModel')
const booksModel = require('../models/booksModel')
const reviewModel = require("../models/reviewModel")
const moment = require('moment')
const mongoose = require("mongoose")

//========================================VALIDATION FUNCTIONS===========================================//

const isValid = function (value) {
  if (!value || typeof value != "string" || value.trim().length == 0) return false;
  return true;
}

const isValidRequestBody = function (object) {
  return (Object.keys(object).length > 0)
}


const isValidObjectId = function (objectId) { 
  return mongoose.Types.ObjectId.isValid(objectId)
}


//========================================POST /books/:bookId/review============================================//

const createReview = async function (req, res) {

  try {
    const bookId = req.params.bookId
    const data = req.body
    const { reviewedBy, rating, review } = req.body

    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Request body can not be empty" })
    }

    if (!bookId) {
      return res.status(400).send({ status: false, message: "Book-Id is required" });
    }

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: "Invalid Book-Id" });
    }

    const booksDetails = await booksModel.findOne({ _id: bookId, isDeleted: false })

    if (!booksDetails) {
      return res.status(404).send({ status: false, message: "Book-Id is not found in DB" });
    }

    if (!isValid(reviewedBy)) {
      data.reviewedBy = "Guest"
    }

    if (!rating || typeof rating != "number" || rating < 1 || rating > 5) {
      return res.status(400).send({ status: false, message: "rating is required from 1 to 5" });
    }

    data.reviewedAt = moment().format("DD-MM-YYYY")

    if (review != undefined) {
      if (typeof review != 'string' || review.trim().length == 0) {
        return res.status(400).send({ status: false, data: "Review can not be a empty string" })
      }
    }

    data.bookId = bookId

    const reviewCreated = await reviewModel.create(data)

    const bookReviewCount = await reviewModel.find({ bookId: bookId, isDeleted: false }).count()

    const updateBookReview = await booksModel.findByIdAndUpdate({ _id: bookId }, { reviews: bookReviewCount }, { new: true }).lean()
    updateBookReview.NewReview = reviewCreated

    return res.status(201).send({ status: true, message: "Success", data: updateBookReview })
  }
  catch (error) {
    return res.status(500).send({ status: false, error: error.message })
  }

}

//========================================PUT /books/:bookId/review/:reviewId==========================================//


const updateReview = async function (req, res) {
  try {
    let bookId = req.params.bookId
    let reviewId = req.params.reviewId
    let requestBody = req.body
    const { review, reviewedBy, rating } = req.body

    if (!isValidRequestBody(requestBody)) {
      res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide review details' })
      return
    }

    if (!isValidObjectId(bookId)) {
      res.status(400).send({ status: false, message: `${bookId} is not a valid book id` })
      return
    }

    if (!isValidObjectId(reviewId)) {
      res.status(400).send({ status: false, message: `${reviewId} is not a valid review id` })
      return
    }

    let checkreviewId = await reviewModel.findOne({ _id: reviewId, bookId: bookId, isDeleted: false })

    if (!checkreviewId) {
      return res.status(404).send({ status: false, message: 'review with this bookid does not exist' })
    }

    let checkBookId = await booksModel.findOne({ _id: bookId, isDeleted: false })

    if (!checkBookId) {
      return res.status(404).send({ status: false, message: 'book does not exist in book model' })
    }

    let updateData = {}

    if (isValid(review)) {
      updateData.review = review
    }

    if (isValid(reviewedBy)) {
      updateData.reviewedBy = reviewedBy
    }

    if (rating) {
      
      if (rating && typeof rating === 'number' && rating >= 1 && rating <= 5) {
        updateData.rating = rating
      }

      if (!(rating && rating >= 1 && rating <= 5)) {
        return res.status(400).send({ status: false, message: "rating should be in range 1 to 5 " })
      }
    }

    if (!isValid(reviewedBy)) {
      requestBody.reviewedBy = "Guest"
    }


    if (review != undefined) {
      if (typeof review != 'string' || review.trim().length == 0) {
        return res.status(400).send({ status: false, data: "Review can not be a empty string" })
      }
    }

    const update = await reviewModel.findOneAndUpdate({ _id: reviewId }, updateData, { new: true })

    const bookDetails = await booksModel.findOne({ _id: bookId }).lean()

    bookDetails.updatedReview = update

    res.status(200).send({ status: true, message: 'review updated sucessfully', data: bookDetails })

  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
}

//========================================DELETE /books/:bookId/review/:reviewId======================================//

const deleteReviewByBookIdAndReviewById = async function (req, res) {

  try {
    const queryParams = req.query
    const requestBody = req.body
    const bookId = req.params.bookId
    const reviewId = req.params.reviewId

    if (isValidRequestBody(queryParams)) {
      return res.status(400).send({ status: false, message: "invalid request" })
    }

    if (isValidRequestBody(requestBody)) {
      return res.status(400).send({ status: false, message: "data is not required in request body" })
    }

    if (!bookId) {
      return res.status(400).send({ status: false, message: "bookId is required in path params" })
    }

    if (!isValidObjectId(bookId)) {
      return res.status(400).send({ status: false, message: `enter a valid bookId` })
    }

    if (!reviewId) {
      return res.status(400).send({ status: false, message: "reviewId is required in path params" })
    }

    if (!isValidObjectId(reviewId)) {
      return res.status(400).send({ status: false, message: `enter a valid reviewId` })
    }


    const bookByBookId = await booksModel.findOne({ _id: bookId, isDeleted: false })

    if (!bookByBookId) {
      return res.status(404).send({ status: false, message: `No book found by ${bookId} ` })
    }

    const reviewByReviewId = await reviewModel.findOne({ _id: reviewId, bookId, isDeleted: false })

    if (!reviewByReviewId) {
      return res.status(404).send({ status: false, message: `no review found by ${reviewId} & ${bookId}` })
    }

    const deleteReview = await reviewModel.findByIdAndUpdate(reviewId, { $set: { isDeleted: true } }, { new: true })

    const bookReviewCount = await reviewModel.find({ bookId: bookId, isDeleted: false }).count()

    const updateBookReview = await booksModel.findByIdAndUpdate({ _id: bookId }, { reviews: bookReviewCount }, { new: true }).lean()

    res.status(200).send({ status: true, message: "review has been successfully deleted" })

  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }

}


module.exports = { createReview, updateReview, deleteReviewByBookIdAndReviewById }
