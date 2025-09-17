// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract PointsSystem {
    address public immutable owner;

    enum Reward {VIP, GOLD, SILVER, BRONZE}

    struct Member {
        bool exists;
        uint96 balance;
    }

    //MAPPINGS
    mapping(address => Member) public members;
    mapping(address => bool) public bannedAccounts;
    mapping(address => uint ) public fallbackCalls;

    uint256 public totalPoints;
    bool private _locked; // reentrancy guard

    //EVENTS
    event MemberJoined(address indexed member);
    event MemberBanned(address indexed account);
    event PointsEarned(address indexed member, uint256 amount);
    event PointsAssigned(address indexed by, address indexed to, uint256 amount);
    event PointsTransferred(address indexed from, address indexed to, uint256 amount);
    event RewardRedeemed(address indexed member, Reward reward, uint256 cost);
    event ReceivedFunds(address indexed from, uint256 amount);

    //CUSTOM ERRORS
    error NotOwner();
    error NotMember(address account);
    error AlreadyMember(address account);
    error AccountBanned(address account);
    error InsufficientPoints(uint256 availableBalance, uint256 required);
  
    //MODIFIERS
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyMember(){
        if(!members[msg.sender].exists) revert NotMember(msg.sender);
        _;
    }
    modifier accountBanned(){
        if(bannedAccounts[msg.sender]) revert AccountBanned(msg.sender);
        _;
    }
    modifier nonReentrancy() {
        require(!_locked, "Stop making re-entrancy calls. Please hold");
        _locked = true;
        _;
        _locked = false;
    }

    constructor() {
        owner = msg.sender;
    }

    //FUNCTIONS 
     function joinAsMember() external accountBanned {
        if(members[msg.sender].exists) revert AlreadyMember(msg.sender);
        members[msg.sender] = Member(true, 0);
        emit MemberJoined(msg.sender);
    }

    function earnPoints(uint256 amount) external onlyMember  accountBanned nonReentrancy {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000, "Exceeds max earn per tx");

        members[msg.sender].balance += uint96(amount);
        totalPoints += amount;
        emit PointsEarned(msg.sender, amount);
    }

    function assignPoints(address to, uint256 amount) external onlyOwner nonReentrancy {
        if (!members[to].exists) revert NotMember(to);
        require(amount > 0, "Amount must be greater than 0");

        members[to].balance += uint96(amount);
        totalPoints += amount;
        emit PointsAssigned(msg.sender, to, amount);   
    }

    function transferPoints(address to, uint256 amount) external onlyMember accountBanned nonReentrancy {
        if (!members[to].exists) revert NotMember(to);
        require(amount > 0, "Amount must be greater than 0");

        uint256 senderBal = members[msg.sender].balance;
        if (senderBal < amount) revert InsufficientPoints(senderBal, amount);

        uint256 beforeTotal = totalPoints;

        unchecked {members[msg.sender].balance = uint96(senderBal - amount); }
        members[to].balance += uint96(amount);

        assert(totalPoints == beforeTotal);

        emit PointsTransferred(msg.sender, to, amount);
    }

    function redeemReward(Reward rewardType) external onlyMember accountBanned nonReentrancy {
        uint256 rewardCost = pointsRequiredForRewards(rewardType);
        require(rewardCost > 0, "Invalid reward");

        uint256 bal = members[msg.sender].balance;
        if (bal < rewardCost) revert InsufficientPoints(bal, rewardCost);

        unchecked {members[msg.sender].balance = uint96(bal - rewardCost); }
        totalPoints -= rewardCost;

        emit RewardRedeemed(msg.sender, rewardType, rewardCost);     
    }

    function banAccount(address accountToBan) external onlyOwner {
        if(!members[accountToBan].exists) revert NotMember(accountToBan);
        bannedAccounts[accountToBan] = true;
        emit MemberBanned(accountToBan);

    }

    //VIEW FUNCTIONS
    function getMyBalance() external view onlyMember returns (uint256) {
        return members[msg.sender].balance;
    }

    function balanceOf(address account) external view onlyOwner returns (uint256) {
        if(!members[account].exists) revert NotMember(account);
        return members[account].balance;
    }

     function pointsRequiredForRewards(Reward rewardType) public pure returns (uint256) {
        if (rewardType == Reward.VIP) return 1000;
        if (rewardType == Reward.GOLD) return 500;
        if (rewardType == Reward.SILVER) return 250;
        if (rewardType == Reward.BRONZE) return 100;
        return 0;     
    }

   // RECEIVE & FALLBACK
    receive() external payable {
    if (bannedAccounts[msg.sender]) revert AccountBanned(msg.sender);
    
    emit ReceivedFunds(msg.sender, msg.value);
    }

fallback() external payable {
    if (bannedAccounts[msg.sender]) revert AccountBanned(msg.sender);
    
    fallbackCalls[msg.sender] += 1;

    if (fallbackCalls[msg.sender] >= 10) {
        bannedAccounts[msg.sender] = true;
        emit MemberBanned(msg.sender);
        
        revert AccountBanned(msg.sender);
    }

    if (msg.value > 0) {
        emit ReceivedFunds(msg.sender, msg.value);
    }    
    }
}