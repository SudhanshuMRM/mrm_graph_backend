const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const mqttConnect = require('./utils/helper');
const { EconTSchema, DgcSchema, EconTManIndusSchema } = require('./utils/model');

const app = express();

// Middleware
app.use(cors());
// app.use(express.json());

// Daily task scheduled
process.env.TZ = 'Asia/Kolkata';
cron.schedule('13 12 * * *', async () => {
    await getAllDevice();
});

const getAllDevice = async () => {
    const getDeviceResp = await fetch("https://config.iot.mrmprocom.com/php-admin/getAllDevices.php")
    const getAllDevice = await getDeviceResp.json();
    dailyTask(getAllDevice.data);

}
const dailyTask = async (AllDevices) => {
    console.log('Running the daily task');
    const AllDevicesQR = [];

    for (let singleDevice of AllDevices) {
        if (singleDevice.Status == "ACTIVE") {
            AllDevicesQR.push(singleDevice.deviceQRCode)
        }
    }
    console.log("Total Devices : ", AllDevicesQR)

    for (let singleQR of AllDevicesQR) {

        const parametersToFetch = [];

        // ECON-MAN-INDUS ==> 0T1ghpvfe7
        // ECON-T-312E  ==> DemoSystem
        // DGC-2024  ==>  Testsys012

        const DeviceName = singleQR;

        console.log("Device selected: ", DeviceName);

        let url = 'http://192.168.4.1/api/v1.0/keys/attributes';


        // Collecting All Parameters from which data should collected.
        const resp = await mqttConnect(DeviceName, url);

        if (resp == "no" || resp.data[0].fields[0].value == '') {
            console.log("Device is not Active")
        } else {
            console.log("Device is active")
            const DeviceType = resp.data[0].fields[0].value;
            console.log("DeviceType is:", DeviceType)

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

            console.log("Total Active Parameters: ", parametersToFetch)

            if (parametersToFetch.length > 0) {
                for (let parameter of parametersToFetch) {
                    //  parameter = "Device Time"  //Testing'''''''''''''''''''''''''''''''''''''''''''''''
                    console.log("parameter selected:", parameter)

                    const step = 200;
                    let offset = await getOffset(DeviceName, parameter, DeviceType);

                    let fetchDataFromDevice;
                    let completedChunks = [];

                    const fetchAllChunks = async () => {
                        let url = `http://192.168.4.1/api/v1.0/values/timeseries?key=${encodeURIComponent(parameter)}&limit=${step}&offset=${offset}`;
                        console.log("url", url)

                        const resp2 = await mqttConnect(DeviceName, url);

                        if (resp2.status == 200) {
                            fetchDataFromDevice = Object.values(resp2.data[0])[0];

                            fetchDataFromDevice.map((item) => completedChunks.push(item));

                            if (fetchDataFromDevice.length == 200) {
                                offset = offset + 200;
                                await fetchAllChunks();
                            } else {
                                console.log("last URL: ", url);
                                console.log("last offset: ", offset);
                                console.log("last chunk: ", fetchDataFromDevice.length);
                                console.log("completedChunks:", completedChunks);
                            }
                        }
                        else {
                            // console.log(Object.values(resp2.data));
                            console.log("Something went wrong!!")
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
                            // const existingId = existingItem._id;
                            // const existingDeviceName = existingItem.DeviceName;
                            // const existingParameters = Object.keys(existingItem.Data);
                            // const existingParameterData = Object.values(existingItem.Data);
                            // console.log("existingParameterData:", existingParameterData);
                            // console.log("existingDeviceName:", existingDeviceName);


                            const PreviousData = existingItem?.get(`Data.${parameter}.totalData`); // Use get() to access the nested property safely
                            console.log("previous data", PreviousData)
                            const totalDatatoStore = [];
                            if (PreviousData != undefined) { PreviousData.map((item) => totalDatatoStore.push(item)); console.log("PreviousData length:", PreviousData.length); }

                            completedChunks.map((item) => totalDatatoStore.push(item))

                            console.log("NewData length:", completedChunks.length);
                            console.log("totalDatatoStore length :", totalDatatoStore.length);
                            console.log("PreviousData:", PreviousData);
                            console.log("NewData:", completedChunks);
                            console.log("totalDatatoStore:", totalDatatoStore);
                            const result = await singleschema.findOneAndUpdate(
                                { DeviceName: DeviceName },
                                { $set: { [`Data.${parameter}`]: { totalData: totalDatatoStore, offset: Number(offset) } } },
                                { new: true, upsert: true }
                            );
                            console.log("Updated in database :", result);
                        } else {
                            const newItem = new singleschema({
                                DeviceName: DeviceName,
                                Data: {
                                    [parameter]: { totalData: completedChunks, offset: Number(offset) }
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
                console.log("Recorded Parameters are zero!!")
            }
        }
    }







}

const getOffset = async (DeviceName, Parameter, DeviceType) => {
    console.log("parameter", Parameter)
    console.log("DeviceName", DeviceName)
    console.log("DeviceType", DeviceType)
    await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");
    if (mongoose.connection.readyState === 1) {

        if (DeviceType == 'ECON-T-312E') { singleschema = mongoose.model('EconT', EconTSchema); }
        else if (DeviceType == 'DGC-2024') { singleschema = mongoose.model('Dgc', DgcSchema) }
        else if (DeviceType == 'ECON-MAN-INDUS') { singleschema = mongoose.model('ManIndus', EconTManIndusSchema) }
        else { console.log("No Schema Set"); }

        const existingItem = await singleschema.findOne({ DeviceName: DeviceName });
        console.log("existing in offset:", existingItem)
        if (existingItem) {
            const offsetKey = `Data.${Parameter}.offset`; // Dynamically construct the path
            console.log("offsetKey:", offsetKey)
            const offsetValue = existingItem?.get(offsetKey); // Use get() to access the nested property safely
            console.log("offsetValue : ", offsetValue)
            if (typeof offsetValue == Number) {
                console.log("i got the number")
                return offsetValue;
            } else {
                console.log("type of offset", typeof offsetValue)
                return 0;
            }

        } else {
            return 0;
        }

    }

}

// Routes
app.get('/api/getAllGraphData', async (req, res) => {
    try {
        await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");

        if (mongoose.connection.readyState === 1) {
            const Econt = mongoose.model('EconT', EconTSchema); // Removed 'await' here
            const ManIndus = mongoose.model('ManIndus', EconTManIndusSchema);
            const DGC = mongoose.model('Dgc', DgcSchema);

            try {

                const EconData = await Econt.find({});
                const ManIndusData = await ManIndus.find({});
                const DgcData = await DGC.find({});

                res.status(200).json([{
                    EconData: EconData,
                    ManIndusData: ManIndusData,
                    DgcData: DgcData
                }]);
            } catch (error) {
                console.error("Error fetching data:", error);
                res.status(500).json({ message: "An error occurred while fetching data." });
            }
        }
        else {
            res.status(400).json({ message: "Database not connected!!" })
        }


    } catch (error) {
        console.error('Error fetching Graph Data:', error);
        res.status(500).json({ message: 'Error fetching Graph Data' });
    }
});

app.get('/api/getSingheGraphData/:deviceID', async (req, res) => {

    const deviceID = req.params.deviceID;

    if (!deviceID) {
        res.status(400).send('Device ID is required');
    } else {
        try {
            await mongoose.connect("mongodb+srv://sudhanshu:hjPukpCKLzuSmw1Q@mrmgraphs.rnumk.mongodb.net/MRM_graph_data?retryWrites=true&w=majority&appName=MRMGraphs");

            if (mongoose.connection.readyState === 1) {
                const Econt = mongoose.model('EconT', EconTSchema);
                const ManIndus = mongoose.model('ManIndus', EconTManIndusSchema);
                const DGC = mongoose.model('Dgc', DgcSchema);

                try {
                    const EconData = await Econt.find({ DeviceName: deviceID });
                    if (EconData.length != 0) {
                        res.json({
                            message: "Device found!",
                            status: 200,
                            DeviceType: "Econt",
                            Data: EconData
                        })
                    } else {
                        const ManIndusData = await ManIndus.find({ DeviceName: deviceID });
                        if (ManIndusData.length != 0) {
                            res.json({
                                message: "Device found!",
                                status: 200,
                                DeviceType: "ManIndus",
                                Data: ManIndusData
                            })
                        } else {
                            const DgcData = await DGC.find({ DeviceName: deviceID });
                            if (DgcData.length != 0) {
                                res.json({
                                    message: "Device found!",
                                    status: 200,
                                    DeviceType: "Dgc",
                                    Data: DgcData
                                })
                            } else {
                                res.json({
                                    status: 200,
                                    message: "No Device Found!!"
                                })
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    res.status(500).json({ message: "An error occurred while fetching data." });
                }
            }
            else {
                res.status(400).json({ message: "Database not connected!!" })
            }


        } catch (error) {
            console.error('Error fetching Graph Data:', error);
            res.status(500).json({ message: 'Error fetching Graph Data' });
        }
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

