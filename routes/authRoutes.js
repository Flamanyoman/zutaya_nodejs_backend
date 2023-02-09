// routes for all user data
import express from 'express';
import User from '../Database Models/userModel.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const userRoute = express.Router();

// configure environment variable
dotenv.config();

// access token secret
const access_jwt_secret = process.env.ACCESS_JWT_SECRET;

// refresh token secret
const refresh_jwt_secret = process.env.REFRESH_JWT_SECRET;

// login
userRoute.post('/login', (req, res) => {
  const { email } = req.body;

  User.findOne({ socialId: email }).then((data) => {
    if (data) {
      // access token expires within 25minutes
      const accessToken = jwt.sign({ id: data._id }, access_jwt_secret, {
        expiresIn: '25m',
      });

      // refresh token expires after 2 weeks
      const refreshToken = jwt.sign({ id: data._id }, refresh_jwt_secret, {
        expiresIn: '2w',
      });

      // send access token cookie which expires in 26 minutes
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 26,
      });

      // send refresh token cookie which expires in 2weeks minutes
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 14,
      });

      res.status(200).json({ data });
    } else {
      res.status(404).json({ error: true, email: email });
    }
  });
});

// sign up
userRoute.post('/signup', (req, res) => {
  const { email } = req.body;

  const newUser = new User({ socialId: email, name: email });

  newUser.save().then((data) => {
    // access token expires within 25minutes
    const accessToken = jwt.sign({ id: data._id }, access_jwt_secret, {
      expiresIn: '25m',
    });

    // refresh token expires after 2 weeks
    const refreshToken = jwt.sign({ id: data._id }, refresh_jwt_secret, {
      expiresIn: '2w',
    });

    // send access token cookie which expires in 26 minutes
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 26,
    });

    // send refresh token cookie which expires in 2weeks minutes
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    });

    res.status(200).json({ success: true, data });
  });
});

userRoute.post('/host', (req, res) => {
  const { accountNumber, bank, id } = req.body;

  User.findOneAndUpdate(
    { _id: id },
    { accountType: 'Host', accountNumber, bank }
  )
    .then((data) => {
      res.status(200).json({ success: true, data });
    })
    .catch((err) => res.status(500).json({ error: 'Internal server' }));
});

// logout function

userRoute.get('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({ logout: true });
});

export default userRoute;
