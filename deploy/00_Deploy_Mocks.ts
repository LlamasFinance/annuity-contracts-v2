import { DeployFunction } from "hardhat-deploy/types";

const deployFunction: DeployFunction = async () => {};

export default deployFunction;
deployFunction.skip = async () => await true;
