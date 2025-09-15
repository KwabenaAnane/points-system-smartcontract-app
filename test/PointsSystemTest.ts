import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();


describe("PointsSystem", function () {
  async function deployPointsSystemFixture() {
    const [ownerAccount, alice, bob] = await ethers.getSigners();
    const PointsSystem = await ethers.getContractFactory("PointsSystem");
    const pointsSystem = await PointsSystem.deploy();
    await pointsSystem.waitForDeployment();

    return { pointsSystem, ownerAccount, alice, bob };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { pointsSystem, ownerAccount } = await deployPointsSystemFixture();
      expect(await pointsSystem.owner()).to.equal(ownerAccount.address);
    });
  });

  describe("Membership", function () {
    it("Should allow a user to join as a member", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await expect(pointsSystem.connect(alice).joinAsMember())
        .to.emit(pointsSystem, "MemberJoined");
        //.withArgs(alice.address, await pointsSystem.getBlockTime()); 
    });
   
    it("Should revert if already a member", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();
      await expect(pointsSystem.connect(alice).joinAsMember())
        .to.be.revertedWithCustomError(pointsSystem, "AlreadyMember")
        .withArgs(alice.address);
    });
  });

  describe("Points Operations", function () {
    it("Should allow a member to earn points", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();

      await expect(pointsSystem.connect(alice).earnPoints(100))
        .to.emit(pointsSystem, "PointsEarned")
        .withArgs(alice.address, 100);

      expect(await pointsSystem.connect(alice).getMyBalance()).to.equal(100);
    });

    it("Should revert if non-owner tries to assign points", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();

      await expect(pointsSystem.connect(alice).assignPoints(alice.address, 50))
        .to.be.revertedWithCustomError(pointsSystem, "NotOwner");
    });

    it("Owner can assign points to a member", async function () {
      const { pointsSystem, ownerAccount, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();

      await expect(pointsSystem.assignPoints(alice.address, 50))
        .to.emit(pointsSystem, "PointsAssigned")
        .withArgs(ownerAccount.address, alice.address, 50);

      expect(await pointsSystem.connect(alice).getMyBalance()).to.equal(50);
    });

    it("Should allow points transfer between members", async function () {
      const { pointsSystem, alice, bob } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();
      await pointsSystem.connect(bob).joinAsMember();
      await pointsSystem.assignPoints(alice.address, 100);

      await expect(pointsSystem.connect(alice).transferPoints(bob.address, 40))
        .to.emit(pointsSystem, "PointsTransferred")
        .withArgs(alice.address, bob.address, 40);

      expect(await pointsSystem.connect(alice).getMyBalance()).to.equal(60);
      expect(await pointsSystem.balanceOf(bob.address)).to.equal(40);
    });
  });

  describe("Rewards", function () {
    it("Should allow redeeming rewards", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();
      await pointsSystem.assignPoints(alice.address, 1000);

      for (let reward = 0; reward <= 3; reward++) {
        const cost = await pointsSystem.pointsRequiredForRewards(reward);
        if ((await pointsSystem.connect(alice).getMyBalance()) >= cost) {
          await expect(pointsSystem.connect(alice).redeemReward(reward))
            .to.emit(pointsSystem, "RewardRedeemed")
            .withArgs(alice.address, reward, cost);
        }
      }
    });

    it("Should return correct points for each reward", async function () {
        const { pointsSystem } = await deployPointsSystemFixture();
        expect(await pointsSystem.pointsRequiredForRewards(0)).to.equal(1000);
        expect(await pointsSystem.pointsRequiredForRewards(1)).to.equal(500);  
        expect(await pointsSystem.pointsRequiredForRewards(2)).to.equal(250);
        expect(await pointsSystem.pointsRequiredForRewards(3)).to.equal(100);
    });
  });

  describe("Banning & Errors", function () {
    it("Owner can ban a member", async function () {
      const { pointsSystem, alice } = await deployPointsSystemFixture();
      await pointsSystem.connect(alice).joinAsMember();

      await expect(pointsSystem.banAccount(alice.address))
        .to.emit(pointsSystem, "MemberBanned")
        .withArgs(alice.address);

      await expect(pointsSystem.connect(alice).earnPoints(50))
        .to.be.revertedWithCustomError(pointsSystem, "AccountBanned");
    });

    describe("Fallback and Receive", function () {
    it("Should handle Ether correctly in the receive function", async function () {
      const { pointsSystem, owner } = await deployPointsSystemFixture();

      const amountToSend = ethers.utils.parseEther("1");

      await expect({
        to: pointsSystem.address,
        value: amountToSend,
      })
        .to.emit(pointsSystem, "ReceivedFunds")
        .withArgs(owner.address, amountToSend);
    });

    it("Should handle Ether correctly in the fallback function", async function () {
      const { pointsSystem, owner } = await deployPointsSystemFixture();

      const amountToSend = ethers.utils.parseEther("1");

      await expect({
        to: pointsSystem.address,
        value: amountToSend,
      }).to.not.emit();

      await expect(pointsSystem.connect(owner).sendTransaction({
        to: pointsSystem.address,
        value: amountToSend,
      })).to.be.revertedWith("AccountBanned");
    });
  });

 


    // it("Fallback triggers ban after 10 calls", async function () {
    //   const { pointsSystem, ownerAccount } = await deployPointsSystemFixture();
    //   const contractAddress = await pointsSystem.getAddress();

    //   for (let i = 0; i < 9; i++) {
    //     await ownerAccount.sendTransaction({ to: contractAddress, data: "0x" });
    //   }

    //   await expect(ownerAccount.sendTransaction({ to: contractAddress, data: "0x" }))
    //     .to.be.revertedWithCustomError(pointsSystem, "AccountBanned");
    // });
  });
});
