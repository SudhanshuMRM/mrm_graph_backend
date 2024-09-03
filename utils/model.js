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
    DgcSchema: mongoose.model('Dgc', DgcSchema),
    EconTManIndusSchema: mongoose.model('ManIndus', EconTManIndusSchema),
};