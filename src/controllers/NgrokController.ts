import {
    Controller,
    Command,
    Option,
    AppEventsService,
    ProjectService,
    Project
} from "@wocker/core";

import {NgrokService} from "../services/NgrokService";


@Controller()
export class NgrokController {
    public constructor(
        protected readonly appEventsService: AppEventsService,
        protected readonly projectService: ProjectService,
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
    ): Promise<void> {
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
    ): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        await this.ngrokService.start(project, restart);
    }

    @Command("ngrok:stop")
    public async stop(
        @Option("name", {
            type: "string",
            alias: "n"
        })
        name?: string
    ): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        await this.ngrokService.stop(project);
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
