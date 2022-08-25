//imports
//main function
//calling of main function

// function deployFunc(hre) {
//   console.log("Hi!");
// }
// module.exports.default = deployFunc;

// module.exports = async (hre) => {
//     const {getNamedAccounts, deployments} = hre;
// }

const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../hardhat.config");

module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  // Get address for pricefeed according to chain ID - 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
  let ethUsdPricefeedAddress;
  if (developmentChains.includes(network.name)) {
    const ethUsdAggregator = await get("MockV3Aggregator");
    ethUsdPricefeedAddress = ethUsdAggregator.address;
  } else {
    console.log("ethUsdPriceFeed for rinkeby network");
    ethUsdPricefeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  //If contract doesnt exist, we deploy a minimal version for our local testing
  const args = [ethUsdPricefeedAddress];
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args, // put price feed address
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //verify
    await verify(fundMe.address, args);
  }

  console.log("Fund Me deployed");
  console.log("----------------------------------------------------------");
};

module.exports.tags = ["all", "fundMe"];
