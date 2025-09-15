// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract PointsSystem {
    uint public immutable owner;

    enum Reward {VIP, GOLD, SILVER, BRONZE}

    //Struct
    struct Member {
        bool exists;
        uint96 balance;
        uint48 joinedAt;
    }

    //mappings
    mapping(address => Member) private _members;
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

    //Custom Errors
    error NotOwner();
    error NotMember(address account);
    error AlreadyMember(address account);
    error InsufficientBalance(uint256 availableBalance, uint256 required);
  
    
    //Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyMember(){
        if(!_members[msg.sender].exists) revert NotMember(msg.sender);
        _;
    }
    modifier accountBanned(){
        require(!bannedAccounts[msg.sender], "Account is banned");
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

     
    function joinAsMember() external accountBanned {
        if(!_members[msg.sender].exists) revert AlreadyMember(msg.sender);
        _members[msg.sender] = Member(true, 0, uint48(block.timestamp));
        emit MemberJoined(msg.sender, uint48(block.timestamp));
    }

    function earnPoints(uint256 amount) external onlyMember  accountBanned nonReentrancy {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000, "Exceeds max earn per tx");

        _members[msg.sender].balance += uint96(amount);
        totalPoints += amount;
        emit PointsEarned(msg.sender, amount);
    }

    function assignPoints(address to, uint256 amount) external onlyOwner nonReentrancy {
        if (!_members[to].exists) revert NotMember(to);
        require(amount > 0, "Amount must be greater than 0");

        _members[to].balance += uint96(amount);
        totalPoints += amount;
        emit PointsAssigned(msg.sender, to, amount);   
    }

    function transferPoints(address to, uint256 amount) external onlyOwner nonReentrancy {
        
    }



    
}