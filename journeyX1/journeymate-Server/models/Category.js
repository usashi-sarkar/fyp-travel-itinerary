const mongoose = require('mongoose');
const { Schema } = mongoose;
const Travel = require('./Travel');

const categorySchema = new Schema({
    category: {
        type: String,
        required: true,
        enum: ['Top Offers', 'Most Popular', 'All Time Favourites'], // Predefined categories
    },
    offers: [Travel]    
});

module.exports = mongoose.model('Category', categorySchema);
