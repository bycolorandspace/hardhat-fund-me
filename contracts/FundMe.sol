// Get funds from users
// Withdraw funds
// Set a minimum funding value in USD

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PriceConverter.sol";
import "hardhat/console.sol";

error FundMe__NotOwner();

// Interfaces, Libraries, Contracts

/**@title A contract for crowd funding
 * @author Patrick Collins
 * @notice This contract is to dfemo a sample funding contract
 * @dev This impliments price feeds as out library
 */

contract FundMe {
    // Type declarations
    using PriceConverter for uint256;
    // State Variables
    uint256 public constant MINIMUM_USD = 50 * 1e18; // 1 * 10 ** 10
    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;
    address private immutable i_owner;
    AggregatorV3Interface public s_priceFeed;

    //Events

    // Modifiers
    modifier onlyOwner() {
        //require(msg.sender == owner, "Sender is not owner");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        _;
    }

    // Functions (Order: constructor, recieve, fallback, external, public, internal, private, view/pure)

    constructor(address priceFeedAddress) payable {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // receive() external payable {
    //     fund();
    // }

    // fallback() external payable {
    //     fund();
    // }

    function fund() public payable {
        // Set a minimum fund amount in USD
        // 1. How do we send ETH to this contract?

        //number = 5;
        require(
            msg.value.getConversionRate(s_priceFeed) > MINIMUM_USD,
            "Didn't send enough!"
        );
        // 1e18 == 1* 10 ** 18  == 10000000000000000
        // Reverting: undo any action before, and send remaining gas back

        s_funders.push(msg.sender); // Add sender to funer array
        s_addressToAmountFunded[msg.sender] = msg.value; // Fund action with address/value map including sender amount
    }

    function withdraw() public onlyOwner {
        //for loop => (starting index, ending index, step amount */
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        //Reset array
        s_funders = new address[](0);
        //Actually withdraw money: transfer, send, call
        //msg.sender = address
        //payable(msg.sender) = payable address

        /*transfer*/
        payable(msg.sender).transfer(address(this).balance);
        /*send*/
        bool sendSuccess = payable(msg.sender).send(address(this).balance);
        require(sendSuccess, "Send Failed");
        /*call*/
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdrawal() public payable onlyOwner {
        address[] memory _funders = s_funders;
        for (
            uint256 funderIndex = 0;
            funderIndex < _funders.length;
            funderIndex++
        ) {
            address funder = _funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        //Reset array
        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function funders(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function addressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function priceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }

    // Recieve, Fallback
}

/*


Transactions - fields 

- Nonce: transaction count for the account 
- Gas Price: price per unit of gas (in wei)
- To: address thgat the transaction is sent to 
- Value: amount of wei to send 
- Data: what to send to the To address
- v,r,s: components of transaction signature


*/
