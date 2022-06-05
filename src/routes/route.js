const express = require('express');
const router = express.Router();


const {createBooks,GetFilteredBook,getBooksById,updateByBookId,deleteBooksBYId}
= require("../controllers/booksController")
const {createUser,loginUser} = require("../controllers/userController")
const {authentication,authorization} = require("../middleWare/userAuth")
const {createReview,updateReview, deleteReviewByBookIdAndReviewById} =require('../controllers/reviewController');

 // User routes
 router.post('/register', createUser);
 router.post('/login', loginUser);

//book routes
router.post('/books',authentication,createBooks);
router.get('/books', authentication, GetFilteredBook);
router.get('/books/:bookId', authentication, getBooksById);
router.put('/books/:bookId',authentication,authorization, updateByBookId);
router.delete('/books/:bookId', authentication, authorization, deleteBooksBYId);

// Review routes
router.post('/books/:bookId/review',createReview)
router.put('/books/:bookId/review/:reviewId', updateReview);
router.delete('/books/:bookId/review/:reviewId',deleteReviewByBookIdAndReviewById );

module.exports =  router;

