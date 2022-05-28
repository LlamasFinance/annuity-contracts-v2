import { network } from "hardhat";
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config";
import { verify } from "../helper-functions";
import { DeployFunction } from "hardhat-deploy/types";

// arguments come from hardhat-deploy
const deployFunction: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  if (!chainId) return;

  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  log(`----------------------------------------------------`);
  const message = "Hello, Hardhat!";
  const greeter = await deploy("Greeter", {
    from: deployer,
    args: [message],
    log: true,
    waitConfirmations: waitBlockConfirmations,
    skipIfAlreadyDeployed: true,
  });

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.LOCAL_ETHERSCAN_API_KEY) {
    log("Verifying...");
    await verify(greeter.address, [message]);
  }

  log("----------------------------------------------------");
};
deployFunction.skip = async (hre) => true;
export default deployFunction;
deployFunction.tags = [`all`, `greeter`, `main`];
// tags can be used with hardhat-deploy and hardhat.config to customize things
