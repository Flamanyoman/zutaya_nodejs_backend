import mongoose from 'mongoose';

const pageSchema = mongoose.Schema({
  title: { type: String, required: true },

  id: { type: String, unique: true },

  tags: { type: String, required: true },

  description: { type: String, required: true },

  header: { type: String },

  p: [{ h2: String, p: String, img: String }],

  timeStamp: { type: Date, default: Date.now },
});

const Page = mongoose.model('Page', pageSchema);

export default Page;
