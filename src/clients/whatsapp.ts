import * as dotenv from "dotenv";
import {deserializeIncomingData} from "../common";
import createIncomingDataHandler from "../client-base";
import createWhatsappAdapter from "../adapters/whatsapp";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createWhatsappAdapter(postMessage => {
      const incomingDataHandler = createIncomingDataHandler(message => {
        console.log("send", JSON.parse(message));
        return postMessage(message);
      }, 49000);
      return function handleData(str: string) {
        console.log("receive", JSON.parse(str));
        incomingDataHandler(deserializeIncomingData(str));
      }
    },
    process.env.WHATSAPP_CLIENT_JID ?? "",
    process.env.WHATSAPP_SERVER_JID ?? "",
    `${process.env.HOME}/.http-over-text/clients/whatsapp/baileys_auth_info`,
    `${process.env.HOME}/.http-over-text/clients/whatsapp/wa-logs.txt`
);
