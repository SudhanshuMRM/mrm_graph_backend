const mqtt = require('mqtt');

function mqttConnect(deviceID, url) {
  return new Promise((resolve, reject) => {
    const brokerUrl = 'wss://amazing-logisticians.cloudmqtt.com:443'; // Public test broker
    const clientRandomId = generateRandomString(10);

    // MQTT client options
    const options = {
      clientId: clientRandomId,
      username: 'app_client',
      password: 'uV7wNr5l110C',
      protocol: 'wss',
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
          client.end(); // Disconnect the client on error
          reject(err);
        } else {
          // console.log('Subscribed to sending topic');

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
          client.end(); // Disconnect the client on error
          reject(err);
        } else {
          console.log('Subscribed to received topic');

          const timeout = setTimeout(() => {
            console.log('No message received within 10 seconds');
            resolve("no"); // Resolve the promise with "no" if timeout occurs
            client.end(); // Disconnect the client
          }, 10000); // 10 seconds timeout


          client.on('message', (topic, message) => {
            clearTimeout(timeout);
            const resp = JSON.parse(message.toString());
            resolve(resp); // Resolve the promise with the response
            client.end(); // Disconnect the client after receiving the message
          });
        }
      });
    });

    // Handle errors
    client.on('error', (error) => {
      console.error('Connection error:', error);
      client.end(); // Ensure the client is disconnected on error
      reject(error);
    });

    // Handle disconnection
    client.on('close', () => {
      console.log('Disconnected from the MQTT broker');
    });
  });
}

function generateRandomString(length) {
    const CHARACTERS =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = CHARACTERS.length;
    let randomString = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      const randomChar = CHARACTERS.charAt(randomIndex);
      randomString += randomChar;
    }

    return randomString;
  }
  

module.exports = mqttConnect;
