const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('Staking Contract', function () {
    let tokenContract, stakingContract, owner, userA;
    const blocksPerDay = 86400 / 6;

    before(async function () {
        const accounts = await ethers.getSigners();
        owner = accounts[0];
        userA = accounts[1];

        const initialSupply = ethers.parseEther('10000000');
        const MockERC20 = await ethers.getContractFactory('MockERC20');
        tokenContract = await MockERC20.deploy('DEFI', 'DEFI', initialSupply);
        await tokenContract.waitForDeployment();

        const tokenContractAddress = await tokenContract.getAddress();
        const Staking = await ethers.getContractFactory('Staking');
        stakingContract = await Staking.deploy(tokenContractAddress);
        await stakingContract.waitForDeployment();
        await tokenContract.transfer(stakingContract.getAddress(), ethers.parseEther('10000'));
    });

    it('User A stakes 1000 DEFI on 1st January and withdraws on 11th January', async function () {
        await tokenContract.transfer(userA.address, ethers.parseEther('1000'));
        await tokenContract.connect(userA).approve(stakingContract.getAddress(), ethers.parseEther('1000'));
        await stakingContract.connect(userA).stake(ethers.parseEther('1000'));

        const blockNumber1 = await ethers.provider.getBlockNumber();
        await ethers.provider.send('evm_increaseTime', [blockNumber1 + 10 * blocksPerDay]);
        await ethers.provider.send('evm_mine');

        const blockNumber2 = await ethers.provider.getBlockNumber();
        await stakingContract.connect(userA).unstake();
        const userABalance = await tokenContract.balanceOf(userA.address);

        const rewardPerBlock = (ethers.parseEther('1000') / BigInt(1000)) / BigInt(blocksPerDay);
        const rewardsEarned = rewardPerBlock * BigInt(blockNumber2 - blockNumber1);
        const expectedBalance = ethers.parseEther('1000') + rewardsEarned;

        expect(Number(ethers.formatEther(userABalance)).toFixed(2)).to.equal(Number(ethers.formatEther(expectedBalance)).toFixed(2));
    });

    it("User A stakes 100 DEFI on 1st February, stakes 900 DEFI more on 11th February, and withdraws on 21st February", async function () {
        await tokenContract.connect(userA).approve(stakingContract.getAddress(), ethers.parseEther('1000'));
        await stakingContract.connect(userA).stake(ethers.parseEther('100'));

        const newBlockNumber1 = await ethers.provider.getBlockNumber();
        await ethers.provider.send('evm_increaseTime', [newBlockNumber1 + 10 * blocksPerDay]);
        await ethers.provider.send('evm_mine');

        await stakingContract.connect(userA).stake(ethers.parseEther('900'));
        const newBlockNumber2 = await ethers.provider.getBlockNumber();
        await ethers.provider.send('evm_increaseTime', [newBlockNumber2 + 10 * blocksPerDay]);
        await ethers.provider.send('evm_mine');

        const newBlockNumber3 = await ethers.provider.getBlockNumber();
        await stakingContract.connect(userA).unstake();

        const rewardPerBlock1 = (ethers.parseEther('100') / BigInt(1000)) / BigInt(blocksPerDay);
        const rewardPerBlock2 = (ethers.parseEther('1000') / BigInt(1000)) / BigInt(blocksPerDay);

        const rewardsEarned1 = rewardPerBlock1 * BigInt(newBlockNumber2 - newBlockNumber1);
        const rewardsEarned2 = rewardPerBlock2 * BigInt(newBlockNumber3 - newBlockNumber2);

        const expectedNewBalance = ethers.parseEther('1000') + rewardsEarned1 + rewardsEarned2;
        const userABalance = await tokenContract.balanceOf(userA.address);
        expect(Number(ethers.formatEther(userABalance)).toFixed(2)).to.equal(Number(ethers.formatEther(expectedNewBalance)).toFixed(2));
    });

});