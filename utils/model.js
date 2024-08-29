const mongoose = require('mongoose');

const EconTSchema = new mongoose.Schema({
    DeviceName:String,
    Data:Object,
})

const TheatersSchema = new mongoose.Schema({
    theaterId: Number,
    location: Object,
    
});

module.exports = {
    EconT: mongoose.model('EconT', EconTSchema),
    Theaters: mongoose.model('Theaters', TheatersSchema),
};