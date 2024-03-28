var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
},
{timestamps: true});

const Usermodule = mongoose.model('User', UserSchema);

module.exports = Usermodule;