// routes for all pages data
import express from 'express';
import Page from '../Database Models/pagesModel.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../Database Models/userModel.js';
import Event from '../Database Models/eventsModel.js';

const pageRoute = express.Router();

// configure environment variable
dotenv.config();

// access token secret
const access_jwt_secret = process.env.ACCESS_JWT_SECRET;

// refresh token secret
const refresh_jwt_secret = process.env.REFRESH_JWT_SECRET;

// this are visible to all users, but check if a user is authenticated
pageRoute.get('/auth', (req, res) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (accessToken) {
    jwt.verify(accessToken, access_jwt_secret, (err, payLoad) => {
      if (err) {
        let id;
        jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
          if (err) {
            res.status(200).json({ authError: true, err });
          } else {
            id = payLoad.id;
          }

          if (id) {
            // generate new accessToken
            const newAccessToken = jwt.sign({ id }, access_jwt_secret, {
              expiresIn: '25m',
            });

            // generate new refreshToken
            const newRefreshToken = jwt.sign({ id }, refresh_jwt_secret, {
              expiresIn: '2w',
            });

            res.cookie('accessToken', newAccessToken);

            res.cookie('refreshToken', newRefreshToken);

            User.findOne({ _id: payLoad.id })
              .populate({
                path: 'eventsAttended',
                populate: {
                  path: 'id',
                  select: [
                    'eventName',
                    'dateStamp',
                    'timeStamp',
                    'org',
                    'host',
                    'profilePic',
                  ],
                },
              })
              .populate({
                path: 'eventsHosted',
                select: [
                  'eventName',
                  'dateStamp',
                  'timeStamp',
                  'org',
                  'totalAvailableTickets',
                  'totalSoldTickets',
                  'income',
                ],
              })
              .populate({
                path: 'guestList',
                select: ['socialMedia', 'name', 'accountType', 'profilePic'],
              })
              .then((data) => {
                res.status(200).json(data);
              })
              .catch((err) => {
                res.status(401).json({ authError: true, err });
              });
          }
        });
      } else {
        User.findOne({ _id: payLoad.id })
          .populate({
            path: 'eventsAttended',
            populate: {
              path: 'id',
              select: [
                'eventName',
                'dateStamp',
                'timeStamp',
                'org',
                'host',
                'profilePic',
              ],
            },
          })
          .populate({
            path: 'eventsHosted',
            select: [
              'eventName',
              'dateStamp',
              'timeStamp',
              'org',
              'totalAvailableTickets',
              'totalSoldTickets',
              'income',
            ],
          })
          .populate({
            path: 'guestList',
            select: ['socialMedia', 'name', 'accountType', 'profilePic'],
          })
          .then((data) => {
            res.status(200).json(data);
          })
          .catch((err) => {
            res.status(500).json({ authError: true, err });
          });
      }
    });
  }

  if (!accessToken && refreshToken) {
    let id;
    jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
      if (err) {
        res.status(401).json({ authError: true, err });
      } else {
        id = payLoad.id;
      }

      if (id) {
        // generate new accessToken
        const newAccessToken = jwt.sign({ id }, access_jwt_secret, {
          expiresIn: '25m',
        });

        // generate new refreshToken
        const newRefreshToken = jwt.sign({ id }, refresh_jwt_secret, {
          expiresIn: '2w',
        });

        res.cookie('accessToken', newAccessToken);

        res.cookie('refreshToken', newRefreshToken);

        User.findOne({ _id: payLoad.id })
          .populate({
            path: 'eventsAttended',
            populate: {
              path: 'id',
              select: [
                'eventName',
                'dateStamp',
                'timeStamp',
                'org',
                'host',
                'profilePic',
              ],
            },
          })
          .populate({
            path: 'eventsHosted',
            select: [
              'eventName',
              'dateStamp',
              'timeStamp',
              'org',
              'totalAvailableTickets',
              'totalSoldTickets',
              'income',
            ],
          })
          .populate({
            path: 'guestList',
            select: ['socialMedia', 'name', 'accountType', 'profilePic'],
          })
          .then((data) => res.status(200).json(data))
          .catch((err) => {
            res.status(401).json({ authError: true, err });
          });
      }
    });
  }

  if (!accessToken && !refreshToken) {
    res.status(401).json({ authError: true, err });
  }
});

// Home component
pageRoute.get('/', (req, res) => {
  const title = 'Home | ticket adnan';

  Page.findOne({ title: title })
    .then((data) => {
      res.status(200).json(data);
    })
    .catch((err) => res.status(500).json(err));
});

