import {
    Injectable,
    AppConfigService,
    ProjectService,
    DockerService,
    LogService,
    Project
} from "@wocker/core";
import {promptConfirm, promptText, demuxOutput} from "@wocker/utils";


@Injectable()
export class NgrokService {
    protected ENABLE_KEY = "NGROK_ENABLE";
    protected TOKEN_KEY = "NGROK_AUTHTOKEN";

    public constructor(
        protected readonly appConfigService: AppConfigService,
        protected readonly projectService: ProjectService,
        protected readonly dockerService: DockerService,
        protected readonly logService: LogService
    ) {}

    protected getContainerName(project: Project): string {
        return `ngrok-${project.name}`;
    }

    public async init(name?: string): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        const enable = await promptConfirm({
            message: "Enable ngrok?",
            default: project.getMeta(this.ENABLE_KEY, false)
        });

        project.setMeta(this.ENABLE_KEY, enable);

        if(enable) {
            const token = await promptText({
                message: "Auth token:",
                default: project.getMeta(this.TOKEN_KEY, "")
            });

            project.setMeta(this.TOKEN_KEY, token);
        }

        await project.save();
    }

    public async start(name?: string, restart?: boolean, attach?: boolean): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        if(restart) {
            await this.dockerService.removeContainer(this.getContainerName(project));
        }

        await this.onStart(project);

        if(attach) {
            await this.dockerService.attach(this.getContainerName(project));
        }
    }

    public async stop(name?: string): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        await this.onStop(project);
    }

    public async attach(name?: string): Promise<void> {
        if(name) {
            await this.projectService.cdProject(name);
        }

        const project = await this.projectService.get();

        await this.dockerService.attach(this.getContainerName(project));
    }

    public async onStart(project: Project): Promise<void> {
        if(!project || !project.getMeta(this.ENABLE_KEY, false)) {
            return;
        }

        console.info("Starting ngrok...");

        let container = await this.dockerService.getContainer(this.getContainerName(project));

        if(!container) {
            await this.dockerService.pullImage("ngrok/ngrok:latest");

            container = await this.dockerService.createContainer({
                name: this.getContainerName(project),
                image: "ngrok/ngrok:latest",
                tty: true,
                restart: "always",
                env: {
                    NGROK_AUTHTOKEN: project.getMeta(this.TOKEN_KEY)
                },
                cmd: ["http", `${project.name}.workspace:80`]
            });

            const stream = await container.attach({
                logs: true,
                stream: true,
                hijack: true,
                stdin: true,
                stdout: true,
                stderr: true
            });

            stream.setEncoding("utf8");

            await container.start();

            await container.resize({
                w: 90,
                h: 40
            });

            await new Promise((resolve, reject) => {
                stream.on("data", (data: ArrayBuffer) => {
                    const regLink = /(https?):\/\/(\w[\w.-]+[a-z]|\d+\.\d+\.\d+\.\d+)(?::(\d+))?/;

                    if(regLink.test(data.toString())) {
                        const [link = ""] = regLink.exec(data.toString()) || [];

                        if(link.includes(".ngrok")) {
                            this.logService.info(`${project.name} forwarding: ${link}`);
                            console.log(`Forwarding: ${link}`);

                            stream.end();
                        }
                    }
                });

                stream.on("end", resolve);
                stream.on("error", reject);
            });
        }
    }

    public async onStop(project: Project): Promise<void> {
        if(!project) {
            return;
        }

        console.info("Stopping ngrok...");

        await this.dockerService.removeContainer(this.getContainerName(project));
    }

    public async getForwarding(project: Project) {
        const container = await this.dockerService.getContainer(project.containerName);

        if(!container) {
            throw new Error(`Ngrok for "${project.name}" not started`);
        }

        const {
            NetworkSettings: {
                Networks: {
                    workspace
                }
            }
        } = await container.inspect();

        const stream = await this.dockerService.exec("proxy.workspace", [
            "curl", `http://${workspace.IPAddress}:4040/api/tunnels/command_line`
        ], false);

        const res: string = await new Promise((resolve, reject) => {
            let res = "";

            stream.on("data", (data: Buffer) => {
                res += demuxOutput(data).toString();
            });

            stream.on("end", () => resolve(res));
            stream.on("error", reject);
        });

        const tunnel = JSON.parse(res);

        return tunnel.public_url;
    }
}
