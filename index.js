const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json

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

app.post('/api/getGraphData', (req, res) => {
    const body = req.body; // No need to await
    console.log("Received body:", body);


    const brokerUrl = 'wss://amazing-logisticians.cloudmqtt.com:443'; // Public test broker

    // Replace with your MQTT client options
    const options = {
        clientId: 'qazwsx1234',
        username: "app_client",
        password: "uV7wNr5l110C",
        protocol: "wss",
        rejectUnauthorized: false,
    };

    // Create an MQTT client
    const client = mqtt.connect(brokerUrl, options);

    // Connect to the broker
    client.on('connect', () => {
        console.log('Connected to the MQTT broker');

        // Subscribe to a topic
        client.subscribe('request/wan/DemoSystem', (err) => {
            if (err) {
                console.log('subscribe topic error:', err);
            } else {

                console.log('Subscribed to sending topic');

                const message = JSON.stringify({
                    client: 'qazwsx1234',
                    transaction: 1,
                    url: "http://192.168.4.1/api/v1.0/keys/attributes",
                });

                // Publish a message to a topic
                client.publish('request/wan/DemoSystem', message);
            }



        });

        client.subscribe('response/qazwsx1234', (err) => {
            if (err) {
                console.log('subscribe topic error:', err);
            } else {

                console.log('Subscribed to recieved topic');

                client.on('message', (topic, message) => {
                    console.log(`Received message: ${message.toString()}`);
                    res.json({ message: JSON.parse(message.toString()) });
                    
                });
            }



        });
         
    


    });

  

    // Handle errors
    client.on('error', (error) => {
        console.error('Connection error:', error);
    });

    // Handle connection close
    client.on('close', () => {
        console.log('Connection to broker closed');
    });

   

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


