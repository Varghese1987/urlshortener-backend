const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const bcrypt = require('bcrypt');
const randomstring = require("randomstring");
const nodemailer = require("nodemailer");
var moment = require('moment');
const unirest = require("unirest");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const dbUrl = "mongodb+srv://varghese123:varghese123@cluster0-yqune.mongodb.net/<dbname>?retryWrites=true&w=majority"
//const dbUrl = "mongodb://localhost:27017";

app.use(bodyParser.json());
app.use(cors());


app.get("/urlList/:id", (req, res) => {
    //let objId = mongodb.ObjectID(req.params.id)
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("shorturl").find({ userId: req.params.id }).toArray().then((data) => {
            client.close();
            res.status(200).json(data);
        })
            .catch((error) => {
                //console.log(error);
            })
    })
});

app.post("/register", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("users").findOne({ email: req.body.email }, (err, data) => {
            if (err) throw err;
            if (data) {
                res.status(400).json({
                    "message": "User already Exist"
                })
            } else {
                bcrypt.genSalt(2, (err, salt) => {
                    bcrypt.hash(req.body.password, salt, (err, hash) => {
                        req.body.password = hash;
                        db.collection("users").insertOne(req.body, (err, data) => {
                            if (err) throw err;
                            if (data) {
                                let string = randomstring.generate();
                                //console.log(string)
                                db.collection("users").updateOne({ email: req.body.email }, { $set: { randomstring: string, activate: false } }, { upsert: true }, (err, data) => {
                                    //console.log(data)
                                    client.close();
                                    if (err) throw err;
                                    if (data) {
                                        //res.status(200).send("success");
                                        let transporter = nodemailer.createTransport({
                                            host: "smtp.gmail.com",
                                            port: 587,
                                            secure: false,
                                            auth: {
                                                user: 'varghese87joseph@gmail.com',
                                                pass: process.env.PASSWORD
                                            },
                                            tls: {
                                                rejectUnauthorized: false
                                            }
                                        });
                                        let mailOptions = {
                                            from: 'varghese87joseph@gmail.com',
                                            to: 'varghese87es@gmail.com',
                                            subject: "Activate User Account",
                                            text: string,
                                            html: `<a href='https://esv-urlshotener-frontend.netlify.app/#/activateuser/${string}'>Click her to Activate your Account</a>`
                                        };
                                        transporter.sendMail(mailOptions, (err, data) => {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log('Email Sent:' + data.response);
                                            }

                                        });
                                        res.status(200).json({
                                            "message": "success"
                                        });
                                    }
                                });
                            }
                        });
                    })
                })
            }
        })
    });
});

app.post("/login", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        let db = client.db("ShortUrlApp");
        db.collection("users").findOne({ email: req.body.email }, (err, data) => {
            client.close();
            if (err) throw err;
            // console.log(data)
            if (data) {
                if (data.activate) {
                    bcrypt.compare(req.body.password, data.password, (err, result) => {
                        // console.log(result)
                        if (result) {
                            jwt.sign({ userid: data._id }, "qwert", { expiresIn: '1h' }, (err, token) => {

                                res.status(200).json({
                                    "message": "success",
                                    "token": token,
                                    "userId": data._id
                                });
                            })
                        } else {
                            res.status(401).json({
                                "message": "Wrong Credentials",
                            });
                        }
                    })
                } else {
                    res.status(401).json({
                        message: "User Not activated"
                    })
                }
            } else {
                res.status(401).json({
                    "message": "Email doesnt exist",
                });
            }
        })
    })
})

