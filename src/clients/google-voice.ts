import * as dotenv from "dotenv";
import {deserializeIncomingData} from "../common";
import createGoogleVoiceAdapter from "../adapters/google-voice";
import createIncomingDataHandler from "../client-base";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createGoogleVoiceAdapter(postMessage => {
  const incomingDataHandler = createIncomingDataHandler(postMessage);
  return function handleData(str: string) {
    incomingDataHandler(deserializeIncomingData(str));
  }
}, process.env.IMESSAGE_SERVER ?? "", `${process.env.HOME}/.http-over-text/servers/google-voice/userData`);
