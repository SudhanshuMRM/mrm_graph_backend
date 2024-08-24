const mqtt = require('mqtt');

function mqttConnect(deviceID,url) {
    return new Promise((resolve, reject) => {
        const brokerUrl = 'wss://amazing-logisticians.cloudmqtt.com:443'; // Public test broker
        const clientRandomId = 'qazwsx1234';

        // MQTT client options
        const options = {
            clientId: clientRandomId,
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

            // Subscribe to the sending topic
            client.subscribe(`request/wan/${deviceID}`, (err) => {
                if (err) {
                    console.log('Subscribe topic error:', err);
                    reject(err);
                } else {
                    console.log('Subscribed to sending topic');

                    const message = JSON.stringify({
                        client: clientRandomId,
                        transaction: 1,
                        url: url,
                    });

                    // Publish a message to a topic
                    client.publish(`request/wan/${deviceID}`, message);
                }
            });

            // Subscribe to the response topic
            client.subscribe(`response/${clientRandomId}`, (err) => {
                if (err) {
                    console.log('Subscribe topic error:', err);
                    reject(err);
                } else {
                    console.log('Subscribed to received topic');
                    client.on('message', (topic, message) => {
                        // console.log(`Received message: ${message.toString()}`);
                        const resp = JSON.parse(message.toString());
                        resolve(resp); // Resolve the promise with the response
                    });
                }
            });
        });

        // Handle errors
        client.on('error', (error) => {
            console.error('Connection error:', error);
            reject(error);
        });
    });
}

module.exports = mqttConnect;
