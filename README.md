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

# Installation & Usage
npm install -y
npx hardhat compile
npx hardhat test
npx hardhat ignition deploy ignition/modules/PointsSystem.ts --network localhost
npx hardhat ignition deploy ignition/modules/PointsSystem.ts --sepolia verify

# Gas Optimization & Security Measures

In designing the Points System smart contract, careful attention was given to both gas efficiency and security best practices. Since smart contracts run on the Ethereum Virtual Machine (EVM), every transaction consumes gas, and inefficient code can quickly become costly for users. At the same time, poor security practices could expose the system to vulnerabilities. To address these concerns, the following measures were implemented:

1. Use of Custom Errors

Action Taken: Instead of using require with string messages, the contract defines custom errors for invalid conditions.
Why Important: String-based revert messages increase bytecode size and gas costs when reverting.
Improvement: Custom errors reduce gas consumption by encoding error data more efficiently, leading to lower transaction costs for users.

2. Immutable and Enum Variables

Action Taken: Declared the owner as immutable and reward types as an enum.
Why Important: Immutable variables are stored directly in bytecode, not in expensive storage slots, and enums replace multiple constants with a compact representation.
Improvement: This lowers storage costs, improves gas efficiency, and ensures key variables are set once and cannot be changed, strengthening both performance and security.

3. Access Control Modifiers

Action Taken: Applied modifiers like onlyOwner to restrict administrative actions.
Why Important: Without access control, anyone could call sensitive functions (e.g., banning members, minting points).
Improvement: Prevents unauthorized access, reducing attack vectors and ensuring the contract operates securely under defined governance.

4. NonReentrancy Guard

Action Taken: Implemented a _locked boolean with a nonReentrant modifier on state-changing functions.
Why Important: Reentrancy attacks exploit external calls to re-enter a vulnerable function, often leading to double-spending or state corruption.
Improvement: The lock mechanism ensures functions cannot be re-entered during execution, protecting balances and contract integrity while keeping the implementation gas-efficient.







