const express = require("express");
const app = express();
const cors = require("cors")
const mongoose = require("mongoose");
const Product = require('./moduls/Product')
const Usermodule=require("./moduls/Usermodule")
const bcrypt = require("bcrypt");
const secretKey = "42sfkl;jdf;o0923rujwefolkjsd";
const jwt = require("jsonwebtoken");
const path = require("path");

const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" })



app.use(express.json())
app.use(express.static(path.join(__dirname, "uploads")));
app.use(cors());

// upload image

app.post("/uploading", upload.single('image'), (req, res) => {
    console.log(req.body);
    console.log(req.file);

    try {
        const extension = req.file.mimetype.split("/")[1];
        if (extension == "png" || extension == "jpg" || extension == "jpeg") {
            const fileNmae = req.file.filename + "." + extension;
            // console.log(fileNmae);
            // req.body.image = fileNmae;
            fs.rename(req.file.path, `uploads/${fileNmae}`, () => {
                console.log("\nFile Renamed!\n");
            });
        } else {

            fs.unlink(req.file.path, () => console.log("file deleted"))
            return res.json({
                message: "only images are accepted"
            })
        }


    } catch (error) {

    }
});


app.get('/', (req, res) => {
    res.status(200).send("welcom to express and node");
})

//  show all product
app.get("/product", async (req, res) => {
    try {
        const products = await Product.find({});
        return res.status(200).json({
            status: true,
            products: products
        })
    } catch (error) {
        return res.status(404).json({
            status: false,
            message: error.message
        })
    }
})

// find by id
app.get("/product/:id", async (req, res) => {

    const id = req.params.id;
    try {
        const product = await Product.findById(id);
        return res.status(200).json({
            status: true,
            product: product
        })
    } catch (error) {
        return res.status(404).json({
            status: false,
            message: "Product not found"
        })
    }
})

// create product with image

app.post("/product", upload.single('image'), async (req, res) => {

    try {
        const extension = req.file.mimetype.split("/")[1];
        if (extension == "png" || extension == "jpg" || extension == "jpeg") {
            const fileNmae = req.file.filename + "." + extension;

            // new key in body object
            req.body.image = fileNmae;

            fs.rename(req.file.path, `uploads/${fileNmae}`, () => {
                console.log("\nFile Renamed!\n");
            });
        } else {
            fs.unlink(req.file.path, () => console.log("file deleted"))
            return res.json({
                message: "only images are accepted"
            })
        }
        const newProduct = await Product.create(req.body);
        res.status(201).json({
            status: true,
            newProduct: newProduct,
            message: "product created"
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            // Mongoose validation error
            const errors = {};
            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            res.status(200).json({
                status: false,
                errors: errors
            });
        } else {
            // Other types of errors
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// update product with image

app.put("/product/:id", upload.single('image'), async (req, res) => {
    const id = req.params.id;
    try {

        const extension = req.file.mimetype.split("/")[1];
        if (extension == "png" || extension == "jpg" || extension == "jpeg") {
            const fileNmae = req.file.filename + "." + extension;

            const oldimg = await Product.findById(id);
            fs.unlink(`uploads/${oldimg.image}`, () => console.log("file deleted"))
            req.body.image = fileNmae;
            fs.rename(req.file.path, `uploads/${fileNmae}`, () => {
                console.log("\nFile Renamed!\n");
            });

        } else {
            fs.unlink(req.file.path, () => console.log("file deleted"))
            return res.json({
                message: "only images are accepted"
            })
        }
        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
            runValidators: true,
            new: true
        });
        return res.status(200).json({
            status: true,
            updatedProduct: updatedProduct,
            message: "product succesfully updated"
        })
    } catch (error) {
        if (error.name === 'ValidationError') {
            // Mongoose validation error
            const errors = {};
            for (const field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            res.status(422).json({ errors });
        } else {
            // Other types of errors
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});



// delete by id with image
app.delete("/product/:id", upload.single('image'), async (req, res) => {
    const id = req.params.id;
    try {
        const oldimge = await Product.findById(id);
        await Product.findByIdAndDelete(id);
        fs.unlink(`uploads/${oldimge.image}`, () => console.log("file deleted"))
        return res.status(200).json({
            status: true,
            message: "product succesfully deleted"
        })
    } catch (error) {
        return res.status(404).json({
            status: false,
            message: "something went wrong"
        })
    }
});


/////////////////////////

// login and log out

app.post("/signup", async (req, res) => {
    const {username, email, password } = req.body;
    try {

        // check email is already registered or not
        const alreadyUser = await Usermodule.findOne({ email: email });
        if (alreadyUser !== null) {
            return res.json({
                status: "failed",
                message: "Already registered"
            })
        }

        // encrypt password
        const hashed = await bcrypt.hash(password, 10);


        // create new user
        const newUser = await Usermodule.create({
            username: username,
            email: email,
            password: hashed
        });

        // generate jwt token
        const token = jwt.sign({ id: newUser._id }, secretKey);

        return res.status(200).json({
            status: "success",
            message: "Signup successfully",
            token: token
        })

    } catch (error) {
        return res.status(409).json({
            status: "failed",
            message: "Something went wrong"
        })
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // first check user is exist or not and if exists then take it out
        const alreadyuser = await Usermodule.findOne({ email: email })

        if (alreadyuser === null) {
            res.json({
                status: "faild",
                message: "authentication faild"
            })
        };

        // if user is registered, then check the password

        const confirmPass = await bcrypt.compare(password, alreadyuser.password);
        if (confirmPass === false) {
            res.json({
                status: "faild",
                message: "authentication faild"
            })
        }
            // okay, jswon token

            const token = jwt.sign({ id: alreadyuser._id }, secretKey);

            // return respon
            res.json({
                status: "success",
                message: "logged in successfully",
                token: token
            })

    } catch (error) {

    }
})

mongoose.connect("mongodb://127.0.0.1:27017/produt").then(() => {
    app.listen(3001, () => {
        console.log("db connected and server is up now");
    })
})


