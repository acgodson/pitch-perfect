// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AvalancheRouterReceiver
 * @notice Receives CCIP messages and routes assets to Avalanche C-Chain via Teleporter
 * @dev Deploys on Avalanche to handle cross-chain transfers and route to C-Chain
 */
contract AvalancheRouterReceiver is CCIPReceiver, Ownable {
    using SafeERC20 for IERC20;

    address public immutable teleporterMessenger;
    bytes32 public immutable cChainBlockchainID;
    
    mapping(address => bool) public authorizedSenders;
    mapping(bytes32 => bool) public processedMessages;
    
    struct RouteRequest {
        address finalRecipient;
        address token;
        uint256 amount;
        bytes32 sourceChainSelector;
        address originalSender;
    }

    event MessageReceived(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address sender,
        address token,
        uint256 amount,
        address finalRecipient
    );

    event RouteToC Chain(
        bytes32 indexed messageId,
        address indexed finalRecipient,
        address token,
        uint256 amount,
        bytes32 teleporterMessageID
    );

    event AuthorizedSenderUpdated(address indexed sender, bool authorized);

    error UnauthorizedSender(address sender);
    error MessageAlreadyProcessed(bytes32 messageId);
    error InvalidRouteRequest();
    error TeleporterCallFailed();

    constructor(
        address _ccipRouter,
        address _teleporterMessenger,
        bytes32 _cChainBlockchainID
    ) CCIPReceiver(_ccipRouter) Ownable(msg.sender) {
        teleporterMessenger = _teleporterMessenger;
        cChainBlockchainID = _cChainBlockchainID;
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        bytes32 messageId = any2EvmMessage.messageId;
        uint64 sourceChainSelector = any2EvmMessage.sourceChainSelector;
        
        if (processedMessages[messageId]) {
            revert MessageAlreadyProcessed(messageId);
        }
        
        processedMessages[messageId] = true;
        
        address sender = abi.decode(any2EvmMessage.sender, (address));
        if (!authorizedSenders[sender]) {
            revert UnauthorizedSender(sender);
        }

        if (any2EvmMessage.destTokenAmounts.length == 0) {
            revert InvalidRouteRequest();
        }

        address token = any2EvmMessage.destTokenAmounts[0].token;
        uint256 amount = any2EvmMessage.destTokenAmounts[0].amount;
        
        address finalRecipient = abi.decode(any2EvmMessage.data, (address));
        
        emit MessageReceived(
            messageId,
            sourceChainSelector,
            sender,
            token,
            amount,
            finalRecipient
        );

        _routeToCChain(messageId, finalRecipient, token, amount);
    }

    function _routeToCChain(
        bytes32 messageId,
        address finalRecipient,
        address token,
        uint256 amount
    ) internal {
        bytes memory message = abi.encode(
            RouteRequest({
                finalRecipient: finalRecipient,
                token: token,
                amount: amount,
                sourceChainSelector: bytes32(0),
                originalSender: msg.sender
            })
        );

        IERC20(token).safeApprove(teleporterMessenger, amount);

        (bool success, bytes memory returnData) = teleporterMessenger.call(
            abi.encodeWithSignature(
                "sendCrossChainMessage((bytes32,address,bytes,uint256,address[],uint256[]))",
                cChainBlockchainID,
                finalRecipient,
                message,
                0,
                new address[](0),
                new uint256[](0)
            )
        );

        if (!success) {
            revert TeleporterCallFailed();
        }

        bytes32 teleporterMessageID = abi.decode(returnData, (bytes32));
        
        emit RouteToC Chain(
            messageId,
            finalRecipient,
            token,
            amount,
            teleporterMessageID
        );
    }

    function setAuthorizedSender(address sender, bool authorized) external onlyOwner {
        authorizedSenders[sender] = authorized;
        emit AuthorizedSenderUpdated(sender, authorized);
    }

    function setSendersBatch(address[] calldata senders, bool authorized) external onlyOwner {
        for (uint256 i = 0; i < senders.length; i++) {
            authorizedSenders[senders[i]] = authorized;
            emit AuthorizedSenderUpdated(senders[i], authorized);
        }
    }

    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }

    function withdrawTokens(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }

    function withdrawNative(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            to.transfer(balance);
        }
    }

    receive() external payable {}
}