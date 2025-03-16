const express = require('express');
const cors = require('cors');
require("dotenv").config();
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require('mongodb');

// Ports
const port = process.env.PORT || 5000;
const app = express();


// Middleware.
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://gs-dashboard-4864d.web.app', 'https://gs-dashboard-4864d.firebaseapp.com'],
    credentials: true
}));


// MongoDB Server Code.
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zqb2d.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? 'none' : 'strict',
    secure: process.env.NODE_ENV === "production",
}


// Server Code.
async function run() {
    try {
        await client.connect();
        const database = client.db('GS_Shop');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        const customersCollection = database.collection('customers');
        const categoriesCollection = database.collection('categories');
        const couponsCollection = database.collection('coupons');
        const staffsCollection = database.collection('staffs');




        // ----------------------------------------
        //            Token Related API
        // ----------------------------------------



        // Create JWT Token.
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            if (!user.email) {
                return res.status(400).json({ error: "Email is required" })
            };
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, cookieOptions).send({ success: true });
        });


        // Clear Cookie After Logout.
        app.post("/logout", async (req, res) => {
            res.clearCookie("token", cookieOptions).send({ success: true })
        });


        // Check Token Middleware.
        const VerifyToken = (req, res, next) => {
            // console.log(req.headers.authorization);
            if (!req.cookies.token) {
                return res.status(401).send({ message: 'unauthorize access' });
            }
            const token = req.cookies.token;
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' });
                }
                req.decoded = decoded;
                next();
            })
        };


        // Check User Admin Middleware.
        const VerifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };



        /*---------------------------------
                // Products API
        ---------------------------------*/



        // Get All Products API.
        app.get('/products', async (req, res) => {
            const size = parseInt(req.query.size);
            const page = parseInt(req.query.page);
            const title = req.query.title;
            const category = req.query.category;
            const price = req.query.price;

            let count;
            let products;
            if (page || size) {
                const filter = {
                    ...(title && { title: { $regex: title, $options: 'i' } }),
                    ...(category && { parent: { $regex: category, $options: 'i' } })
                }

                if (price === 'asc' || price === 'desc') {
                    const sortValue = price === "asc" ? 1 : -1;
                    products = await productsCollection.find(filter).skip(page * size).limit(size).sort({ price: sortValue }).toArray();
                    const productLimit = await productsCollection.find(filter).toArray();
                    count = productLimit.length;
                }
                else {
                    products = await productsCollection.find(filter).skip(page * size).limit(size).toArray();
                    const productLimit = await productsCollection.find(filter).toArray();
                    count = productLimit.length;
                }
            }
            else {
                products = await productsCollection.find().toArray();
                count = await productsCollection.estimatedDocumentCount();
            }

            const totalCount = await productsCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                products,
            });
        });


        // Get Specific Product.
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });


        // Add/Post New Products.
        app.post('/add-new/product', async (req, res) => {
            const product = req.body;

            const price = parseInt(product.price);
            const originalPrice = parseInt(product.originalPrice);
            const quantity = parseInt(product.quantity);
            product.price = price;
            product.originalPrice = originalPrice;
            product.quantity = quantity;
            product.discount = (originalPrice - price) / originalPrice * 100;

            product.status = "Show";
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });


        // Update Product.
        app.patch('/update/product/:id', async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const price = parseInt(product.price);
            const originalPrice = parseInt(product.originalPrice);
            const quantity = parseInt(product.quantity);
            product.price = price;
            product.originalPrice = originalPrice;
            product.quantity = quantity;
            product.discount = (originalPrice - price) / originalPrice * 100;
            product.updatedAt = new Date().toISOString();
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    price: product.price,
                    discount: product.discount,
                    tag: product.tag,
                    flashSale: product.flashSale,
                    children: product.children,
                    description: product.description,
                    image: product.image,
                    thumb: product.thumb,
                    originalPrice: product.originalPrice,
                    parent: product.parent,
                    quantity: product.quantity,
                    slug: product.slug,
                    title: product.title,
                    type: product.type,
                    unit: product.unit,
                    updatedAt: product.updatedAt,
                    sku: product.sku
                }
            };
            const result = await productsCollection.updateOne(filter, updateDoc);
            res.json(result);
        });


        // Update Product Status.
        app.patch('/update/product-status/:id', async (req, res) => {
            const id = req.params.id;
            const currentStatus = req.body;
            if (currentStatus.status === "Show") {
                currentStatus.status = "Hide";
            } else {
                currentStatus.status = "Show";
            }
            const updatedAt = new Date().toISOString();

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: currentStatus.status,
                    updatedAt: updatedAt
                }
            };

            const result = await productsCollection.updateOne(filter, updateDoc);
            res.json(result);
        });


        // Delete Product.
        app.delete('/product/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });





        /*---------------------------------------------------------
        //                      Categories API.
        ---------------------------------------------------------*/





        // Get All Categories API.
        app.get('/categories', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const search = req.query.search;


            let categories;
            let count;

            if (page) {
                const filter = {
                    ...(search && { parent: { $regex: search, $options: 'i' } })
                };
                categories = await categoriesCollection.find(filter).skip(page * size).limit(size).toArray();
                const categoriesLimit = await categoriesCollection.find(filter).toArray();
                count = categoriesLimit.length;
            }
            else {
                const filter = {
                    ...(search && { parent: { $regex: search, $options: 'i' } })
                };
                categories = await categoriesCollection.find(filter).toArray();
                count = categories.length;
            }

            const totalCount = await categoriesCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                categories,
            });
        });


        // Get Specific Category.
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await categoriesCollection.findOne(query);
            res.send(result);
        });


        // Post New Categories API.
        app.post('/add-new/category', async (req, res) => {
            const category = req.body;
            // console.log(category);
            const result = await categoriesCollection.insertOne(category);
            res.send(result);
        });


        // Update Category.
        app.patch('/update/category/:id', async (req, res) => {
            const id = req.params.id;
            const category = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    children: category.children,
                    status: category.status,
                    parent: category.parent,
                    type: category.type,
                    icon: category.icon,
                    thumb: category.thumb ? category.thumb : null
                }
            };

            const result = await categoriesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Update Category Status.
        app.patch('/update/category-status/:id', async (req, res) => {
            const id = req.params.id;
            const currentStatus = req.body;
            if (currentStatus.status === "Show") {
                currentStatus.status = "Hide";
            } else {
                currentStatus.status = "Show";
            }

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: currentStatus.status
                }
            };

            const result = await categoriesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Delete Category.
        app.delete('/category/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await categoriesCollection.deleteOne(query);
            res.send(result);
        });





        /*---------------------------------------------------------
        //                  Customers/User API
        ---------------------------------------------------------*/



        // Get All Customers.
        app.get('/customers', VerifyToken, async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const search = req.query.search;

            let customers;
            let count;
            if (page) {
                const filter = {
                    $or: [
                        { displayName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { phoneNumber: { $regex: search, $options: 'i' } }
                    ]
                };
                customers = await customersCollection.find(filter).skip(page * size).limit(size).toArray();
                const customersLimit = await customersCollection.find(filter).toArray();
                count = customersLimit.length;
            }
            else {
                const filter = {
                    $or: [
                        { displayName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { phoneNumber: { $regex: search, $options: 'i' } }
                    ]
                };
                customers = await customersCollection.find(filter).toArray();
                count = customers.length;
            }

            const totalCount = await customersCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                customers,
            });
        });


        // Get Specific Product.
        app.get('/customers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await customersCollection.findOne(query);
            res.send(result);
        });


        // Post New Users.
        app.post('/add/customers', async (req, res) => {
            const newData = req.body;
            const result = await customersCollection.insertOne(newData);
            res.json(result);
        });


        // Upsert Users.
        app.put('/add/customers', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await customersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // Delete customers.
        app.delete('/customer/delete/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await customersCollection.deleteOne(query);
            res.send(result);
        });





        /*---------------------------------------------------------
        //                      Orders API
        ---------------------------------------------------------*/



        // Get All Orders.
        app.get('/orders', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const email = req.query.email;
            const search = req.query.search;
            const status = req.query.status;
            const date = parseInt(req.query.date);

            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() - date);

            let orders;
            let count;

            if (page) {
                const filter = {
                    ...(search && { displayName: { $regex: search, $options: 'i' } }),
                    ...(status && { status: { $regex: status, $options: 'i' } }),
                    ...(date && { orderTime: { $gte: currentDate } }),
                    ...(email && { email: { $regex: email, $options: 'i' } })
                }
                orders = await ordersCollection.find(filter).sort({ orderTime: -1 }).skip(page * size).limit(size).toArray();
                const ordersLimit = await ordersCollection.find(filter).toArray();
                count = ordersLimit.length;
            } else {
                orders = await ordersCollection.find({}).sort({ orderTime: -1 }).toArray();
                count = await ordersCollection.estimatedDocumentCount();
            }

            const totalCount = await ordersCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                orders,
            });
        });


        // Get Single Order.
        app.get('/order/user', async (req, res) => {
            // const page = req.query.page;
            // const size = parseInt(req.query.size);
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
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });


        // Update Order Status.
        app.patch('/update/order-status/:id', async (req, res) => {
            const id = req.params.id;
            const currentStatus = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: currentStatus.status
                }
            };

            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });




        /*--------------------------------------------------------------
        //                      Coupons API.
        --------------------------------------------------------------*/



        // Get All Coupon.
        app.get('/coupons', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const search = req.query.search;
            let coupons;

            if (page) {
                const filter = {
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { couponCode: { $regex: search, $options: 'i' } }
                    ]
                };
                coupons = await couponsCollection.find(filter).skip(page * size).limit(size).toArray();
                const couponsLimit = await couponsCollection.find(filter).toArray();
                count = couponsLimit.length;
            } else {
                coupons = await couponsCollection.find({}).toArray();
                count = coupons.length;
            }

            const totalCount = await couponsCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                coupons,
            });
        });


        // Get a Specific Coupon.
        app.get('/coupon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await couponsCollection.findOne(query);
            res.send(result);
        });



        // Post New Coupon.
        app.post('/add-new/coupon', async (req, res) => {
            const coupon = req.body;
            const result = await couponsCollection.insertOne(coupon);
            res.send(result);
        });


        // Update Coupons.
        app.patch('/update/coupon/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    logo: data.logo,
                    thumb: data.thumb,
                    title: data.title,
                    minimumAmount: data.minimumAmount,
                    discountPercentage: data.discountPercentage,
                    productType: data.productType,
                    couponCode: data.couponCode,
                    endTime: data.endTime,
                    updatedAt: new Date().toISOString()
                }
            };

            const result = await couponsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Delete coupons.
        app.delete('/coupon/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await couponsCollection.deleteOne(query);
            res.send(result);
        });



        /*---------------------------------------------------------------
        //                          Staffs API.
        ---------------------------------------------------------------*/


        // Get All Staffs.
        app.get('/staffs', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const email = req.query.email;
            const search = req.query.search;
            const role = req.query.role;

            let staffs;
            let count;
            if (page) {
                const filter = {
                    ...(search && {
                        $or: [
                            { displayName: { $regex: search, $options: 'i' } },
                            { email: { $regex: search, $options: 'i' } },
                            { contact: { $regex: search, $options: 'i' } }
                        ]
                    }),
                    ...(email && { email: { $regex: email, $options: 'i' } }),
                    ...(role && { role: { $regex: role, $options: 'i' } })
                };
                staffs = await staffsCollection.find(filter).skip(page * size).limit(size).toArray();
                const staffsLimit = await staffsCollection.find(filter).toArray();
                count = staffsLimit.length;
            }
            else {
                const filter = {
                    ...(search && {
                        $or: [
                            { displayName: { $regex: search, $options: 'i' } },
                            { email: { $regex: search, $options: 'i' } },
                            { contact: { $regex: search, $options: 'i' } }
                        ]
                    }),
                    ...(email && { email: { $regex: email, $options: 'i' } }),
                    ...(role && { role: { $regex: role, $options: 'i' } })
                };
                staffs = await staffsCollection.find(filter).toArray();
                count = staffs.length;
            }

            const totalCount = await staffsCollection.estimatedDocumentCount();

            res.send({
                totalCount,
                count,
                staffs,
            });
        });


        // Get a Specific Staff.
        app.get('/staff', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await staffsCollection.findOne(query);
            res.send(result);
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
        app.post('/add-new/staff', async (req, res) => {
            const staff = req.body;
            const result = await staffsCollection.insertOne(staff);
            res.send(result);
        });


        // Update Staff Profile Information.
        app.patch('/update/staff/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    photoURL: data.photoURL,
                    thumb: data.thumb,
                    displayName: data.displayName,
                    email: data.email,
                    contact: data.contact,
                    password: data.password,
                    joiningDate: data.joiningDate,
                    role: data.role,
                    updatedAt: data.updatedAt
                }
            };

            const result = await staffsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // Delete Staff Information.
        app.delete("/staff/delete/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await staffsCollection.deleteOne(query);
            res.send(result);
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