app.post("/check-user", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("users").findOne({ email: req.body.email }, (err, data) => {
            if (err) throw err;
            if (data) {
                let string = randomstring.generate();
                db.collection("users").updateOne({ email: data.email }, { $set: { randomstring: string } }, { upsert: true }, (err, data) => {
                    //console.log(data)
                    client.close();
                    if (err) throw err;
                    if (data) {
                        res.status(200).send("success");
                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            port: 587,
                            secure: false,
                            auth: {
                                user: 'varghese87joseph@gmail.com',
                                pass: process.env.PASSWORD
                            },
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                        let mailOptions = {
                            from: 'varghese87joseph@gmail.com',
                            to: 'varghese87es@gmail.com',
                            subject: "Change Password",
                            text: string,
                            html: `<a href='https://esv-urlshotener-frontend.netlify.app/#/resetpwd/${string}'>Click her to Rest password</a>`
                        };
                        transporter.sendMail(mailOptions, (err, data) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('Email Sent:' + data.response);
                            }

                        });
                    }
                });
            } else {
                res.status(401).json({
                    "message": "Email doesnt exist",
                });
            }
        });
    });
});

app.put("/reset-password/:string", (req, res) => {
    //console.log(req.params.string)
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("users").findOne({ randomstring: req.params.string }, (err, data) => {
            if (err) throw err;
            if (data) {
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(req.body.password, salt, (err, hash) => {
                        req.body.password = hash;
                        db.collection("users").updateOne({ randomstring: req.params.string }, { $set: { password: req.body.password, randomstring: "" } }, { upsert: true }, (err, data) => {
                            client.close();
                            if (err) throw err;
                            if (data) {
                                res.status(200).json({
                                    "message": "Password updated"
                                });
                            }
                        })
                    })

                })

            } else {
                res.status(401).json({
                    "message": "Details doesnt match generate a fresh link to reset the password",
                });
            }
        })
    })

});

app.put("/activateuser", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("users").findOne({ randomstring: req.body.string }, (err, data) => {
            if (err) throw err;
            if (data) {
                db.collection("users").updateOne({ randomstring: req.body.string }, { $set: { activate: true, randomstring: "" } }, { upsert: true }, (err, data) => {
                    client.close();
                    if (err) throw err;
                    if (data) {
                        res.status(200).json({
                            "message": "Please Login to make use of the service"
                        });
                    }
                })
            } else {
                res.status(401).json({
                    "message": "Details doesnt match",
                });
            }
        });
    });
});

let arr = []
function randomString(value) {
    let n = arr.indexOf(value);
    if (n > -1) {
        short = randomString(randomstring.generate(8));
    } else {
        arr.push(value)
    }
    return arr[arr.length - 1];
}

app.post("/shortUrl", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        if (err) throw err;
        let db = client.db("ShortUrlApp");
        db.collection("shorturl").insertOne(req.body, (err, data) => {
            if (err) throw err;
            if (data) {
                short = randomString(randomstring.generate(8));
                //console.log(short);
                db.collection("shorturl").updateOne({ longUrl: req.body.longUrl }, { $set: { shortUrl: `https://esv-shorturl.herokuapp.com/${short}`, hit: 0 } }, { upsert: true }, (err, data) => {
                    if (err) throw err;
                    if (data) {
                        db.collection("shorturl").findOne({ longUrl: req.body.longUrl }, (err, data) => {
                            client.close();
                            if (err) throw err;
                            if (data) {
                                //console.log(data.shortUrl)
                                res.status(200).json({
                                    "message": "Short URL Created",
                                    "shortUrl": data.shortUrl
                                });
                            }
                        })
                    }

                })
            }
        });
    });
});

app.get("/:string", (req, res) => {
    mongoClient.connect(dbUrl, (err, client) => {
        //let url = `http://localhost:3000/${req.params.string}`;
        let url = `https://esv-shorturl.herokuapp.com/${req.params.string}`;
        let db = client.db("ShortUrlApp");
        db.collection("shorturl").findOne({ shortUrl: url }, (err, data) => {
            if (err) throw err;
            if (data) {
                db.collection("shorturl").updateOne({ shortUrl: url }, { $set: { hit: data.hit + 1 } }, { upsert: true }, (err, response) => {
                    client.close();
                    if (err) throw err;
                    if (response) {
                        res.redirect(data.longUrl)
                    }
                })
            } else {
                res.status(401).json({
                    "message": "URL that you have entered is not correct"
                })
            }
        })
    })
})


app.listen(process.env.PORT || 3000, () => {
    console.log("App started")
})