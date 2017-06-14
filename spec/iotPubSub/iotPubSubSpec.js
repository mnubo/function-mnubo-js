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

describe('iotPubSub', function() {
    const iotPubSub = require('../../index');
    const debugMessage = {
        'data': 'eyJldmVudElkIjogIjNkMzg3OTc5LTM1YTAtNDMyYi1iMjQwLT' +
        'hlMGQ2ZGM5NGI2MSIsICJldmVudFR5cGUiOiAidGhpbmdfZXZl' +
        'bnQiLCAidGVtcGVyYXR1cmUiOiAzNC40MX0=',
        'attributes': {
            'deviceId': 'my-rs256-device',
            'deviceNumId': '2789462597777887',
            'deviceRegistryId': 'my-iot-registry',
            'deviceRegistryLocation': 'us-central1',
            'projectId': 'iot-integration',
            'subFolder': '',
        },
        '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage',
    };

    it('should map a debug message to an object', function() {
        const defaultOwner = 'owner-1';
        const defaultObjectType = 'thing';
        const blacklist = [];
        const mnuboObject = iotPubSub.mapIotObjectToMnuboObject(
            debugMessage.attributes,
            defaultOwner,
            defaultObjectType,
            blacklist
        );
        expect(mnuboObject.x_device_id)
            .toEqual(debugMessage.attributes.deviceId);

        expect(mnuboObject.x_object_type).toEqual(defaultObjectType);
        expect(mnuboObject.x_owner.username).toEqual(defaultOwner);
        expect(mnuboObject.x_owner.username).toEqual(defaultOwner);
        expect(mnuboObject.deviceNumId)
            .toEqual(debugMessage.attributes.deviceNumId);
        expect(mnuboObject.deviceRegistryId)
            .toEqual(debugMessage.attributes.deviceRegistryId);
        expect(mnuboObject.deviceRegistryLocation)
            .toEqual(debugMessage.attributes.deviceRegistryLocation);
        expect(mnuboObject.projectId)
            .toEqual(debugMessage.attributes.projectId);
        expect(mnuboObject.subFolder)
            .toEqual(debugMessage.attributes.subFolder);
    });

    it('should map a debug message to an event', function() {
        const buf = Buffer.from(debugMessage.data, 'base64');
        const eventData = JSON.parse(buf.toString());
        const defaultEventType = 'thing_event';
        const deviceId = debugMessage.attributes.deviceId;
        const blacklist = [];
        const mnuboEvent = iotPubSub.mapIotEventToMnuboEvent(
            eventData,
            defaultEventType,
            deviceId,
            blacklist
        );
        expect(mnuboEvent.x_object.x_device_id)
            .toEqual(debugMessage.attributes.deviceId);

        expect(mnuboEvent.x_event_type).toEqual(defaultEventType);
        expect(mnuboEvent.event_id).toEqual(eventData.eventId);
        expect(mnuboEvent.temperature).toEqual(eventData.temperature);
    });
});
