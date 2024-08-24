const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper')


const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

//daily call the function to fetch data

const dailyTask = () =>{console.log("daily task called")}

// cron.schedule('0 0 * * *', () => {
//     dailyTask();
// });

// cron.schedule('55 9 * * *', () => {
//     dailyTask();
// });


// Routes
app.get('/api/dummy', (req, res) => {
    res.json({ message: 'Dummy API Tested' });
    console.log("Dummy API Tested");
});

app.post('/api/dummy2', (req, res) => {
    const body = req.body; // No need to await
    console.log("Received body:", body);
 

    res.json({ message: body });

});

app.post('/api/getGraphData',async(req, res) => {
    const url = "http://192.168.4.1/api/v1.0/keys/attributes"
    const body = req.body; // No need to await
    // const deviceID = body.device_id;
    // console.log("Device Id:", deviceID);
    const resp = await  mqttConnect(body.device_id,url);
    res.json({ message: resp });
});






















// Server is live on this port
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});


