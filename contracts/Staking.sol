// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Staking {
    ERC20 public token;
    uint256 public rewardRate = 1;
    uint256 public blocksPerDay = 86400 / 6;

    struct Stake {
        uint256 amount;
        uint256 lastUpdate;
        uint256 pendingRewards;
    }

    mapping(address => Stake) public stakes;
    uint256 public totalStaked;

    constructor(address _token) {
        token = ERC20(_token);
    }

    function stake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient balance");

        uint256 rewards = calculateRewards(msg.sender);
        stakes[msg.sender].pendingRewards += rewards;

        token.transferFrom(msg.sender, address(this), _amount);
        stakes[msg.sender].amount += _amount;
        stakes[msg.sender].lastUpdate = block.number;

        totalStaked += _amount;
    }

    function calculateRewards(address _user) internal view returns (uint256) {
        uint256 blocks = block.number - stakes[_user].lastUpdate;
        uint256 rewardPerBlock = stakes[_user].amount / (blocksPerDay * 1000);
        return blocks * rewardPerBlock;

    }

    function claimRewards() external {
        uint256 rewards = stakes[msg.sender].pendingRewards + calculateRewards(msg.sender);
        stakes[msg.sender].pendingRewards = 0;
        stakes[msg.sender].lastUpdate = block.number;

        if (rewards > 0) {
            token.transfer(msg.sender, rewards);
        }
    }

    function unstake() external {
        uint256 amount = stakes[msg.sender].amount;
        uint256 rewards = stakes[msg.sender].pendingRewards + calculateRewards(msg.sender);
        totalStaked -= amount;
        token.transfer(msg.sender, amount + rewards);
        delete stakes[msg.sender];
    }

    function viewRewards(address _user) external view returns (uint256) {
        return stakes[_user].pendingRewards + calculateRewards(_user);
    }
}