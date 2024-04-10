import {Plugin} from "@wocker/core";

import {NgrokController} from "./controllers/NgrokController";
import {NgrokService} from "./services/NgrokService";


@Plugin({
    name: "ngrok",
    controllers: [NgrokController],
    providers: [NgrokService]
})
export default class NgrokPlugin {}
