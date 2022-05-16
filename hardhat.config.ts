import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-abi-exporter";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.4" },
      { version: "0.4.24" },
      { version: "0.6.6" },
      { version: "0.7.6" },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_URL || "",
        blockNumber: 14763855,
        enabled: false,
      },
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    kovan: {
      url: process.env.KOVAN_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 42,
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 4,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    lender: {
      default: 1,
    },
    borrower: {
      default: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  abiExporter: [
    {
      path: "./data/abi/pretty",
      runOnCompile: true,
      clear: true,
      spacing: 2,
      pretty: true,
      only: ["Exchange.sol", "LiquidatableExchange.sol"],
    },
    {
      path: "./data/abi/ugly",
      runOnCompile: true,
      clear: true,
      spacing: 2,
      pretty: false,
      only: ["Exchange.sol", "LiquidatableExchange.sol"],
    },
  ],
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};

export default config;
