import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import pageRoute from './routes/pageRoutes.js';
import userRoute from './routes/authRoutes.js';
import ticketRoute from './routes/ticketRoute.js';
import cors from 'cors';
import cookieSession from 'cookie-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import hpp from 'hpp';
import csurf from 'csurf';
import jwt from 'jsonwebtoken';

// initializing express
const app = express();

// configure environment variable
dotenv.config();

// calling environment variables
const port = process.env.PORT || 8080;
const dburi = process.env.dbURI;
const secret = process.env.SECRET;

// connect db and listen for express on dzedicated port
// connect mongoose and initialize express listen
mongoose
  .connect(dburi, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    app.listen(port, console.log(`server is listening on port ${port}`));
    console.log('Db connected as well');
  })
  .catch((err) => console.log(err));

/* Set Security Configs */
// app.use(helmet());
// app.use(hpp());

// middleware
app.use(express.json());

// cross origin with local host 3000 only

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://zutaya.onrender.com'],
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);
// cookie sessions for client side cookies
app.use(
  cookieSession({
    name: 'Login',
    secret: secret,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000 * 14),
    // 1000 miliseconds * 60 seconds * 60 minutes * 24 hours * 14 days
  })
);

// middleware to allow cookies to be set cross origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://zutaya.onrender.com');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type'
  );
  res.setHeader('Access-Control-Allow-Credentials', true);

  res.header('Content-Type', 'application/json;charset=UTF-8');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// cookie parser for setting and getting cookies on the client side
app.use(cookieParser());

// app.use(csurf());
// app.use(limiter);

// passport middlewares
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use('/api', pageRoute);
app.use('/api', userRoute);
app.use('/api', ticketRoute);

// error handler middleware
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  return res.status(status).json({
    success: false,
    status,
    message,
  });
};

app.use(errorHandler);
