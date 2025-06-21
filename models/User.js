const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
  name: String,
  lat: Number,
  lon: Number,
  address: String,
  description: String
});

const LocationSchema = new mongoose.Schema({
  name: String,
  coordinates: {
    type: [Number], // [lon, lat]
    default: undefined
  }
});

const UserSchema = new mongoose.Schema({
  name: String,
  phone: String,
  password: String,
  nationality: String,
  currentLocation: LocationSchema,
  destinationLocation: LocationSchema,
  favorites: [FavoriteSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
