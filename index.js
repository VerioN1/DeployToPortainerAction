const axios = require("axios");
const errorPretify  = require( "pretty-error");
require('dotenv').config();

const PROJECT_NAME = "camcode-demo";
const REPO_URL = "https://github.com/VerioN1/cam-code-demo.git"
const COMPOSE_FILE = "docker-compose-prod.yml";
const ENV = []
const BRANCH_NAME_REF = "refs/heads/main";
const baseURL = "http://apps-dev.varcode.com:9000/api";
// const baseURL = "http://apps.varcode.com:9000/api";

let api;
let stackConfig = {};
let jwt;

const connect = async() => {
    const {data: getJWToken} = await axios.post("http://apps-dev.varcode.com:9000/api/auth",{
        "password": "HelpIneed2021",
        "username": "admin"
    });

    jwt = getJWToken.jwt;

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
        console.log('stackJWT : ', process.env.USER_ID)
        const createStack = await api.post("/stacks?method=repository&type=2&endpointId=2",{
            Name: PROJECT_NAME,
            RepositoryURL: stackConfig?.GitConfig?.URL || REPO_URL,
            ComposeFile: stackConfig?.GitConfig?.ConfigFilePath || COMPOSE_FILE,
            Env: stackConfig?.GitConfig?.Env || ENV,
            repositoryAuthentication: true,
            repositoryPassword: "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",
            repositoryReferenceName: stackConfig?.GitConfig?.ReferenceName || BRANCH_NAME_REF,
            repositoryUsername: "VerioN1"
        });
        console.log("stack deployed!", JSON.stringify(createStack.data, null, 2));
        // const {data: getStack} = await api.get("/stacks?filters=%7B%22EndpointID%22:2,%22IncludeOrphanedStacks%22:true%7D");
        // console.log(getStack);
    } catch (error) {
        const pe = new errorPretify();
        console.log(pe.render(error));
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
      const pe = new errorPretify();
      console.log(pe.render(error));
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
}

const main = async() => {
    await connect();
    await deleteStack();
    console.log(stackConfig);
    deployStack();
};
main();