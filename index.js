/**
 * Copyright 2017, mnubo, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const _ = require('lodash');

/**
 * Timestamp standardization function for objects and events.
 *
 * @param {Object} ts The timestamp to parse.
 *
 * @return {String} A ISO-formatted string.
 */
function standardizeTimestamp(ts) {
    return new Date(ts).toISOString();
}
exports.standardizeTimestamp = standardizeTimestamp;

/**
 * Mapping function for IoT events to mnubo events
 *
 * @param {Object} attrs The object attributes data structure.
 * @param {String} defaultOwnerId Owner ID string
 * @param {String} defaultObjectType The default object type string.
 * @param {Array} blacklist An array of blacklisted attributes.
 *
 * @return {Object} The mnubo-formatted object data
 */
function mapIotObjectToMnuboObject(attrs, defaultOwnerId,
                                   defaultObjectType, blacklist) {
    let mnuboObject = {x_owner: {}};
    let seenKeys = [];

    /* Add well-known mnubo object fields. */
    if (_.has(attrs, 'deviceId')) {
        mnuboObject.x_device_id = attrs.deviceId;
        seenKeys.push('deviceId');
    }

    /* The following could be provided dynamically in the event data. */
    mnuboObject.x_object_type = defaultObjectType;
    mnuboObject.x_owner.username = defaultOwnerId;

    /* Unless the object provides a timestamp in the event, generate one */
    const ts = new Date().toISOString();
    mnuboObject.x_timestamp = ts;
    mnuboObject.x_last_update_timestamp = ts;

    /* Uncomment the following block when providing lat/long.
     *
     * if (_.has(attrs, 'latitude')) {
     *     mnuboObject.x_registration_latitude = attrs.latitude;
     *     seenKeys.push('latitude');
     * }
     *
     * if (_.has(attrs, 'longitude')) {
     *     mnuboObject.x_registration_longitude = attrs.longitude;
     *     seenKeys.push('longitude');
     * }
     */

    /* Any other keys are considered custom object attributes. */
    _.forOwn(attrs, function(value, k) {
        if (_.indexOf(seenKeys, k) === -1 && _.indexOf(blacklist, k) === -1) {
            mnuboObject[k] = attrs[k];
        }
    });

    return mnuboObject;
}
exports.mapIotObjectToMnuboObject = mapIotObjectToMnuboObject;

/**
 * Defining a type for ideal event data object
 *
 * @typedef {Object} EventData
 * @property {String} eventType
 * @property {String} eventId
 * @property {String} timestamp
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * Mapping function for IoT events to mnubo events
 *
 * @param {EventData} eventData The event data structure.
 * @param {string} defaultEventType The event type string.
 * @param {string} deviceId The event type string.
 * @param {Array} blacklist An array of blacklisted attributes.
 *
 * @return {Object} The mnubo-formatted event data
 */
function mapIotEventToMnuboEvent(eventData, defaultEventType,
                                 deviceId, blacklist) {
    let mnuboEvent = {x_object: {}};
    let seenKeys = [];

    /* Add well-known mnubo event fields. */
    mnuboEvent.x_object.x_device_id = deviceId;

    if (_.has(eventData, 'eventType')) {
        mnuboEvent.x_event_type = eventData.eventType;
        seenKeys.push('eventType');
    } else {
        mnuboEvent.x_event_type = defaultEventType;
    }

    if (_.has(eventData, 'eventId')) {
        mnuboEvent.event_id = eventData.eventId;
        seenKeys.push('eventId');
    }

    if (_.has(eventData, 'timestamp')) {
        mnuboEvent.x_timestamp = standardizeTimestamp(
            eventData.timestamp
        );
        seenKeys.push('timestamp');
    }

    if (_.has(eventData, 'latitude')) {
        mnuboEvent.x_latitude = eventData.latitude;
        seenKeys.push('latitude');
    }

    if (_.has(eventData, 'longitude')) {
        mnuboEvent.x_longitude = eventData.longitude;
        seenKeys.push('longitude');
    }

    /* Any other keys are considered custom event time-series and attributes. */
    _.forOwn(eventData, function(value, k) {
        if (_.indexOf(seenKeys, k) === -1 && _.indexOf(blacklist, k) === -1) {
            mnuboEvent[k] = eventData[k];
        }
    });

    return mnuboEvent;
}
exports.mapIotEventToMnuboEvent = mapIotEventToMnuboEvent;

