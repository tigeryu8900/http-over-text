# http-over-text

A library for creating http/https proxies that routes traffic through messaging services.

## Installation

```shell
npm install http-over-text
```

## Usage

For starting the example servers and clients, build first with `npm run build` and then run one of
the `npm run client:*` and `npm run server:*` commands.

### Data Handlers

The main parts of this package are `createIncomingDataHandler` and `createOutgoingDataHandler`.

`createIncomingDataHandler` is for creating a handler for incoming data (a.k.a. client), and
`createOutgoingDataHandler` is for creating a handler for outgoing data (a.k.a. server).

Here's a simple example of a proxy that uses `MessageChannel` to connect the two:

```typescript
import {
  createIncomingDataHandler,
  createOutgoingDataHandler,
  deserializeIncomingData,
  deserializeOutgoingData
} from "http-over-text";

const {port1, port2} = new MessageChannel();
const incomingDataHandler = createIncomingDataHandler(message => port1.postMessage(message), 64);
const outgoingDataHandler = createOutgoingDataHandler(message => port2.postMessage(message), 64);
port1.addEventListener("message", msg => incomingDataHandler(deserializeIncomingData(msg.data)));
port2.addEventListener("message", msg => outgoingDataHandler(deserializeOutgoingData(msg.data)));
```

A version of this with random delays can be found at [`src/proxy.ts`](
https://github.com/tigeryu8900/http-over-text/blob/main/src/proxy.ts
).

### Adapters

Adapters are functions that can be used to create a server or client. They contain the logic for
communicating with different messaging services.

The currently supported adapters are [`createGoogleVoiceAdapter`](
https://github.com/tigeryu8900/http-over-text/blob/main/src/adapters/google-voice.ts
), [`createImessageAdapter`](
https://github.com/tigeryu8900/http-over-text/blob/main/src/adapters/imessage.ts
), and [`createWhatsappAdapter`](
https://github.com/tigeryu8900/http-over-text/blob/main/src/adapters/whatsapp.ts
).

You can check out the [`src/clients`](
https://github.com/tigeryu8900/http-over-text/tree/main/src/clients
) and [`src/servers`](
https://github.com/tigeryu8900/http-over-text/tree/main/src/servers
) for examples of using these adapters.
