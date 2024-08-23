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

    
    const brokerUrl = 'amazing-logisticians.cloudmqtt.com'; // Public test broker

    // Replace with your MQTT client options
    const options = {
        clientId: 'qazwsx1234',
        username: 'app_client', // if needed
        password: 'uV7wNr5l110C', // if needed
        protocol: 'mqtts', // Use 'mqtts' for SSL/TLS connection
        port: 8883, // Port for SSL/TLS connection, 8883 is standard for secure MQTT
        rejectUnauthorized: false, // If you have a self-signed certificate
       // ca: fs.readFileSync('path/to/ca.crt'), // CA certificate for SSL/TLS
      };

    // Create an MQTT client
    const client = mqtt.connect(brokerUrl, options);

    // Connect to the broker
    client.on('connect', () => {
        console.log('Connected to the MQTT broker');

        // Subscribe to a topic
        client.subscribe('test/topic', (err) => {
            if (!err) {
                console.log('Subscribed to the topic');
            }
        });

        // Publish a message to a topic
        client.publish('test/topic', 'Hello MQTT');
    });

    // Handle incoming messages
    client.on('message', (topic, message) => {
        console.log(`Received message: ${message.toString()} from topic: ${topic}`);
    });

    // Handle errors
    client.on('error', (error) => {
        console.error('Connection error:', error);
    });

    // Handle connection close
    client.on('close', () => {
        console.log('Connection to broker closed');
    });

    res.json({ message: body });

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


