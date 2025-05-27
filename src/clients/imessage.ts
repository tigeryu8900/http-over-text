import * as dotenv from "dotenv";
import {deserializeIncomingData} from "../common";
import createIncomingDataHandler from "../client-base";
import createImessageAdapter from "../adapters/imessage";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createImessageAdapter(postMessage => {
  const incomingDataHandler = createIncomingDataHandler(postMessage);
  return function handleData(str: string) {
    incomingDataHandler(deserializeIncomingData(str));
  }
}, process.env.GOOGLE_VOICE_SERVER ?? "");
