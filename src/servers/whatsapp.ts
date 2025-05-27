import * as dotenv from "dotenv";
import {deserializeOutgoingData} from "../common";
import createOutgoingDataHandler from "../server-base";
import createWhatsappAdapter from "../adapters/whatsapp";

dotenv.config({
  path: `${process.env.HOME}/.http-over-text/.env`
});

createWhatsappAdapter(postMessage => {
      const outgoingDataHandler = createOutgoingDataHandler(message => {
        console.log("send", JSON.parse(message));
        return postMessage(message);
      }, 49000);
      return function handleData(str: string) {
        console.log("receive", JSON.parse(str));
        outgoingDataHandler(deserializeOutgoingData(str));
      }
    },
    process.env.WHATSAPP_SERVER_JID ?? "",
    process.env.WHATSAPP_CLIENT_JID ?? "",
    `${process.env.HOME}/.http-over-text/servers/whatsapp/baileys_auth_info`,
    `${process.env.HOME}/.http-over-text/servers/whatsapp/wa-logs.txt`
);
