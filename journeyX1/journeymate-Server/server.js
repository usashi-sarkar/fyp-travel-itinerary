require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./middleware/authenticateToken');
const Booking = require('./models/Booking');
// const Travel = require('./models/Travel');
const Category = require('./models/Category');
const Cart = require('./models/Cart');
const cors = require('cors');

const PORT = process.env.PORT;

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const ObjectId = mongoose.Types.ObjectId;


// Signup endpoint
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name) return res.status(500).json({ message: 'Please enter name' });
    if (!email) return res.status(500).json({ message: 'Please enter email' });
    if (!password) return res.status(500).json({ message: 'Please enter password' });


    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email) return res.status(500).json({ message: 'Please enter email' });
    if (!password) return res.status(500).json({ message: 'Please enter password' });

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create a token
        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({ name: user.name, email: user.email, message: 'Login successful', token });
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Server error', error });
    }
});

app.put('/update-user', async (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json({ message: 'Email, name, and password are required' });
    }

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Find user by email and update
        const updatedUser = await User.findOneAndUpdate(
            { email: email }, // Filter condition
            { name: name, password: hashedPassword }, // Update fields
            { new: true, runValidators: true } // Options
        );

        const token = jwt.sign(
            { id: updatedUser._id, email: updatedUser.email, name: updatedUser.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        if (updatedUser) {
            res.status(200).json({ name: updatedUser.name, email: updatedUser.email, message: 'User updated successfully', token });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});

app.post('/book-now', authenticateToken, async (req, res) => {
    const { booking, startDate, endDate, adults, children } = req.body;
    const userId = req.userId;

    try {
        if (!booking || !startDate || !endDate || !adults) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const bookingObj = new Booking({
            userId,
            booking,
            startDate,
            endDate,
            adults,
            children,
        });

        await bookingObj.save();
        res.status(201).json({ message: 'Booking confirmed!!!', bookingObj });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.get('/get-bookings', authenticateToken, async (req, res) => {
    const userId = req.userId; // Extracted from the token by authenticateToken middleware

    try {
        // Fetch bookings associated with the authenticated user
        const bookings = await Booking.find({ userId });

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'No bookings found for this user.' });
        }

        res.status(200).json({ message: 'Bookings retrieved successfully!', bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});


app.post('/add-travel', async (req, res) => {
    try {
        const { category, offers } = req.body;

        // Check if category already exists
        let categoryData = await Category.findOne({ category });

        if (!categoryData) {
            categoryData = new Category({
                category,
                offers
            });
        } else {
            categoryData.offers = categoryData.offers.concat(offers);
        }

        await categoryData.save();
        res.status(200).json({ message: 'Offers added successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding offers', error });
    }
});

app.post('/addtravel_categories', async (req, res) => {
    try {
        const { category, offers } = req.body;

        // Check if the category is valid
        if (!['Top Offers', 'Most Popular', 'All Time Favourites'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category. Must be one of Top Offers, Most Popular, or All Time Favourites.' });
        }

        // Find or create the category
        let categoryDoc = await Category.findOne({ category });
        if (!categoryDoc) {
            categoryDoc = new Category({ category, offers: [] });
        }

        // If a file was uploaded, add the URL to the category
        if (req.file) {
            // Cloudinary response contains the URL of the uploaded image
            categoryDoc.imageUrl = req.file.path; // Store the image URL in the category document
            console.log(categoryDoc.imageUrl);
        }

        // Process the offers
        for (let offer of offers) {
            // Generate an ID if it's missing
            if (!offer._id) {
                offer._id = new ObjectId();
            }

            // Check if the offer already exists in the category
            const existingOfferIndex = categoryDoc.offers.findIndex(o => o._id.toString() === offer._id.toString());
            if (existingOfferIndex !== -1) {
                // Update the existing offer
                categoryDoc.offers[existingOfferIndex] = offer;
            } else {
                // Insert a new offer
                categoryDoc.offers.push(offer);
            }
        }

        // Save the updated or new category document
        const updatedCategory = await categoryDoc.save();

        res.status(200).json({
            message: 'Category and offers updated successfully!',
            data: updatedCategory,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// app.post('/add-to-category', async (req, res) => {
//     const { categoryName, travelIds } = req.body; // `travelIds` should be an array of travel ObjectIds

//     try {
//         // Check if the category already exists
//         let category = await Category.findOne({ categoryName });

//         if (!category) {
//             // Create a new category if it doesn't exist
//             category = new Category({
//                 categoryName,
//                 travelIds,
//             });
//         } else {
//             // Add new travel IDs to the existing category
//             category.travelIds.push(...travelIds);
//         }

//         await category.save();
//         res.status(201).json({ message: 'Travel IDs added to category', category });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error });
//     }
// });

app.post('/saveCart', async (req, res) => {
    try {
        const offers = req.body.favorities; // Expecting an array of offers
        console.log("offers");
        console.log(offers);

        await Cart.deleteMany({});
        const savedOffers = await Cart.insertMany(offers);
        res.status(201).json({ message: 'Offers saved successfully', data: savedOffers });
    } catch (error) {
        console.error('Error saving offers:', error);
        res.status(500).json({ message: 'An error occurred while saving offers' });
    }
});

app.get('/getCart', async (req, res) => {
    try {
        const offers = await Cart.find();
        res.status(200).json(offers);
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({ message: 'An error occurred while fetching offers' });
    }
});

app.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const categoryData = await Category.findOne({ category });

        if (!categoryData) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json(categoryData.offers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching offers', error });
    }
});
app.post('/allcategory', async (req, res) => {
    try {
        const categories = req.body.categories;

        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({ message: 'Invalid request. Categories should be an array.' });
        }

        // Fetch matching categories and use .lean() to return plain objects
        const categoryData = await Category.find({ category: { $in: categories } }).lean();

        if (!categoryData || categoryData.length === 0) {
            return res.status(404).json({ message: 'No matching categories found' });
        }

        // Fetch all cart offers and convert their IDs to strings
        const cartOffers = await Cart.find().lean();
        const cartOfferIds = new Set(cartOffers.map(offer => offer._id.toString()));

        // Map offers in categories and set `isLiked` field
        const updatedCategoryData = categoryData.map(category => ({
            ...category,
            offers: category.offers.map(offer => ({
                ...offer,
                isLiked: cartOfferIds.has(offer._id.toString()), // Set isLiked = true if offer exists in cart
            }))
        }));

        res.status(200).json({ offers: updatedCategoryData });
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({ message: 'Error fetching offers', error });
    }
});


app.delete('/delete_offers/:offerId', async (req, res) => {
    try {
        const { offerId } = req.params;

        // Convert offerId to ObjectId (no need to convert if already an ObjectId)
        const objectId = new mongoose.Types.ObjectId(offerId);

        // Find and remove the offer by ObjectId from any category
        const result = await Category.findOneAndUpdate(
            { "offers._id": objectId },
            { $pull: { offers: { _id: objectId } } },
            { new: true }  // Return the updated document
        );

        console.log(result);

        // if (result==null) {
        //     return res.status(404).json({ error: 'Offer not found in any category.' });
        // }

        res.status(200).json({
            message: 'Offer deleted successfully!',
            updatedCategory: result
        });
    } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ error: 'Invalid offer ID format.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get("/", (req, res) => {
    res.send(`Tuhin Ultra Server is running...}`)
})

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).timeout = 300000;
