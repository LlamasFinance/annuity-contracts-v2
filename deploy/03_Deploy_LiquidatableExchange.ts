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
  log("Deploying fake uniswap router");
  const usdc = await deployments.get("USDC");
  const weth = await deploy("WETH9", {
    from: deployer,
    log: true,
    args: [],
  });
  const swapperDeployment = await deploy("MockSwapRouter", {
    from: deployer,
    log: true,
    args: [],
  });
  const router = await ethers.getContractAt("MockSwapRouter", swapperDeployment.address);
  router.setPriceFeed(ethUsdPriceFeedAddress!);

  log(`----------------------------------------------------`);

  const exchangeDeployment = await deploy("LiquidatableExchange", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });
  const exchange = await ethers.getContractAt("LiquidatableExchange", exchangeDeployment.address);
  exchange.setLenderToken(usdc.address, ethUsdPriceFeedAddress!);
  exchange.setSwapRouter(router.address, weth.address);

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...");
    await verify(exchange.address, []);
  }

  log("----------------------------------------------------");
};

export default deployFunction;
deployFunction.tags = [`all`, `liquidatableExchange`, `main`];
// tags can be used with hardhat-deploy and hardhat.config to customize things
