const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); //used to send emails via postfix
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const http = require('http');
const app = express();
const PORT = process.env.PORT || 80;
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb://localhost:27017';
const dbName = 'users';

// Create a write stream in append mode for logging to a file
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Use morgan to log all requests to the file
app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-CSE356', '66d1fcb57f77bf55c5004de9'); // Set your desired value for X-CS header
  next(); // Move to the next middleware or route handler
});

// Database Config
MongoClient.connect(uri, {useNewUrlParser: true, useUnifiedTopology: true})
   .then(client => {
     console.log('Connected to db');
     db = client.db(dbName);
   }

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool, // Connection pool
        tableName: 'session' // Created a new table called session
    }),
    secret: 'my_secret', // Replace with a secure secret
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));


let transporter = nodemailer.createTransport({
    host: 'localhost',  // Assuming you have a local SMTP server like Postfix running
    port: 25,          // Default SMTP port
    path: '/usr/sbin/sendmail',
    secure: false,       // Disable TLS for local server
    tls: {
        rejectUnauthorized: false // Ignore self-signed certificate errors
    }

});

function generateKey() {
    const key = crypto.randomBytes(16).toString('hex'); // Generates a 32-character hex string
    const encodedKey = encodeURIComponent(key);
    return encodedKey;
}

function sendVerificationEmail(email, key) {
    const verificationLink = `http://yourdomain.com/verify?email=${encodeURIComponent(email)}&key=${key}`;
    console.log(verificationLink);
    let mailOptions = {
        from: 'cloud.cse356.compas.cs.stonybrook.edu', // Sender address
        to: "zoe.lucas@stonybrook.edu",                             // List of receivers
        subject: 'Verify Your Email',              // Subject line
        text: `Please click the following link to verify your email: ${verificationLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error while sending mail: ', error);
        }
        console.log('Email sent successfully: ', info.response);
    });
}

app.post('/adduser', async (req, res) => {
    console.log('Request Body:', req.body);
    const { username, password, email } = req.body;
    const encodeEmail = encodeURIComponent(email);
    console.log("adding user");
    console.log(username);
    console.log(password);
    console.log("encoded email: ");
    console.log(encodeEmail);
  try{
    // check for duplicate user
    
   // if (checkResult.rows.length > 0) {
     //       console.log("duplicate user!");
       //     return res.status(200).json({
         //          status: "ERROR",
           //        error: true,
             //      message: "Duplicate user!"
           // });

      // console.log("idk");
  //  }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    const key = generateKey();
    console.log("The key: ");
    console.log(key);

    const userData = {
     
	username: username,
        password: password,
        email: email,
        key: key

    }

    //user,password,email,key
    db.collection('manage_users').insertOne(userData)
      .then(result => {
            	res.status(200).json({
    		status:"OK",
    		message:"Added user!"
    	    );
       }).catch(error => {
     		console.error('Error adding user:', error);
        	res.status(500).json({ message: 'Internal server error' });
       });
});



app.get('/verify', async (req, res) => {
    console.log("in verify email and key");
    console.log(req.query);
    const query = req.query;
    const { email, key } = req.query;
    const encodeEmail = encodeURIComponent(email);

  try{
    console.log(encodeEmail);
    console.log(key);
    const findUser = await db.collection('manage_users').find(query)
       .then(results => 
          await sendVerificationEmail(encodeEmail, key)
             .then(result => {
           	res.status(200).json({
           	status:"OK",
           	message: "Sent email!"
       	.catch (error) {
        	console.error('Error sending verification email:', error);
        	res.status(500).json({ message: 'Internal server error' });
    	}
   catch (error) {
         console.error('Error in verify API:', error);
         res.status(500).json({ message: 'Internal server error' });
   
    }
 });


//app.get('/', async (req,res) => {
//   console.log("hello");
//   res.send(`
//        <h2>Welcome!</h2>
//   `);
//});


app.get('/login', (req, res) => {
    res.send(`
        <h2>Login Page</h2>
        <form action="/login" method="POST">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username" required><br><br>
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required><br><br>
            <button type="submit">Login</button>
        </form>
    `);
});

// Handle POST request to /login
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(username);
    console.log(password);
    res.send("success");
    req.session.username = username; // Store username in session
});

app.use(express.static(path.join(__dirname, 'client')));
// Serve index.html on the root route
app.get('/video', (req, res) => {
    console.log("serving a video!");
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.use((req, res, next) => {
  res.status(200).json({
    status: "ERROR",
    error: true,
    message: "Route not found"
  });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



