import * as dotenv from "dotenv";
import {deserializeOutgoingData} from "../common";
import createOutgoingDataHandler from "../server-base";
import createGoogleVoiceAdapter from "../adapters/google-voice";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createGoogleVoiceAdapter(postMessage => {
  const outgoingDataHandler = createOutgoingDataHandler(postMessage);
  return function handleData(str: string) {
    outgoingDataHandler(deserializeOutgoingData(str));
  }
}, process.env.IMESSAGE_CLIENT ?? "", `${process.env.HOME}/.http-over-text/clients/google-voice/userData`);
