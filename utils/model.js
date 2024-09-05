const mongoose = require('mongoose');

const EconTSchema = new mongoose.Schema({
    DeviceName:String,
    Data:Object,
})

const DgcSchema = new mongoose.Schema({
    DeviceName:String,
    Data:Object,
})

const EconTManIndusSchema = new mongoose.Schema({
    DeviceName:String,
    Data:Object,
})

module.exports = {
    EconT: mongoose.model('EconT', EconTSchema),
    Dgc: mongoose.model('Dgc', DgcSchema),
    EconTManIndus: mongoose.model('ManIndus', EconTManIndusSchema),
};