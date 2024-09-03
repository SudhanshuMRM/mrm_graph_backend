const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper');
const { EconTSchema, DgcSchema, EconTManIndusSchema } = require('./utils/model');

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
// cron.schedule('0 0 * * *', async () => {
//     dailyTask()
// });

const getAllDevice = async() => {
    const getDeviceResp = await fetch("https://config.iot.mrmprocom.com/php-admin/getAllDevices.php")
    const getAllDevice = await getDeviceResp.json();

    console.log("All Devices", getAllDevice.data[0])

    const AllDeviceQR = [];

    getAllDevice.data.map((item)=>{
        if(item.Status=="ACTIVE"){
            AllDeviceQR.push(item.deviceQRCode);
        }
    })

    console.log("AllDeviceQR",AllDeviceQR)

}
getAllDevice();


// const dailyTask = async () => {




//     const parametersToFetch = [];
//     console.log('Running the daily task');
//     const DeviceName = "Testsys012";

//     let url = 'http://192.168.4.1/api/v1.0/keys/attributes';

//     // Collecting All Parameters from which data should collected.
//     const resp = await mqttConnect(DeviceName, url)
//     const DeviceType = resp.data[0].fields[0].value;
//     // console.log("resp all attributes",resp)
//     resp.data?.map((item) => {
//         if (item.group == "Settings") {
//             item.fields?.map((item2) => {
//                 // console.log("item2",item2)
//                 if (item2.name.includes('Measurement') && !item2.name.includes('Number')) {
//                     // console.log("item2.name", item2.name)
//                     parametersToFetch.push(item2.value)
//                 } else {
//                     console.log("wo parameter nai mila jo record karna hai")
//                 }
//             })
//         }
//     })

//     // console.log("parametersToFetch", parametersToFetch)

//     for (let parameter of parametersToFetch) {
//         console.log("parameter selected:", parameter)
//         const step = 200;
//         let offset = 0;
//         let fetchDataFromDevice;
//         let completedChunks = [];

//         const fetchAllChunks = async () => {
//             let url = `http://192.168.4.1/api/v1.0/values/timeseries?key=${encodeURIComponent(parameter)}&limit=${step}&offset=${offset}`;

//             const resp2 = await mqttConnect(DeviceName, url);
//             console.log("resp2", resp2)
//             if (resp2.status == 200) {
//                 fetchDataFromDevice = Object.values(resp2.data[0])[0];

//                 fetchDataFromDevice.map((item) => completedChunks.push(item));

//                 if (fetchDataFromDevice.length == 200) {
//                     offset = offset + 200;
//                     console.log("offset:", offset)

//                     await fetchAllChunks();
//                 } else {
//                     console.log("all data fetched");
//                     console.log("completedChunks:", completedChunks)
//                 }
//             }
//             else {
//                 console.log(Object.values(resp2.data));
//             }
//         }
//         await fetchAllChunks();

//         await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");
//         if (mongoose.connection.readyState === 1) {
//             console.log('Database connection successfull');
//             const Item = mongoose.model('EconT', EconTSchema);
//             const existingItem = await Item.findOne({ DeviceName: DeviceName });
//             if (existingItem) {
//                 console.log("existingItem:", existingItem);
//                 const existingId = existingItem._id;
//                 const existingDeviceName = existingItem.DeviceName;
//                 const existingParameters = Object.keys(existingItem.Data);


//                 console.log("existingId:", existingId);
//                 console.log("existingDeviceName:", existingDeviceName);
//                 console.log("existingParameters:", existingParameters);

//                 console.log("NewData:", completedChunks);


//                 const result = await Item.findOneAndUpdate(
//                     { DeviceName: DeviceName },
//                     { $set: { [`Data.${parameter}`]: completedChunks } },
//                     { new: true, upsert: true }
//                 );

//                 console.log("Updated in database :", result);
//             } else {

//                 const newItem = new Item({
//                     DeviceName: DeviceName,
//                     Data: {
//                         [parameter]: completedChunks
//                     }
//                 });
//                 const savedItem = await newItem.save();
//                 console.log("New Item saved in database :", savedItem);
//             }

//         } else {
//             console.log("Database not connected!!")
//         }
//     }
// }
// dailyTask();

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

