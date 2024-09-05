const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper');
const { EconTSchema, DgcSchema, EconTManIndusSchema } = require('./utils/model');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Daily task scheduled
// cron.schedule('0 0 * * *', async () => {
//    getAllDevice()
// });

const getAllDevice = async () => {
    const getDeviceResp = await fetch("https://config.iot.mrmprocom.com/php-admin/getAllDevices.php")
    const getAllDevice = await getDeviceResp.json();



    // const addcheck = [];

    // getAllDevice.data.map((item)=>{
    //     console.log("item",item)
    //     addcheck.push(item)
    // })

    // console.log("addcheck",addcheck)
    // console.log("addcheck:", typeof (addcheck))

    dailyTask(getAllDevice.data);
}

getAllDevice();

const dailyTask = async (AllDevices) => {
    console.log('Running the daily task');
    // console.log("all devices data i got in function", AllDevices)

    const AllDevicesQR = [];

    for (let singleDevice of AllDevices) {
        if (singleDevice.Status == "ACTIVE") {
            AllDevicesQR.push(singleDevice.deviceQRCode)
        }
    }
    console.log("Total Devices : ", AllDevicesQR)


    const parametersToFetch = [];
    // CYD6jGzpeS
    const DeviceName = "0T1ghpvfe7";
    let url = 'http://192.168.4.1/api/v1.0/keys/attributes';

    // Collecting All Parameters from which data should collected.
    const resp = await mqttConnect(DeviceName, url)

    if (resp == "no" || resp.data[0].fields[0].value == '') {
        console.log("Device is not Active")
    } else {
        console.log("Device is active")
        const DeviceType = resp.data[0].fields[0].value;


        console.log("resp", resp);
        console.log("DeviceType:", DeviceType)

        resp.data?.map((item) => {
            if (item.group == "Settings") {
                item.fields?.map((item2) => {

                    if (item2.name.includes('Measurement') && !item2.name.includes('Number')) {
                        if (!parametersToFetch.includes(item2.value)) {
                            parametersToFetch.push(item2.value)
                        }
                    } else {
                        console.log("No parameter found!!");
                    }
                })
            }
        })

        console.log("Parameters to fetch : ", parametersToFetch)

        if (parametersToFetch.length > 0) {
            for (let parameter of parametersToFetch) {
                console.log("parameter selected:", parameter)
                console.log("Device name: ", DeviceName)
                const step = 200;
                let offset = 0;

                let fetchDataFromDevice;
                let completedChunks = [];

                const fetchAllChunks = async () => {
                    let url = `http://192.168.4.1/api/v1.0/values/timeseries?key=${encodeURIComponent(parameter)}&limit=${step}&offset=${offset}`;

                    const resp2 = await mqttConnect(DeviceName, url);
                    console.log("resp2", resp2)
                    if (resp2.status == 200) {
                        fetchDataFromDevice = Object.values(resp2.data[0])[0];

                        fetchDataFromDevice.map((item) => completedChunks.push(item));

                        if (fetchDataFromDevice.length == 200) {
                            offset = offset + 200;
                            console.log("offset : ", offset)

                            await fetchAllChunks();
                        } else {
                            console.log("all data fetched");
                            console.log("completedChunks:", completedChunks)
                        }
                    }
                    else {
                        console.log(Object.values(resp2.data));
                    }
                }
                await fetchAllChunks();

                await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");
                if (mongoose.connection.readyState === 1) {
                    console.log('Database connection successfull');
                    console.log("Device Type:", DeviceType);

                    // ECON-MAN-INDUS ==> 0T1ghpvfe7
                    // ECON-T-312E  ==> DemoSystem
                    // DGC-2024  ==>  Testsys012

                    var singleschema;

                    if (DeviceType == 'ECON-T-312E') { singleschema = mongoose.model('EconT', EconTSchema); }
                    else if (DeviceType == 'DGC-2024') { singleschema = mongoose.model('Dgc', DgcSchema) }
                    else if (DeviceType == 'ECON-MAN-INDUS') { singleschema = mongoose.model('ManIndus', EconTManIndusSchema) }
                    else { console.log("No Schema Set") }

                    const existingItem = await singleschema.findOne({ DeviceName: DeviceName });
                    if (existingItem) {
                        console.log("existingItem:", existingItem);
                        const existingId = existingItem._id;
                        const existingDeviceName = existingItem.DeviceName;
                        const existingParameters = Object.keys(existingItem.Data);
                        console.log("existingId:", existingId);
                        console.log("existingDeviceName:", existingDeviceName);
                        console.log("existingParameters:", existingParameters);
                        console.log("NewData:", completedChunks);

                        const result = await singleschema.findOneAndUpdate(
                            { DeviceName: DeviceName },
                            { $set: { [`Data.${parameter}`]: completedChunks } },
                            { new: true, upsert: true }
                        );

                        console.log("Updated in database :", result);
                    } else {

                        const newItem = new singleschema({
                            DeviceName: DeviceName,
                            Data: {
                                [parameter]: completedChunks
                            }
                        });
                        const savedItem = await newItem.save();
                        console.log("New Item saved in database :", savedItem);
                    }

                } else {
                    console.log("Database not connected!!")
                }
            }
        } else {
            console.log("Recorded Parameters are 0")
        }


    }



}


// Routes

// app.get('/api/getTheaters', async (req, res) => {
//     try {
//         const theaters = await Theaters.find({}); // Fetch all theaters
//         res.json(theaters);
//     } catch (error) {
//         console.error('Error fetching theaters:', error);
//         res.status(500).json({ message: 'Error fetching theaters' });
//     }
// });

// app.post('/api/postDevice', (req, res) => {
//     try {
//         const deviceName = req.body; // Capture the device name from the request body
//         res.json({ message: deviceName });
//     } catch (error) {
//         console.error('Error posting device:', error);
//         res.status(500).json({ message: 'Error posting device' });
//     }
// });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

