const mongoose = require('mongoose');
const { Schema } = mongoose;

const Cart = new mongoose.Schema({
    imgSrc: String,
    title: String,
    price: String,
    totalDays: Number,
    totalNights: Number,
    travelVia: String,
    activities: String,
    meals: String,
    description: String,
    location: String,
    rating: Number,
    _id: String
});

module.exports = mongoose.model('Cart', Cart);
