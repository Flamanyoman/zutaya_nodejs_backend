import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      unique: true,
    },

    location: {
      type: String,
      required: true,
    },

    dateStamp: {
      type: Date,
      required: true,
    },

    repeat: {
      type: String,
      required: true,
    },

    datePassed: {
      type: Boolean,
      default: false,
      required: true,
    },

    timeStamp: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    eventType: {
      type: String,
      required: true,
    },

    img: {
      type: { type: String, required: true },
      data: { type: Buffer, required: true },
    },

    accountNumber: {
      type: Number,
      required: true,
    },

    bank: {
      type: String,
      required: true,
    },

    org: {
      orgName: { type: String, required: true },
      orgEmail: { type: String, required: true },
    },

    hype: {
      type: String,
      required: true,
    },

    host: {
      hostSocial: {
        type: String,
        required: true,
      },

      hostName: {
        type: String,
        required: true,
      },

      hostId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'User',
      },
    },

    tickets: { required: true, type: Array },

    guests: [
      { name: { type: String } },
      { secret: { type: String } },
      { ticket: [{ name: { type: String } }, { number: { type: Number } }] },
    ],

    totalAvailableTickets: { type: Number, required: true, default: 0 },

    totalSoldTickets: { type: Number, required: true, default: 0 },

    expectedGuests: { type: Number, required: false },

    income: { expected: { type: Number }, realized: { type: Number } },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
