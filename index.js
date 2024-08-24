const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper')
const User = require('./utils/model')


const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

//daily call the function to fetch data

const dailyTask = () => { console.log("daily task called") }

cron.schedule('0 0 * * *', () => {
    dailyTask();
});



// Routes
app.get('/api/dummy', (req, res) => {
    res.json({ message: 'Dummy API Tested' });
    console.log("Dummy API Tested");
});

app.get('/api/getDummyData', async (req, res) => {
    try {
        // Connect to MongoDB
        const resp = await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=MRMGraphs");

        if (resp && resp.connection.readyState === 1) {
            console.log("Connected to MongoDB successfully");
            // Fetch data from the collection
            const users = await User.find({}); // This will fetch all documents in the 'users' collection

            res.json(users);
        } else {
            console.error("Failed to establish a connection to MongoDB");
            res.status(500).json({ message: 'Failed to connect to MongoDB' });
        }




    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Error fetching data' });
    } finally {
        // Close the connection after the query is complete
        mongoose.connection.close();
    }
});

app.post('/api/getGraphData', async (req, res) => {
    const url = "http://192.168.4.1/api/v1.0/keys/attributes"
    const body = req.body; // No need to await
    // const deviceID = body.device_id;
    // console.log("Device Id:", deviceID);
    const resp = await mqttConnect(body.device_id, url);
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



// mongoUserName - sudhanshu
// mongoPassword-hjPukpCKLzuSmw1Q
// mongo connection string - mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/?retryWrites=true&w=majority&appName=MRMGraphs
