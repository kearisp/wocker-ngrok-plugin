import {
    Controller,
    Command,
    Option,
    AppEventsService,
    Project
} from "@wocker/core";

import {NgrokService} from "../services/NgrokService";


@Controller()
export class NgrokController {
    public constructor(
        protected readonly appEventsService: AppEventsService,
        protected readonly ngrokService: NgrokService
    ) {
        this.appEventsService.on("project:start", (project: Project) => {
            return this.ngrokService.onStart(project);
        });

        this.appEventsService.on("project:stop", (project: Project) => {
            return this.ngrokService.onStop(project);
        });
    }

    @Command("ngrok:init")
    public async init(
        @Option("name", {
            type: "string",
            alias: "n"
        })
        name?: string
    ) {
        await this.ngrokService.init(name);
    }

    @Command("ngrok:start")
    public async start(
        @Option("name", {
            type: "string",
            alias: "n"
        })
        name?: string,
        @Option("restart", {
            type: "boolean",
            alias: "r"
        })
        restart?: boolean
    ) {
        await this.ngrokService.start(name, restart);
    }

    @Command("ngrok:stop")
    public async stop(
        @Option("name", {
            type: "string",
            alias: "n"
        })
        name?: string
    ) {
        await this.ngrokService.stop(name);
    }

    @Command("ngrok:attach")
    public async attach(
        @Option("name", {
            type: "string",
            alias: "n"
        })
        name?: string
    ) {
        await this.ngrokService.attach(name);
    }
}
