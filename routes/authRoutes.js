// routes for all user data
import express from 'express';
import User from '../Database Models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
  const { email, password } = req.body;

  User.findOne({ socialId: email }).then((data) => {
    if (data) {
      bcrypt.compare(password, data.password, (err, result) => {
        if (err) {
          res.status(500).json({ error: true, message: 'An error occured' });
          return;
        }

        if (!result) {
          res
            .status(401)
            .json({ error: true, message: 'Email or password incorrect' });
          return;
        }

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
      });
    } else {
      res
        .status(401)
        .json({ error: true, message: 'Email not found, create an account' });
    }
  });
});

// sign up
userRoute.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  User.findOne({ socialId: email })
    .then((data) => {
      if (data) {
        res.status(401).json({ error: true, message: 'Email already exists' });
      } else {
        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            res.status(500).json({ error: true, message: 'An error occured' });
            return;
          }

          bcrypt.hash(password, salt, (err, hash) => {
            if (err) {
              res
                .status(500)
                .json({ error: true, message: 'An error occured' });
              return;
            }

            const newUser = new User({
              socialId: email,
              name,
              email,
              password: hash,
            });

            newUser
              .save()
              .then((data) => {
                // access token expires within 25minutes
                const accessToken = jwt.sign(
                  { id: data._id },
                  access_jwt_secret,
                  {
                    expiresIn: '25m',
                  }
                );

                // refresh token expires after 2 weeks
                const refreshToken = jwt.sign(
                  { id: data._id },
                  refresh_jwt_secret,
                  {
                    expiresIn: '2w',
                  }
                );

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
              })
              .catch((err) =>
                res.status(401).json({
                  error: true,
                  message: 'User name or Email already exists',
                })
              );
          });
        });
      }
    })
    .catch((err) =>
      res.status(401).json({ error: true, message: 'Email already exists' })
    );
});

userRoute.post('/host', (req, res) => {
  const { accountNumber, bank, id } = req.body;

  User.findOneAndUpdate(
    { _id: id },
    { accountType: 'Host', accountNumber, bank }
  )
    .then((data) => {
      res.status(200).json(data);
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
