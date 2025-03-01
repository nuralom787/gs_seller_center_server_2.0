const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;

// Ports
const port = process.env.PORT || 5000;
const app = express();


// Middleware.
app.use(cors({
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json({ limit: '50mb' }));


// MongoDB Server Code.
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zqb2d.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



// Server Code.
async function run() {
    try {
        await client.connect();
        const database = client.db('GS_Shop');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const categoriesCollection = database.collection('categories');
        const couponsCollection = database.collection('coupons');
        const staffsCollection = database.collection('staffs');



        /*---------------------------------
                // Products API
        ---------------------------------*/



        // Get All Products API.
        app.get('/products', async (req, res) => {
            // const page = req.query.page;
            // const category = req.query.category;
            // const size = parseInt(req.query.size);
            // let products;
            // if (page && category) {
            //     const filter = { parent: category };
            //     products = await productsCollection.find(filter).skip(page * size).limit(size).toArray();
            // } else if (page) {
            //     products = await productsCollection.find({}).skip(page * size).limit(size).toArray();
            // } else {
            // }
            const products = await productsCollection.find({}).toArray();
            const count = await productsCollection.countDocuments();
            res.json({
                count,
                products,
            });
        });


        // Get Specific Product.
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.json(result);
        });


        // Add/Post New Products.
        app.post('/add-product', async (req, res) => {
            const product = req.body;
            const ImageData = product.image;
            const encodedData = ImageData.toString("base64");
            const imageBuffer = Buffer.from(encodedData, "base64");
            const discount = parseInt("0");
            const price = parseInt(product.price);
            const originalPrice = parseInt(product.originalPrice);
            const quantity = parseInt(product.quantity);
            product.image = imageBuffer;
            product.discount = discount;
            product.price = price;
            product.originalPrice = originalPrice;
            product.quantity = quantity;
            product.flashSale = false;
            product.status = "Show";
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            const result = await productsCollection.insertOne(product);
            res.json(result);
        });


        // Update Product.
        app.put('/up-product/:id', async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const ImageData = product.image;
            const encodedData = ImageData.toString("base64");
            const imageBuffer = Buffer.from(encodedData, "base64");
            product.image = imageBuffer;
            const price = parseInt(product.price);
            const originalPrice = parseInt(product.originalPrice);
            const quantity = parseInt(product.quantity);
            product.price = price;
            product.originalPrice = originalPrice;
            product.quantity = quantity;
            product.updatedAt = new Date().toISOString();
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: product };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Update Product Status.
        app.put('/up-product-status/:id', async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            delete product._id;
            if (product.status === "Show") {
                product.status = "Hide";
            } else {
                product.status = "Show";
            }
            product.updatedAt = new Date().toISOString();
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: product };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Delete Product.
        app.delete('/delete-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        });



        /*---------------------------------------------
                // Orders API
        ---------------------------------------------*/



        // Get All Orders.
        app.get('/orders', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let orders;
            if (page) {
                orders = await ordersCollection.find({}).skip(page * size).limit(size).toArray();
            } else {
                orders = await ordersCollection.find({}).toArray();
            }
            const count = await ordersCollection.countDocuments();
            res.json({
                count,
                orders,
            });
        });


        // Get Single Order.
        app.get('/order/user', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const email = req.query.email;
            const query = { email: email };
            let orders;
            let count;
            if (page && email) {
                orders = await ordersCollection.find(query).skip(page * size).limit(size).toArray();
                count = await ordersCollection.countDocuments();
            } else if (email) {
                orders = await ordersCollection.find(query).toArray();
                count = await ordersCollection.countDocuments();
            } else if (page) {
                orders = await ordersCollection.find({}).skip(page * size).limit(size).toArray();
                count = await ordersCollection.countDocuments();
            }
            res.json({
                count,
                orders,
            });
        });


        // Get Order For Invoice.
        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.json(result);
        });


        // Update Order Status.
        app.put('/up-order/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.query.status;
            const order = req.body;
            order.status = status;
            delete order._id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: order };
            const result = await ordersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });



        /*-----------------------------
                // User API
        -----------------------------*/



        // Get All User.
        app.get('/users', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let users;
            if (page) {
                users = await usersCollection.find({}).skip(page * size).limit(size).toArray();
            } else {
                users = await usersCollection.find({}).toArray();
            }
            const count = await usersCollection.countDocuments();
            res.json({
                count,
                users,
            });
        });


        // Get Specific Product.
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.findOne(query);
            res.json(result);
        });


        // Post New Users.
        app.post('/add/users', async (req, res) => {
            const newData = req.body;
            const result = await usersCollection.insertOne(newData);
            res.json(result);
        });


        // Upsert Users.
        app.put('/add/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Delete Users.
        app.delete('/delete-user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.json(result);
        });


        /*--------------------------------------
                // Categories API.
        --------------------------------------*/



        // Get All Categories API.
        app.get('/categories', async (req, res) => {
            const page = req.query.page;
            const category = req.query.category;
            const size = parseInt(req.query.size);
            let categories;
            if (page && category) {
                const filter = { parent: category };
                categories = await categoriesCollection.find(filter).skip(page * size).limit(size).toArray();
            } else if (page) {
                categories = await categoriesCollection.find({}).skip(page * size).limit(size).toArray();
            }
            else {
                categories = await categoriesCollection.find({}).toArray();
            }
            const count = await categoriesCollection.countDocuments();
            res.json({
                count,
                categories,
            });
        });


        // Get Specific Category.
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await categoriesCollection.findOne(query);
            res.json(result);
        });


        // Post New Categories API.
        app.post('/add-category', async (req, res) => {
            const category = req.body;
            const ImageData = category.icon;
            const encodedData = ImageData?.toString("base64");
            const imageBuffer = Buffer.from(encodedData ? encodedData : "", "base64");
            category.icon = imageBuffer;
            const result = await categoriesCollection.insertOne(category);
            res.json(result);
        });


        // Update Category.
        app.put('/up-category/:id', async (req, res) => {
            const id = req.params.id;
            const category = req.body;
            const ImageData = category.icon;
            const encodedData = ImageData.toString("base64");
            const imageBuffer = Buffer.from(encodedData, "base64");
            category.icon = imageBuffer;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: category };
            const result = await categoriesCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Update Category Status.
        app.put('/up-category-status/:id', async (req, res) => {
            const id = req.params.id;
            const category = req.body;
            delete category._id;
            if (category.status === "Show") {
                category.status = "Hide";
            } else {
                category.status = "Show";
            }
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: category };
            const result = await categoriesCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Delete Category.
        app.delete('/delete-cat/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await categoriesCollection.deleteOne(query);
            res.json(result);
        });



        /*--------------------------------
                // Coupon API.
        --------------------------------*/



        // Get All Coupon.
        app.get('/coupons', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let coupons;
            if (page) {
                coupons = await couponsCollection.find({}).skip(page * size).limit(size).toArray();
            } else {
                coupons = await couponsCollection.find({}).toArray();
            }
            const count = await couponsCollection.countDocuments();
            res.json({
                count,
                coupons,
            });
        });


        // Get a Specific Coupon.
        app.get('/coupon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await couponsCollection.findOne(query);
            res.json(result);
        });



        // Post New Coupon.
        app.post('/add-coupons', async (req, res) => {
            const coupon = req.body;
            const ImageData = coupon.logo;
            const discountPercentage = parseInt(coupon.discountPercentage);
            const minimumAmount = parseInt(coupon.minimumAmount);
            const encodedData = ImageData?.toString("base64");
            const imageBuffer = Buffer.from(encodedData ? encodedData : "", "base64");
            coupon.discountPercentage = discountPercentage;
            coupon.minimumAmount = minimumAmount;
            coupon.logo = imageBuffer;
            coupon.createdAt = new Date().toISOString();
            coupon.updatedAt = new Date().toISOString();
            const result = await couponsCollection.insertOne(coupon);
            res.json(result);
        });


        // Update Coupons.
        app.put('/up-coupon/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: data };
            const result = await couponsCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Delete coupons.
        app.delete('/delete-coupon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await couponsCollection.deleteOne(query);
            res.json(result);
        });



        /*-------------------------------
                // Staffs API.
        -------------------------------*/


        // Get All Staffs.
        app.get('/staffs', async (req, res) => {
            const email = req.query.email;
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let staffs;
            if (page) {
                staffs = await staffsCollection.find({}).skip(page * size).limit(size).toArray();
            }
            else if (email) {
                staffs = await staffsCollection.find({ email }).toArray();
            }
            else {
                staffs = await staffsCollection.find({}).toArray();
            }
            const count = await staffsCollection.countDocuments();
            res.json({
                count,
                staffs,
            });
        });



        // Get a Specific Staff.
        app.get('/staff', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await staffsCollection.findOne(query);
            res.json(result);
        });



        // Check Staff Role.
        app.get('/staff/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            let isAdmin = false;
            const staff = await staffsCollection.findOne(query);
            if (staff?.role === "Admin") {
                isAdmin = true;
            };
            res.json({ admin: isAdmin });
        });


        // Post New Staffs.
        app.post('/add-staffs', async (req, res) => {
            const staff = req.body;
            const ImageData = staff.photoURL;
            const encodedData = ImageData?.toString("base64");
            const imageBuffer = Buffer.from(encodedData ? encodedData : "", "base64");
            staff.photoURL = imageBuffer;
            staff.createdAt = new Date().toISOString();
            staff.updatedAt = new Date().toISOString();
            const result = await staffsCollection.insertOne(staff);
            res.json(result);
        });


        // Update Staff Profile Information.
        app.put('/up-staff/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = { $set: data };
            const result = await staffsCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
    }
    finally {
        // await client.close();
    }
};
run().catch(console.dir);


// Default Get.
app.get('/', (req, res) => {
    res.send('Running GS_Seller_Center_Server');
});


// Listening Port.
app.listen(port, () => {
    console.log('server running on port:', port);
});