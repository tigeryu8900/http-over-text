import {deserializeIncomingData, deserializeOutgoingData} from "./common";
import createIncomingDataHandler from "./client-base";
import createOutgoingDataHandler from "./server-base";

const fixedDelay = 2000;
const randomDelay = 2000;
const {port1, port2} = new MessageChannel();
const incomingDataHandler = createIncomingDataHandler(message => {
  console.log("send", JSON.parse(message));
  port1.postMessage(message);
}, 64);
const outgoingDataHandler = createOutgoingDataHandler(message => {
  console.log("send", JSON.parse(message));
  port2.postMessage(message);
}, 64);
port1.addEventListener("message", msg => setTimeout(() => {
  console.log("receive", JSON.parse(msg.data));
  incomingDataHandler(deserializeIncomingData(msg.data));
}, fixedDelay + randomDelay * Math.random()));
port2.addEventListener("message", msg => setTimeout(() => {
  console.log("receive", JSON.parse(msg.data));
  outgoingDataHandler(deserializeOutgoingData(msg.data));
}, fixedDelay + randomDelay * Math.random()));
