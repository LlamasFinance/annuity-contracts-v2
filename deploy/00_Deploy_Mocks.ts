import { DeployFunction } from "hardhat-deploy/types";
import { getNamedAccounts, deployments, network } from "hardhat";

const deployFunction: DeployFunction = async () => {
  const DECIMALS: string = `8`;
  const INITIAL_PRICE: string = `300000000000`;

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId: number | undefined = network.config.chainId;

  // If we are on a local development network, we need to deploy mocks!
  if (chainId === 31337) {
    log(`Local network detected! Deploying mocks...`);

    await deploy(`MockV3Aggregator`, {
      contract: `MockV3Aggregator`,
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    });

    log(`Mocks Deployed!`);
    log(`----------------------------------------------------`);
    log(`You are deploying to a local network, you'll need a local network running to interact`);
    log("Please run `yarn hardhat console` to interact with the deployed smart contracts!");
    log(`----------------------------------------------------`);
  }
};
deployFunction.skip = async (hre) => true;
export default deployFunction;
deployFunction.tags = [`all`, `mocks`, `main`];
