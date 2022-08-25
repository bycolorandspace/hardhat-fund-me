const { assert, expect, Assertion } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); // 1 ETH

      beforeEach(async function () {
        // deploy our fundMe contract
        // using Hardhat-deploy

        //const accounts = await ethers.getSigners()
        // const accountOne = accounts[0]
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      // Just for constructor
      describe("constructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
          const response = await fundMe.priceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      //   require(
      //     msg.value.getConversionRate(priceFeed) > MINIMUM_USD,
      //     "Didn't send enough!"
      // );
      // funders.push(msg.sender);
      // addressToAmountFunded[msg.sender] = msg.value;

      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough!");
        }); // Checking failed message if not enough money is sent
        it("Updates the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.addressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        }); // Adds funding amount to map of address/amount
        it("Adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.funders(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });
        it("can withdraw ETH from a single founder", async function () {
          //Arrange
          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract starting balance
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawings starting balance

          //Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract ending balance
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawing ending balance

          //Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("Allows us to withdraw with multiple funders", async function () {
          //-------Arrange
          const accounts = await ethers.getSigners(); // Get multiple funders from default accounts
          for (let i = 1; i < 6; i++) {
            const fundMeConnectContract = await fundMe.connect(accounts[i]);
            await fundMeConnectContract.fund({ value: sendValue });
          } // Loop through funders, connect them to contract, send value

          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract starting balance
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawings starting balance
          //---------Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract ending balance
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawing ending balance

          //---------Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          await expect(fundMe.funders(0)).to.be.reverted;
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("is Cheaper Withdrawal...", async function () {
          //-------Arrange
          const accounts = await ethers.getSigners(); // Get multiple funders from default accounts
          for (let i = 1; i < 6; i++) {
            const fundMeConnectContract = await fundMe.connect(accounts[i]);
            await fundMeConnectContract.fund({ value: sendValue });
          } // Loop through funders, connect them to contract, send value

          const startingFundmeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract starting balance
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawings starting balance
          //---------Act
          const transactionResponse = await fundMe.cheaperWithdrawal();
          const transactionReceipt = await transactionResponse.wait(1);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          ); // contract ending balance
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          ); // person withdrawing ending balance

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          //---------Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundmeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          await expect(fundMe.funders(0)).to.be.reverted;
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only allows owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attackerConnectedContract = await fundMe.connect(accounts[1]);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });
      });
    });