/**
 * Defining types for received event from PubSub.
 *
 * @typedef {Object} PubSubEvent
 * @property {String} data
 * @property {Object} attributes
 * @property {String} attributes.deviceId
 * @property {String} attributes.deviceNumId
 * @property {String} attributes.deviceRegistryId
 * @property {String} attributes.deviceRegistryLocation
 * @property {String} attributes.projectId
 * @property {String} attributes.subFolder
 */

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 *
 * @param {PubSubEvent} event The Cloud Functions event.
 * @param {function} callback function.
 *
 */
exports.iotPubSub = function iotPubSub(event, callback) {
    const pubsubMessage = event.data;
    let eventData = undefined;

    if (pubsubMessage.data) {
        const buf = Buffer.from(pubsubMessage.data, 'base64');
        eventData = JSON.parse(buf.toString());
    }

    if (eventData === undefined) {
        console.log(`Cannot decode event data.`);
        console.log('PubSub Message was: ' + JSON.stringify(pubsubMessage));
        callback(1);
    }

    /* Use the mnubo SDK */
    const mnubo = require('mnubo-sdk');
    const uuid = require('uuid');

    /* Setup mnubo SDK connection-related variables. */
    const clientId = '__CHANGE_ME__';
    const clientSecret = '__CHANGE_ME__';
    const mnuboEnvironment = 'sandbox'; // can be 'sandbox' or 'prod'

    /* Implementing the object owner. */
    const defaultOwnerUsername = pubsubMessage.attributes.deviceRegistryId;
    const defaultOwnerPassword = uuid.v4();

    /* Object-related variables */
    const defaultObjectType = 'thing';
    const deviceId = pubsubMessage.attributes.deviceId;
    const objectBlacklistedAttributes = [];

    /* Event-related variables */
    const defaultEventType = 'thing_event';
    const eventBlacklistedAttributes = [];

    /* Create a new client with client id and client secret. */
    const client = new mnubo.Client({
        id: clientId,
        secret: clientSecret,
        env: mnuboEnvironment,
    });

    /* Other variables */
    const sequence = Promise.resolve();

    if (clientId === '__CHANGE_ME__' || clientSecret === '__CHANGE_ME__') {
        console.log('Please make sure you put your credentials in ' +
            'clientId and clientSecret');
        callback(1);
    }

    /* Main sequence. We have to process sequentially the following calls. */
    sequence
        .then(function() {
            // Step 1: Check if the owner exists.
            return client.owners.exists(defaultOwnerUsername);
        })
        .then(function(response) {
            // Step 2: If the owner does NOT exists.
            if (response[defaultOwnerUsername] === false) {
                // Step 2a: Create it.
                console.log(`Owner [ ${defaultOwnerUsername} ] ` +
                            `does not exist. Creating it.`);
                return client.owners
                    .create({
                        username: defaultOwnerUsername,
                        x_password: defaultOwnerPassword,
                    });
            } else {
                // Step 2b: Continue.
                console.log(`Owner [ ${defaultOwnerUsername} ] exists.`);
                return sequence;
            }
        })
        .then(function() {
            // Step 3: Check if the object exist.
            console.log(`Checking if object [ ${deviceId} ] exist.`);
            return client.objects.exists(deviceId);
        })
        .then(function(response) {
            // Step 4: If the object exists.
            if (response[deviceId] === false) {
                // Step 4a: Create the object.
                console.log(`Creating or updating object [ ${deviceId} ] .`);
                const mnuboObject = mapIotObjectToMnuboObject(
                    pubsubMessage.attributes,
                    defaultOwnerUsername,
                    defaultObjectType,
                    objectBlacklistedAttributes
                );
                return client.objects.createUpdate([mnuboObject]);
            } else {
                // Step 4b: Continue.
                console.log(`Object [ ${deviceId} ] exists.`);
                return sequence;
            }
        })
        .then(function() {
            // Step 5: Send the event.
            console.log(`Sending event for object [ ${deviceId} ].`);
            const mnuboEvent = mapIotEventToMnuboEvent(
                eventData,
                defaultEventType,
                deviceId,
                eventBlacklistedAttributes
            );
            return client.events.send([mnuboEvent]);
        })
        .then(function() {
            // Step 6: We're done, use the callback.
            console.log(`Event posted for object [ ${deviceId} ].`);
            callback();
        })
        .catch(function(error) {
            // Catch-all: If any error, log the error message with the
            // pubsub message data for analysis.
            console.log(`Could NOT message for object [ ${deviceId} ]:` +
                        ` ${error}`);
            console.log('PubSub Message was: ' + JSON.stringify(pubsubMessage));
            callback(1);
        });
};
