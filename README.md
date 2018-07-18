# function-mnubo-js
Google IoT integration using Google Functions and SmartObjects client

Requirements
-------------
- The [Google Cloud SDK](https://cloud.google.com/sdk/)
- [NodeJS >=6.14.0](https://nodejs.org/en/blog/release/v6.14.0/)
- A [mnubo account](https://smartobjects.mnubo.com/login) for a sandbox and/or a production with API credentials.
- [mnubo SmartObjects client](https://github.com/mnubo/smartobjects-js-client).

Pre-requisites
-------------
- Install the [Google Cloud SDK](https://cloud.google.com/sdk/) according to the documentation.
- ***Optional*** - Install the [Google Cloud Functions Emulator](https://cloud.google.com/functions/docs/emulator) to test your function locally.
- Google Cloud Functions supports [Node JS 6.14.0](https://nodejs.org/en/blog/release/v6.14.0/). Make sure you have your IDE and Node JS version to support that.
- Setup the Google IoT environment. If you're starting, please see the [tutorial](https://cloud.google.com/iot/docs/device_manager_guide) for a basic setup. From there you will:
   - Setup a project
   - Enable billing
   - Enable the IoT API
   - Create a Pub/Sub topic.
   - Install the Google SDK components
   - Setup the device manager
   - Register two example devices.
- Using the registered devices, you will need to create your code to send telemetry. To create this function, we've modified the python script in the [example](https://cloud.google.com/iot/docs/protocol_bridge_guide) to send events.
- We've created a Google Storage bucket as described in the [Google Functions PubSub tutorial](https://cloud.google.com/functions/docs/tutorials/pubsub).
- You've registered on the mnubo SmartObject platform and got your sandbox credentials.
- On the mnubo SmartObject platform you've created an "Object" and an "Event" model in the SmartObjects platform [`IoT data modeler`](https://smartobjects.mnubo.com/apps/doc/datamodel.html). 
   - For this function to work as is, the object type `thing` must have the following properties:
      - `devicenumid` as TEXT
      - `deviceregistryid` as TEXT
      - `deviceregistrylocation` as TEXT
      - `projectid` as TEXT
   - For this function to work as is, the event type `thing_event` must be created and have your custom attributes defined in it.


Development
-------------
- Install the required dependencies
```
npm install
```
- Make your changes.
   - Modify the `clientId` constant with your mnubo SmartObject platform client ID.
   - Modify the `clientSecret` constant with your mnubo SmartObject platform client secret.
   - Make sure the `mnuboEnvironment` constant is set to the right environment.
   - The `mapIotObjectToMnuboObject` function will make information from the PubSub message attributes to the mnubo SmartObject platform object definition.
     - Unless modified, this function will create a single SmartObject owner with the Device Manager name.
     - The `deviceId` field of the PubSub event attributes will be used as the mnubo SmartObject platform device ID.
     - The SmartObject platform object creation timestamp and last update timestamp will be set to the timestamp when we process the first message.
     - Any other attributes present in the PubSub message attributes will be sent to the mnubo SmartObjects platform.
     - This function could be modified to enrich the mnubo SmartObject platform's object with data to be used for analytics. Things such as firmware version, model numbers and others can be sent.
   - The `mapIotEventToMnuboEvent` function will take a JSON object as input and will transform it to a mnubo SmartObject platform formatted event.
     - If there is a `eventType` attribute, it will set it as the event type in the event sent. Else it will use the `defaultEventType` constant as default.
     - If there is a `eventId` attribute, it will set it as the event ID in the event sent.
     - if there is a `timestamp` attribute, it will set the proper timestamp fields for the event.
     - if there is a `latitude` attribute, it will set the mnubo system fields for latitude.
     - if there is a `longitude` attribute, it will set the mnubo system fields for longitude.
     - Any fields in the `eventBlacklistedAttributes` list will be filtered out.
     - Every other attribute in the JSON object will be sent as is in the event. If you need any of these fields renamed, you will have to modify the function to do so.
- Ensure syntax is right.
```
npm run lint
```
- Ensure tests pass.
```
npm run test
```

Deployment
-------------
- When ready, deploy your function using the [Google Cloud SDK](https://cloud.google.com/sdk/). Within the project directory, run the following:
```
 gcloud beta functions deploy iotPubSub --stage-bucket <Google Storage Bucket Name> --trigger-topic <PubSub Topic Name>
```

Helpful documentation
-------------

- mnubo SmartObjects platform documentation (_**mnubo signup required**_): https://smartobjects.mnubo.com/apps/doc/gettingstarted.html
- Google Cloud IoT gcloud examples (_**private Beta signup required**_): https://cloud.google.com/iot/docs/gcloud_examples
