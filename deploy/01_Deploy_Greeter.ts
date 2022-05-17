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

  // let ethUsdPriceFeedAddress: string | undefined;

  // if (chainId === 31337) {
  //   const EthUsdAggregator = await deployments.get("MockV3Aggregator");
  //   ethUsdPriceFeedAddress = EthUsdAggregator.address;
  // } else {
  //   ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  // }

  // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
  // Default one below is ETH/USD contract on Kovan
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
  });

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...");
    await verify(greeter.address, [message]);
  }

  log("----------------------------------------------------");
};

export default deployFunction;
deployFunction.tags = [`all`, `greeter`, `main`];
// tags can be used with hardhat-deploy and hardhat.config to customize things
