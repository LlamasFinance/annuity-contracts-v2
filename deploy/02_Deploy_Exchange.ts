import { ethers, network } from "hardhat";
import {
  developmentChains,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
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

  let ethUsdPriceFeedAddress: string | undefined;

  if (chainId === 31337) {
    const EthUsdAggregator = await deployments.get("MockV3Aggregator");
    ethUsdPriceFeedAddress = EthUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  }

  //   We always need to deploy fake usdc and fake uniswap router because there isn't enough liquidity on testnets
  log("Deploying fake usdc and uniswap router");
  const [name, symbol, decimals] = ["USD Coin", "USDC", "6"];
  const usdc = await deploy("USDC", {
    from: deployer,
    log: true,
    args: [name, symbol, decimals],
  });

  log(`----------------------------------------------------`);

  const exchangeDeployment = await deploy("Exchange", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });
  const exchange = await ethers.getContractAt("Exchange", exchangeDeployment.address);
  exchange.setLenderToken(usdc.address, ethUsdPriceFeedAddress!);

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...");
    await verify(exchange.address, []);
  }

  log("----------------------------------------------------");
};

export default deployFunction;
deployFunction.tags = [`all`, `exchange`, `main`];
// tags can be used with hardhat-deploy and hardhat.config to customize things
