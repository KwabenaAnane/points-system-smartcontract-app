// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract PointsSystem {
    uint public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    enum Reward {VIP, GOLD, SILVER, BRONZE}

    //Structs
    struct Member {
        bool exists;
        uint96 balance;
        uint48 joinedAt;
    }

    //mappings
    mapping(address => Member) private members;
    mapping(address => bool) internal bannedAccounts;
    mapping(address => uint ) internal fallbackCalls;

    uint256 public totalPoints;
     bool private _locked; // reentrancy guard

    //Events
    event MemberJoined(address indexed member, uint48 joinedAt);
    event MemberBanned(address indexed account);
    event PointsEarned(address indexed member, uint256 amount);
    event PointsAssigned(address indexed by, address indexed to, uint256 amount);
    event PointsTransferred(address indexed from, address indexed to, uint256 amount);
    event RewardRedeemed(address indexed member, Reward reward, uint256 cost);
    event ReceivedFunds(address indexed from, uint256 amount);
    



     //Modifiers




    
}