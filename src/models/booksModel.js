const mongoose = require('mongoose');
let ObjectId = mongoose.Schema.Types.ObjectId
const booksSchema = new mongoose.Schema({

title: {
    type:String,
    required: true,
    unique: true,
    trim:true
},
excerpt:{
    type: String,
    required: true,
    trim:true
}, 
userId:{
    type: ObjectId,
    required:true,
    ref:"User"
},
bookCover:String,
ISBN:{
    type:String,
    required: true,
    unique: true,
    trim:true
},
category: {
    type: String,
    required: true,
    trim:true
},
subcategory: [{
    type: String,
    required: true,
    trim:true
}],
reviews:{
    type: Number,
    default: 0,
    comment:{
        type: String
    }
},
deletedAt :{
    type:String,
},
isDeleted: {
    type:Boolean, 
    default: false
}, 
releasedAt:{
    type: String,
    required: true,
    trim:true
},


},{timestamps:true})
module.exports = mongoose.model("Books", booksSchema)