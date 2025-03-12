const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ObjectId } = require('mongodb');

// Ports
const port = process.env.PORT || 5000;
const app = express();


// Middleware.
app.use(cors());
app.use(express.json());


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
        const customersCollection = database.collection('customers');
        const categoriesCollection = database.collection('categories');
        const couponsCollection = database.collection('coupons');
        const staffsCollection = database.collection('staffs');



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



        /*---------------------------------------------------------
        //                  Customers/User API
        ---------------------------------------------------------*/



        // Get All Customers.
        app.get('/customers', async (req, res) => {
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
        //                      Categories API.
        ---------------------------------------------------------*/





        // Get All Categories API.
        app.get('/categories', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const search = req.query.search;
            // const category = req.query.category;
            let categories;
            let count;

            if (page && search) {
                const filter = {
                    parent: {
                        $regex: search,
                        $options: 'i'
                    }
                };
                categories = await categoriesCollection.find(filter).skip(page * size).limit(size).toArray();
                count = categories.length;
            }
            else if (page) {
                categories = await categoriesCollection.find({}).skip(page * size).limit(size).toArray();
                count = await categoriesCollection.estimatedDocumentCount();
            }
            else {
                categories = await categoriesCollection.find({}).toArray();
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



        /*--------------------------------------------------------------
        //                      Coupons API.
        --------------------------------------------------------------*/



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

            const count = await couponsCollection.estimatedDocumentCount();

            res.send({
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