const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper');
const { EconTSchema, Theaters, User } = require('./utils/model');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

// // Connect to MongoDB once when the server starts
// mongoose.connect(
//     "mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs",
//     { useNewUrlParser: true, useUnifiedTopology: true }
// ).then(() => {
//     console.log("Connected to MongoDB successfully");
// }).catch(err => {
//     console.error("Failed to connect to MongoDB", err);
// });

// Daily task scheduled
cron.schedule('0 0 * * *', async () => {
    dailyTask()
});


const dailyTask = async () => {
    const parametersToFetch = [];
    console.log('Running the daily task');
    const DeviceName = "DemoSystem";
    let DeviceType = null;
    let url = 'http://192.168.4.1/api/v1.0/keys/attributes';
    // Collecting All Parameters from which data should collected.
    const resp = await mqttConnect(DeviceName, url)
    DeviceType = resp.data[0].fields[0].value;
    resp.data?.map((item) => {
        if (item.group == "Settings") {
            item.fields?.map((item2) => {
                if (item2.name == "Recorded Measurement 1") {
                    item2.format.option?.map((item3) => {
                        parametersToFetch.push(item3)
                    })
                } else {
                    console.log("No Measurements Selected!!")
                }
            })
        }
    })

    for (const item of parametersToFetch) {
        try {
            const step = 200;
            let offset = 0;
            const url = `http://192.168.4.1/api/v1.0/values/timeseries?key=${encodeURIComponent(item)}&limit=${step}&offset=${offset}`;
            const resp = await mqttConnect(DeviceName, url); // Assuming mqttConnect is properly handling connection and disconnection

            if (resp.status == 200) {
             
                mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");
                if (mongoose.connection.readyState === 1) {
                    console.log('MongoDB Connected');
                    const Item = mongoose.model('EconT', EconTSchema);

                    const existingItem = await Item.findOne({ DeviceName: DeviceName });
                    if (existingItem) {
                        const PresentParamterList = Object.keys(existingItem.Data);
                        console.log("PresentParamterList", PresentParamterList);

                        PresentParamterList.map((itema)=>{
                            if(itema==item){
                                console.log("itema",itema);
                            }
                        })

                        // if(Object.keys(existingItem.Data).includes(item)){
                        //     console.log("Parameter Present");
                        // }else{
                        //     console.log("Parameter not present");
                        // }


                    }
                    else {
                        const newItem = new Item({
                            DeviceName: DeviceName,
                            Data: {
                                [item]: Object.values(resp.data[0])[0]
                            }
                        });
                        const savedItem = await newItem.save();
                        console.log("savedItem", savedItem);
                    }



                } else {
                    console.log('MongoDB not connected.');
                }

            } else if (resp.status == 404) {
                console.log("Error: Broker response 404");

            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
}

dailyTask();

// Routes
app.get('/api/dummy', (req, res) => {
    res.json({ message: 'Dummy API Tested' });
    console.log("Dummy API Tested");
});

app.get('/api/getUsers', async (req, res) => {
    try {
        const users = await User.find({}); // Fetch all users
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

app.get('/api/getTheaters', async (req, res) => {
    try {
        const theaters = await Theaters.find({}); // Fetch all theaters
        res.json(theaters);
    } catch (error) {
        console.error('Error fetching theaters:', error);
        res.status(500).json({ message: 'Error fetching theaters' });
    }
});

app.post('/api/getGraphData', async (req, res) => {
    try {
        const { device_id } = req.body; // Destructure device_id from the request body
        if (!device_id) {
            return res.status(400).json({ message: "device_id is required" });
        }
        const url = "http://192.168.4.1/api/v1.0/keys/attributes";
        const resp = await mqttConnect(device_id, url);
        res.json({ message: resp });
    } catch (error) {
        console.error('Error fetching graph data:', error);
        res.status(500).json({ message: 'Error fetching graph data' });
    }
});

app.post('/api/postDevice', (req, res) => {
    try {
        const deviceName = req.body; // Capture the device name from the request body
        res.json({ message: deviceName });
    } catch (error) {
        console.error('Error posting device:', error);
        res.status(500).json({ message: 'Error posting device' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
