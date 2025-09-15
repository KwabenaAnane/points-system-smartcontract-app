# points-system-smartcontract-app
PointsSystem — README
# Project Summary

PointsSystem is a Solidity smart contract that implements a member points program where:

Anyone can join as a member.

Members can earn points, check their own balance, transfer points to other members, and redeem points for rewards.

An administrator/owner can assign points to members and ban accounts.

The contract supports receiving ETH and has a fallback handler that counts fallback calls and can ban abusive callers.


# Tech Stack

Solidity ^0.8.28 (contract written with Solidity 0.8.x safety features)

Hardhat for compilation, testing and running tasks

ethers.js (used in tests), Mocha / Chai for tests (hardhat test)

Local/CI: Node.js (v16+ recommended), npm or yarn

# Gas Optimization & Security Measures

In designing the Points System smart contract, careful attention was given to both gas efficiency and security best practices. Since smart contracts run on the Ethereum Virtual Machine (EVM), every transaction consumes gas, and inefficient code can quickly become costly for users. At the same time, poor security practices could expose the system to vulnerabilities. To address these concerns, the following measures were implemented:

1. The contract uses custom errors instead of string-based require messages, reducing gas consumption by optimizing how reverts are handled.

2. The checks-effects-interactions pattern is implemented in state-changing functions, enhancing security by preventing reentrancy vulnerabilities.

3. Key variables such as the owner and reward types are declared as immutable or enum, lowering storage costs and improving gas efficiency.

4. The contract applies access control modifiers (e.g., onlyOwner) to restrict sensitive functions, ensuring that only authorized accounts can perform administrative actions, thereby improving overall contract security.

5. A nonReentrancy modifier using a simple _locked boolean is applied to state-changing functions that transfer or update balances, protecting against reentrancy attacks by preventing nested calls that could otherwise lead to double-spending or corrupted state.

# Installation & Usage
npm install -y
npx hardhat compile
npx hardhat test
npx hardhat ignition deploy ignition/modules/PointsSystem.ts --sepolia verify





