type NetworkConfigItem = {
  name: string;
  keyHash?: string;
  ethUsdPriceFeed?: string;
};

type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: "hardhat",
    keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
  },
  31337: {
    name: "localhost",
    keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    ethUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  },
  42: {
    name: "kovan",
    ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
  },
  4: {
    name: "rinkeby",
    ethUsdPriceFeed: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
  },
  80001: {
    name: "mumbai",
    ethUsdPriceFeed: "0xefb7e6be8356cCc6827799B6A7348eE674A80EaE",
    keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
  },
};

export const developmentChains: string[] = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
