import * as dotenv from "dotenv";
import {deserializeOutgoingData} from "../common";
import createImessageAdapter from "../adapters/imessage";
import createOutgoingDataHandler from "../server-base";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createImessageAdapter(postMessage => {
  const outgoingDataHandler = createOutgoingDataHandler(postMessage);
  return function handleData(str: string) {
    outgoingDataHandler(deserializeOutgoingData(str));
  }
}, process.env.GOOGLE_VOICE_CLIENT ?? "");
