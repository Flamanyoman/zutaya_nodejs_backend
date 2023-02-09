import express from 'express';
import jwt from 'jsonwebtoken';
import Event from '../Database Models/eventsModel.js';
import dotenv from 'dotenv';
import multer from 'multer';
import User from '../Database Models/userModel.js';
import moment from 'moment/moment.js';
import schedule, { RecurrenceRule } from 'node-schedule';

// initialize ticketRoute
const ticketRoute = express.Router();

// configure environment variable
dotenv.config();

// access token secret
const access_jwt_secret = process.env.ACCESS_JWT_SECRET;

// refresh token secret
const refresh_jwt_secret = process.env.REFRESH_JWT_SECRET;

// tutorial from youtube: MERN STACK UPLOAD ARTICLE WITH IMAGE
var storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// collects ticket data and saves to the database if the front end is a host
ticketRoute.post('/create-event', upload.single('event-image'), (req, res) => {
  // get cookies from front end client
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  // id of front end client
  let id;

  // code block to verify ticket information and submit
  const submitTicket = (user) => {
    const {
      eventName,
      date,
      repeat,
      time,
      venue,
      eventBrand,
      email,
      accountNumber,
      bank,
      state,
      eventType,
      description,
      createdTickets,
      totalAvailableTickets,
      income,
      preIncome,
    } = req.body;

    // convert JSON createdTickets to object tickets
    const tickets = JSON.parse(createdTickets);

    // check for errors
    if (
      eventName.length < 1 ||
      date.length < 3 ||
      repeat.length < 1 ||
      date < new Date(Date.now() + 1000 * 60 * 60 * 24) ||
      time.length < 1 ||
      venue.length < 3 ||
      eventBrand.length < 1 ||
      email.length < 4 ||
      !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        email
      ) ||
      accountNumber.length !== 10 ||
      bank.length < 3 ||
      state.length < 3 ||
      eventType.length < 3 ||
      description.length < 3 ||
      totalAvailableTickets < 1 ||
      income < 100 ||
      preIncome < 100
    ) {
      // if error
      res.status(400).json({
        formErr: true,
        message: 'Make sure all fields are filled correctly!',
      });
    } else {
      // no error
      Event.findOne({ eventName: eventName })
        .then((data) => {
          // check if a ticket with the same name exists
          if (data) {
            res.status(401).json({
              authError: true,
              message: 'A ticket with the same event name already exists',
            });
          } else {
            // save all ticket data to database
            // return success message and ticket link url
            const newEvent = new Event({
              eventName,
              dateStamp: date,
              repeat: repeat,
              timeStamp: time,
              location: venue,
              org: { orgName: eventBrand, orgEmail: email },
              accountNumber,
              bank,
              state,
              eventType,
              img: { type: req.file.mimetype, data: req.file.buffer },
              hype: description,
              host: {
                hostSocial: user.socialMedia,
                hostId: user._id,
                hostName: user.name,
              },
              tickets: [tickets],
              totalAvailableTickets,
              income: { expected: preIncome, realized: 0 },
            });

            newEvent
              .save()
              .then((result) => {
                // add events to list of host created event
                // update host expected income
                User.findOneAndUpdate(
                  { _id: user._id },
                  {
                    $push: { eventsHosted: result._id },
                    $set: { 'income.expected': income },
                  }
                )
                  .then((info) => {
                    // if success send success message to client
                    res
                      .status(200)
                      .json({ success: true, ticketId: result._id });
                  })
                  .catch((err) => {
                    // if error, send error message
                    res.status(500).json({
                      serverErr: true,
                      message:
                        'An error occured, refresh and resubmit the form',
                    });
                  });
              })
              .catch((err) => {
                // if error, send error message
                res.status(500).json({
                  serverErr: true,
                  message: 'An error occured, refresh and resubmit the form',
                });
              });
          }
        })
        .catch((err) => {
          res.status(500).json({
            serverErr: true,
            message: 'An error occured, refresh and resubmit the form',
          });
        });
    }
  };

  // verify access token cookie first, only access token can be used to create a new ticket
  if (accessToken) {
    jwt.verify(accessToken, access_jwt_secret, (err, payLoad) => {
      if (err) {
        jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
          if (err) {
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            });
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

              .then((data) => {
                if (data.accountType !== 'Host') {
                  res
                    .status(401)
                    .json({ accountErr: true, message: 'You must be a host ' });
                } else {
                  // create an event
                  submitTicket(data);
                }
              })
              .catch((err) =>
                res.status(401).json({
                  authError: true,
                  err,
                  message: 'Ensure you are logged in',
                })
              );
          }
        });
      } else {
        User.findOne({ _id: payLoad.id })
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host ' });
            } else {
              // create an event
              submitTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  // no access token hence verify refresh token
  if (!accessToken && refreshToken) {
    jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
      if (err) {
        res
          .status(401)
          .json({ authError: true, err, message: 'Ensure you are logged in' });
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
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host ' });
            } else {
              // create an event
              submitTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  if (!accessToken && !refreshToken) {
    res
      .status(401)
      .json({ authError: true, err, message: 'Ensure you are logged in' });
  }
});

// route for deleting tickets which have less than 2 buyers
ticketRoute.post('/delete-event', (req, res) => {
  const { deleteId, expected } = req.body;

  // get cookies from front end client
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  // id of front end client]
  let id;

  // // delete a ticket function
  const deleteTicket = (user) => {
    // delete the ticket first
    // since the creator of the event wants it deleted
    Event.findOneAndDelete({ _id: deleteId })
      .then((result) => {
        const income = expected - result.income.expected;

        // delete the ticket id from the user data
        User.findOneAndUpdate(
          { _id: user.id },
          {
            $pullAll: { eventsHosted: [deleteId] },
            $set: { 'income.expected': income },
          }
        )
          .then((data) => {
            // find the user from data base and include all information from other databases using populate
            User.findOne({ _id: user.id })
              .populate({
                path: 'eventsAttended',
                select: ['eventName', 'dateStamp', 'timeStamp', 'org'],
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
                select: ['socialMedia', 'name', 'accountType'],
              })
              .then((data) => res.status(200).json(data))
              .catch((err) => {
                res.status(401).json({ authError: true, err });
              });
          })
          .catch((err) => {
            res.status(500).json({ error: true, message: 'error' });
          });
      })
      .catch((err) => {
        res.status(500).json({ error: true, message: 'error' });
      });
  };

  // // verify access token cookie first, only access token can be used to create a new ticket
  if (accessToken) {
    jwt.verify(accessToken, access_jwt_secret, (err, payLoad) => {
      if (err) {
        jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
          if (err) {
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            });
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
              .then((data) => {
                if (data.accountType !== 'Host') {
                  res
                    .status(401)
                    .json({ accountErr: true, message: 'You must be a host ' });
                } else {
                  // create an event
                  deleteTicket(data);
                }
              })
              .catch((err) =>
                res.status(401).json({
                  authError: true,
                  err,
                  message: 'Ensure you are logged in',
                })
              );
          }
        });
      } else {
        User.findOne({ _id: payLoad.id })
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host ' });
            } else {
              // create an event
              deleteTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  // no access token hence verify refresh token
  if (!accessToken && refreshToken) {
    jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
      if (err) {
        res
          .status(401)
          .json({ authError: true, err, message: 'Ensure you are logged in' });
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
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host' });
            } else {
              // create an event
              deleteTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  if (!accessToken && !refreshToken) {
    res
      .status(401)
      .json({ authError: true, err, message: 'Ensure you are logged in' });
  }
});

// for ticket host to view event details
ticketRoute.get('/dashboard/ticket/:id', (req, res) => {
  const id = req.params.id;

  // get cookies from front end client
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  const findTicket = (user) => {
    // find the ticket and populate the host.hostId with host name
    Event.findOne({ _id: id })
      .then((data) => {
        if (data.host.hostId.toHexString() == user._id) {
          res.status(200).json({ data });
        } else {
          res.status(403).json({ error: true, message: 'Not a host' });
        }
      })
      .catch((err) =>
        res.status(404).json({ error: true, message: 'Ticket not found' })
      );
  };

  // // verify access token cookie first, only access token can be used to create a new ticket
  if (accessToken) {
    jwt.verify(accessToken, access_jwt_secret, (err, payLoad) => {
      if (err) {
        jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
          if (err) {
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            });
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
              .then((data) => {
                if (data.accountType !== 'Host') {
                  res
                    .status(401)
                    .json({ accountErr: true, message: 'You must be a host ' });
                } else {
                  // create an event
                  findTicket(data);
                }
              })
              .catch((err) =>
                res.status(401).json({
                  authError: true,
                  err,
                  message: 'Ensure you are logged in',
                })
              );
          }
        });
      } else {
        User.findOne({ _id: payLoad.id })
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host ' });
            } else {
              // create an event
              findTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  // no access token hence verify refresh token
  if (!accessToken && refreshToken) {
    jwt.verify(refreshToken, refresh_jwt_secret, (err, payLoad) => {
      if (err) {
        res
          .status(401)
          .json({ authError: true, err, message: 'Ensure you are logged in' });
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
          .then((data) => {
            if (data.accountType !== 'Host') {
              res
                .status(401)
                .json({ accountErr: true, message: 'You must be a host' });
            } else {
              // create an event
              findTicket(data);
            }
          })
          .catch((err) =>
            res.status(401).json({
              authError: true,
              err,
              message: 'Ensure you are logged in',
            })
          );
      }
    });
  }

  if (!accessToken && !refreshToken) {
    res
      .status(401)
      .json({ authError: true, err, message: 'Ensure you are logged in' });
  }
});

// functions that determine the how tickets behave based in the time of the event and frequency
// using libraries such:
// * scheduler: which manipulates the events database periodically
// * moment: which is used to set, read and manipulate the dates

// function runs every 12am: sets all events that their dates have passed to datePassed:true
schedule.scheduleJob('0 0 */7 * *', () => {
  Event.find(
    { repeat: 'Single', datePassed: false },
    {
      dateStamp: 1,
      _id: 1,
    }
  ).then((events) => {
    events.map((event) => {
      if (moment(event.dateStamp).isBefore(new Date())) {
        Event.findOneAndUpdate(
          { _id: event._id },
          { $set: { datePassed: true } }
        );
      }
    });
  });
});

// function runs every 1am: refreshes dates all events that their dates have passed but need to be repeated weekly
schedule.scheduleJob('0 1 * * *', () => {
  Event.find({ repeat: 'Weekly' }, { dateStamp: 1, _id: 1 }).then((events) => {
    events.map((event) => {
      if (moment(event.dateStamp).isBefore(new Date())) {
        Event.findOneAndUpdate(
          { _id: event._id },
          {
            $set: {
              dateStamp: moment(event.dateStamp, 'YYYY-MM-DD;HH:mm:ss')
                .add(1, 'W')
                .format('YYYY-MM-DD;HH:mm:ss'),
            },
          }
        );
      }
    });
  });
});

// function runs every 2am refreshes dates all events that their dates have passed but need to be repeated monthly
schedule.scheduleJob('0 2 * * *', () => {
  Event.find({ repeat: 'Monthly' }, { dateStamp: 1, _id: 1 }).then((events) => {
    events.map((event) => {
      if (moment(event.dateStamp).isBefore(new Date())) {
        Event.findOneAndUpdate(
          { _id: event._id },
          {
            $set: {
              dateStamp: moment(event.dateStamp, 'YYYY-MM-DD;HH:mm:ss')
                .add(1, 'M')
                .format('YYYY-MM-DD;HH:mm:ss'),
            },
          }
        );
      }
    });
  });
});

export default ticketRoute;
