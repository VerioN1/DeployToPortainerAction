const axios = require("axios");
const core = require("@actions/core");

const PROJECT_NAME = core.getInput("project-name") || "cam-code";
const REPO_URL = core.getInput("current-repo-url") || 'https://github.com/VerioN1/cam-code/';
const COMPOSE_FILE = "docker-compose-prod.yml";
const ENV = []
const BRANCH_NAME_REF = core.getInput('branch-ref') || "refs/heads/main";
const baseURL = core.getInput("deployment-env") === 'prod' ? "http://apps.varcode.com:9000/api" : "http://apps-dev.varcode.com:9000/api";

let api;
let stackConfig = {};

const connect = async() => {
    const {data: getJWToken} = await axios.post("http://apps-dev.varcode.com:9000/api/auth",{
        "password": "HelpIneed2021",
        "username": "admin"
    });

    const {jwt} = getJWToken;

    api = axios.create({
        baseURL,
        headers: {
            Authorization: `Bearer ${jwt}`
        }
    });
}

const deployStack = async() => {
    try {
        console.log("deploying stack...");
        const createStack = await api.post("/stacks?method=repository&type=2&endpointId=2",{
            Name:PROJECT_NAME,
            RepositoryURL: stackConfig?.GitConfig?.URL || REPO_URL,
            ComposeFile: stackConfig?.GitConfig?.ConfigFilePath || COMPOSE_FILE,
            Env: stackConfig?.GitConfig?.Env || ENV,
            repositoryAuthentication: true,
            repositoryPassword: "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",
            repositoryReferenceName: stackConfig?.GitConfig?.ReferenceName || BRANCH_NAME_REF,
            repositoryUsername: "VerioN1"
        });
        console.log("stack deployed!", JSON.stringify(createStack.data, null, 2));
    } catch (error) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
}

const deleteStack = async() => {
    try {
        console.log("initiating delete");
        const {data: getStacks} = await api.get("/stacks?filters=%7B%22EndpointID%22:2,%22IncludeOrphanedStacks%22:true%7D");
        stackConfig = getStacks.find(stack => stack.Name === PROJECT_NAME);
        const stackIdToDelete = getStacks.find(stack => stack.Name === PROJECT_NAME)?.Id;
        if(stackIdToDelete){
            console.log("deleting stack", stackIdToDelete);
            const {data: deleteStack} = await api.delete(`/stacks/${stackIdToDelete}?endpointId=2&external=false`);
            console.log(deleteStack);
        }
        const {data:Images} = await api.get("/endpoints/2/docker/images/json?all=0");
        const removeImages = Images.map(image =>{
            if(image.RepoTags.find(tag => tag.includes(PROJECT_NAME))){
            console.log("deleting image", image.Id);
            return api.delete(`/endpoints/2/docker/images/${image.Id}?force=false`);
            }
            return Promise.resolve();
        });
        await Promise.allSettled(removeImages);

    } catch (error) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
}

const main = async() => {
    console.log('targetProject: ', PROJECT_NAME)
    await connect();
    await deleteStack();
    console.log(stackConfig);
    deployStack();
};
main();