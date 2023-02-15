import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    socialId: { type: String, required: true, unique: true },

    socialMedia: { type: String, required: true, default: 'Twitter' },

    name: { type: String, required: true },

    profilePic: { type: String },

    email: { type: String, unique: true },

    accountType: { type: String, required: true, default: 'Guest' },

    accountNumber: { type: Number },

    bank: { type: String },

    eventsAttended: { type: [mongoose.Types.ObjectId], ref: 'Event' },

    eventsHosted: { type: [mongoose.Types.ObjectId], ref: 'Event' },

    income: {
      expected: { type: Number, default: 0 },
      realized: { type: Number, default: 0 },
    },

    expectedGuests: { type: Number },

    guestList: { type: [mongoose.Types.ObjectId], ref: 'User' },

    totalAvailableTickets: { type: Number },

    pendingEvents: [
      { eventName: { type: String } },
      { qr: { type: Number } },
      { timeStamp: { type: Date } },
    ],

    refreshToken: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
