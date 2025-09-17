import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("PointsSystem", function () {
    async function deployPointsSystemFixture() {
        const [ownerAccount, member1, member2] = await ethers.getSigners();
        const PointsSystem = await ethers.getContractFactory("PointsSystem");
        const pointsSystem = await PointsSystem.deploy();
        await pointsSystem.waitForDeployment();

        return { pointsSystem, ownerAccount, member1, member2 };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { pointsSystem, ownerAccount } = await deployPointsSystemFixture();
            expect(await pointsSystem.owner()).to.equal(ownerAccount.address);
        });
    });

    describe("Membership", function () {
        it("Should allow a user to join as a member", async function () {
            const { pointsSystem, member1 } = await deployPointsSystemFixture();
            await expect(pointsSystem.connect(member1).joinAsMember())
                .to.emit(pointsSystem, "MemberJoined")
                .withArgs(member1.address);
        });

        it("Should revert if already a member", async function () {
            const { pointsSystem, member1 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();
            await expect(pointsSystem.connect(member1).joinAsMember())
                .to.be.revertedWithCustomError(pointsSystem, "AlreadyMember")
                .withArgs(member1.address);
        });

        it("Should allow multiple members to join independently", async function () {
            const { pointsSystem, member1, member2 } = await deployPointsSystemFixture();

            await pointsSystem.connect(member1).joinAsMember();
            await expect(pointsSystem.connect(member2).joinAsMember())
                .to.emit(pointsSystem, "MemberJoined")
                .withArgs(member2.address);
        });
    });

    describe("Points Operations", function () {
        it("Should allow a member to earn points", async function () {
            const { pointsSystem, member1 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();

            await expect(pointsSystem.connect(member1).earnPoints(100))
                .to.emit(pointsSystem, "PointsEarned")
                .withArgs(member1.address, 100);

            expect(await pointsSystem.connect(member1).getMyBalance()).to.equal(100);
        });

        it("Should revert if non-owner tries to assign points", async function () {
            const { pointsSystem, member1 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();

            await expect(pointsSystem.connect(member1).assignPoints(member1.address, 50))
                .to.be.revertedWithCustomError(pointsSystem, "NotOwner");
        });

        it("Owner can assign points to a member", async function () {
            const { pointsSystem, ownerAccount, member1 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();

            await expect(pointsSystem.assignPoints(member1.address, 50))
                .to.emit(pointsSystem, "PointsAssigned")
                .withArgs(ownerAccount.address, member1.address, 50);

            expect(await pointsSystem.connect(member1).getMyBalance()).to.equal(50);
        });

        it("Should allow points transfer between members", async function () {
            const { pointsSystem, member1, member2 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();
            await pointsSystem.connect(member2).joinAsMember();
            await pointsSystem.assignPoints(member1.address, 100);

            await expect(pointsSystem.connect(member1).transferPoints(member2.address, 40))
                .to.emit(pointsSystem, "PointsTransferred")
                .withArgs(member1.address, member2.address, 40);

            expect(await pointsSystem.connect(member1).getMyBalance()).to.equal(60);
            expect(await pointsSystem.balanceOf(member2.address)).to.equal(40);
        });

        it("Should revert when transferring more points than balance", async function () {
            const { pointsSystem, member1, member2 } = await deployPointsSystemFixture();
            await pointsSystem.connect(member1).joinAsMember();
            await pointsSystem.connect(member2).joinAsMember();
            await pointsSystem.assignPoints(member1.address, 50);

            await expect(
                pointsSystem.connect(member1).transferPoints(member2.address, 100)
            ).to.be.revertedWithCustomError(pointsSystem, "InsufficientPoints")
                .withArgs(50, 100);
        });

        describe("Rewards", function () {
            it("Should allow redeeming rewards", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();
                await pointsSystem.connect(member1).joinAsMember();
                await pointsSystem.assignPoints(member1.address, 1000);

                for (let reward = 0; reward <= 3; reward++) {
                    const cost = await pointsSystem.pointsRequiredForRewards(reward);
                    if ((await pointsSystem.connect(member1).getMyBalance()) >= cost) {
                        await expect(pointsSystem.connect(member1).redeemReward(reward))
                            .to.emit(pointsSystem, "RewardRedeemed")
                            .withArgs(member1.address, reward, cost);
                    }
                }
            });

            it("Should revert when redeeming reward without enough points", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();
                await pointsSystem.connect(member1).joinAsMember();
                await pointsSystem.assignPoints(member1.address, 10);

                const cost = await pointsSystem.pointsRequiredForRewards(0);
                await expect(
                    pointsSystem.connect(member1).redeemReward(0)
                ).to.be.revertedWithCustomError(pointsSystem, "InsufficientPoints")
                    .withArgs(10, cost);
            });

        });

        describe("Banning & Errors", function () {
            it("Owner can ban a member", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();
                await pointsSystem.connect(member1).joinAsMember();

                await expect(pointsSystem.banAccount(member1.address))
                    .to.emit(pointsSystem, "MemberBanned")
                    .withArgs(member1.address);

                await expect(pointsSystem.connect(member1).earnPoints(50))
                    .to.be.revertedWithCustomError(pointsSystem, "AccountBanned");
            });

            it("Should revert if non-owner tries to ban a member", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();
                await pointsSystem.connect(member1).joinAsMember();

                await expect(pointsSystem.connect(member1).banAccount(member1.address))
                    .to.be.revertedWithCustomError(pointsSystem, "NotOwner");
            });
        });

        describe("Receive()", function () {

            it("Should accept plain ETH transfer via receive()", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();

                await expect(
                    member1.sendTransaction({
                        to: pointsSystem.target,
                        value: ethers.parseEther("0.2") // no data
                    })
                )
                    .to.emit(pointsSystem, "ReceivedFunds")
                    .withArgs(member1.address, ethers.parseEther("0.2"));
            });
        });


        describe("Fallback Function", function () {
            it("Should track fallback calls and emit ReceivedFunds when value is sent", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();

                await expect(member1.sendTransaction({
                    to: pointsSystem.target,
                    value: ethers.parseEther("0.1"),
                    data: "0x1234"
                }))
                    .to.emit(pointsSystem, "ReceivedFunds")
                    .withArgs(member1.address, ethers.parseEther("0.1"));

                expect(await pointsSystem.fallbackCalls(member1.address)).to.equal(1);
            });

            it("Should track fallback calls without emitting ReceivedFunds when no value is sent", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();

                await member1.sendTransaction({
                    to: pointsSystem.target,
                    value: 0,
                    data: "0x1234"
                });

                expect(await pointsSystem.fallbackCalls(member1.address)).to.equal(1);
            });

            it("Should increment fallback call counter for multiple calls", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();

                for (let i = 1; i <= 5; i++) {
                    await member1.sendTransaction({
                        to: pointsSystem.target,
                        value: 0,
                        data: "0x1234"
                    });
                    expect(await pointsSystem.fallbackCalls(member1.address)).to.equal(i);
                }
            });

            it("Should revert immediately if banned account tries to trigger fallback", async function () {
                const { pointsSystem, member1 } = await deployPointsSystemFixture();

                await pointsSystem.connect(member1).joinAsMember();
                await pointsSystem.banAccount(member1.address);

                expect(await pointsSystem.bannedAccounts(member1.address)).to.be.true;

                await expect(member1.sendTransaction({
                    to: pointsSystem.target,
                    value: ethers.parseEther("0.1"),
                    data: "0x1234"
                }))
                    .to.be.revertedWithCustomError(pointsSystem, "AccountBanned")
                    .withArgs(member1.address);

                expect(await pointsSystem.fallbackCalls(member1.address)).to.equal(0);
            });

            it("Should handle fallback calls from different accounts independently", async function () {
                const { pointsSystem, member1, member2 } = await deployPointsSystemFixture();

                for (let i = 1; i <= 3; i++) {
                    await member1.sendTransaction({
                        to: pointsSystem.target,
                        value: 0,
                        data: "0x1234"
                    });
                }

                for (let i = 1; i <= 5; i++) {
                    await member2.sendTransaction({
                        to: pointsSystem.target,
                        value: 0,
                        data: "0x5678"
                    });
                }

                expect(await pointsSystem.fallbackCalls(member1.address)).to.equal(3);
                expect(await pointsSystem.fallbackCalls(member2.address)).to.equal(5);
                expect(await pointsSystem.bannedAccounts(member1.address)).to.be.false;
                expect(await pointsSystem.bannedAccounts(member2.address)).to.be.false;
            });
        });

    });
});
