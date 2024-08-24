const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String
})

const TheatersSchema = new mongoose.Schema({
    theaterId: Number,
    location: Object,
    
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Theaters: mongoose.model('Theaters', TheatersSchema),
};