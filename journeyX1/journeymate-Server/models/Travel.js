const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
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
    rating: Number
});

module.exports = travelSchema;