pageRoute.post('/events', (req, res) => {
  const { state, eventType, n } = req.body;
  // find documents in events database
  // filter the events by state and event type selected by the user
  // skip (n) number of documents already on the display in the front end
  // limit to 9 documents per fetch

  let filter = {};
  const filterFunc = (filter) => {
    Event.find(filter, {
      eventName: 1,
      dateStamp: 1,
      timeStamp: 1,
      state: 1,
      location: 1,
      eventType: 1,
      img: 1,
    })
      .skip(n)
      .limit(9)
      .sort({ dateStamp: 'ascending' })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  };

  if (state && !eventType) {
    filter = { state, datePassed: false };

    filterFunc(filter);
  } else if (eventType && !state) {
    filter = { eventType, datePassed: false };

    filterFunc(filter);
  } else if (state && eventType) {
    filter = { state, eventType, datePassed: false };

    filterFunc(filter);
  } else {
    filter = { datePassed: false };

    filterFunc(filter);
  }
});

// 404 component
pageRoute.get((req, res) => {
  const title = '404';

  Page.findOne({ title }).then((data) => {
    res.status(404).json(data);
  });
});

// login component
pageRoute.get('/login', (req, res) => {
  const title = 'Log in | ticket adnan';

  Page.findOne({ title }).then((data) => {
    res.status(200).json(data);
  });
});

// information components with dynamic :ids
pageRoute.get('/information/:id', (req, res) => {
  const id = req.params.id;

  Page.findOne({ id }).then((data) => {
    res.status(200).json(data);
  });
});

// pricing component
pageRoute.get('/pricing', (req, res) => {
  const title = 'Pricing and charges | ticket adnan';

  Page.findOne({ title }).then((data) => {
    res.status(200).json(data);
  });
});

// create-event component
pageRoute.get('/create-event', (req, res) => {
  const title = 'Host an event | ticket adnan';

  Page.findOne({ title }).then((data) => {
    res.status(200).json(data);
  });
});

// guests component
pageRoute.get('/guests', (req, res) => {
  const title = 'guests';

  Page.findOne({ title }).then((data) => {
    res.status(200).json(data);
  });
});

// ticket component
pageRoute.get('/ticket/:id', (req, res) => {
  const id = req.params.id;

  Event.findOne({ _id: id }).then((data) => {
    res.status(200).json(data);
  });
});

// create page component
pageRoute.post('/create-page', (req, res) => {
  const { title, tags, description, header, id } = req.body;

  Page.findOne({ title: title })
    .then((data) => {
      if (data) {
        res
          .status(200)
          .json({ titleError: true, error: 'This page already exists' });
      } else {
        const newPage = new Page({ title, tags, description, header, id });

        newPage.save().then((result) => {
          res.json({ formSuccess: true, success: 'Page created' });
        });
      }
    })
    .catch((err) =>
      res
        .status(500)
        .json({ formError: true, error: 'Error, page not created' })
    );
});

// get all page contents
pageRoute.get('/edit-page', (req, res) => {
  Page.find()
    .sort()
    .then((data) => {
      res.status(200).json(data);
    });
});

// get the page to be edited from the database
pageRoute.post('/edit-page/find', (req, res) => {
  const { findPage } = req.body;

  Page.findOne({ title: findPage }).then((data) => {
    if (data) {
      res
        .status(200)
        .json({ form1Success: true, success: 'Page found', info: data });
    } else {
      res.status(404).json({ form1Error: true, error: 'Page not found' });
    }
  });
});

pageRoute.post('/edit-page/delete', (req, res) => {
  const { id } = req.body;

  Page.findOneAndDelete({ _id: id })
    .then((data) => {
      res.status(200).json({ delSuccess: true });
    })
    .catch((err) => res.status(500).json({ delError: true, id: id }));
});

pageRoute.post('/edit-page/update', (req, res) => {
  const { id, title, tags, description, header } = req.body;

  Page.find({ _id: id }).then((data) => {
    if (data) {
      Page.findOneAndUpdate(
        { _id: id },
        { title: title, tags: tags, description: description, header: header }
      )
        .then((data) =>
          res
            .status(200)
            .json({ form1Success: true, success: 'Page updated successfully' })
        )
        .catch((err) =>
          res.status(500).json({ form1Error: true, error: 'Failed, try again' })
        );
    } else {
      res.status(404).json({ form1Error: true, error: 'Page not found' });
    }
  });
});

// this sends a post request to update all subtopics of pages
pageRoute.post('/edit-page/subtopic/update', (req, res) => {
  const { id, h2, p, img } = req.body;

  Page.findOneAndUpdate({ _id: id }, { $push: { p: { h2, p, img } } })
    .then((data) => {
      data === null
        ? res
            .status(404)
            .json({ form2Error: true, error: 'Page to be updated not found' })
        : res
            .status(200)
            .json({ form2Success: true, success: 'Subtopic created' });
    })
    .catch((err) =>
      res.status(500).json({ form2Error: true, error: 'Update failed' })
    );
});

pageRoute.post('/edit-page/subtopic/delete', (req, res) => {
  const { sub, i, id } = req.body;

  Page.findOneAndUpdate(
    { _id: id },
    { $pullAll: { p: [{ _id: sub._id }] } }
  ).then((data) => console.log(data));

  res.status(200).json({ sub, i, id });
});

export default pageRoute;
