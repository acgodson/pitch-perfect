// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

/**
 * @title PitchPerfectSender
 * @notice Multi-chain sender contract for voice-controlled cross-chain payments
 * @dev Deploys on source EVM chains to send tokens via CCIP
 */
contract PitchPerfectSender is Ownable {
    using SafeERC20 for IERC20;

    uint256 constant GAS_LIMIT = 250_000;
    uint256 constant SVM_COMPUTE_UNITS = 0;

    IRouterClient public immutable ccipRouter;
    LinkTokenInterface public immutable linkToken;

    enum PayFeesIn {
        Native,
        LINK
    }

    enum DestinationType {
        CCIP_EVM,
        CCIP_TELEPORTER,
        CCIP_SVM
    }

    event PaymentSent(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        address token,
        bytes32 messageId,
        DestinationType destinationType,
        uint64 destinationChainSelector
    );

    error InsufficientBalance(uint256 available, uint256 required);
    error InvalidDestination();
    error TokenTransferFailed();
    error InvalidFeePayment();

    constructor(
        address _ccipRouter,
        address _linkToken
    ) Ownable(msg.sender) {
        ccipRouter = IRouterClient(_ccipRouter);
        linkToken = LinkTokenInterface(_linkToken);
    }

    function sendToEOA(
        address recipient,
        address token,
        uint256 amount,
        uint64 destinationChainSelector,
        PayFeesIn payFeesIn
    ) external payable returns (bytes32 messageId) {
        return _executeCCIPTransfer(
            recipient,
            token,
            amount,
            destinationChainSelector,
            payFeesIn,
            DestinationType.CCIP_EVM,
            abi.encode(recipient),
            ""
        );
    }

    function sendToAvalancheCChain(
        address recipient,
        address token,
        uint256 amount,
        address avalancheReceiver,
        uint64 destinationChainSelector,
        PayFeesIn payFeesIn
    ) external payable returns (bytes32 messageId) {
        return _executeCCIPTransfer(
            avalancheReceiver,
            token,
            amount,
            destinationChainSelector,
            payFeesIn,
            DestinationType.CCIP_TELEPORTER,
            abi.encode(avalancheReceiver),
            abi.encode(recipient)
        );
    }

    function sendToSolana(
        string memory solanaWallet,
        address token,
        uint256 amount,
        uint64 destinationChainSelector,
        PayFeesIn payFeesIn
    ) external payable returns (bytes32 messageId) {
        return _executeCCIPTransfer(
            address(0),
            token,
            amount,
            destinationChainSelector,
            payFeesIn,
            DestinationType.CCIP_SVM,
            _getDefaultSolanaReceiver(),
            abi.encode(solanaWallet)
        );
    }

    function _executeCCIPTransfer(
        address receiver,
        address token,
        uint256 amount,
        uint64 destinationChainSelector,
        PayFeesIn payFeesIn,
        DestinationType destinationType,
        bytes memory receiverEncoded,
        bytes memory messageData
    ) internal returns (bytes32 messageId) {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: amount
        });

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: receiverEncoded,
            data: messageData,
            tokenAmounts: tokenAmounts,
            extraArgs: _buildExtraArgs(destinationType, messageData),
            feeToken: payFeesIn == PayFeesIn.LINK ? address(linkToken) : address(0)
        });

        uint256 fees = ccipRouter.getFee(destinationChainSelector, message);
        
        IERC20(token).safeApprove(address(ccipRouter), amount);

        if (payFeesIn == PayFeesIn.LINK) {
            linkToken.transferFrom(msg.sender, address(this), fees);
            linkToken.approve(address(ccipRouter), fees);
            messageId = ccipRouter.ccipSend(destinationChainSelector, message);
        } else {
            if (msg.value < fees) revert InsufficientBalance(msg.value, fees);
            messageId = ccipRouter.ccipSend{value: fees}(destinationChainSelector, message);
            
            if (msg.value > fees) {
                payable(msg.sender).transfer(msg.value - fees);
            }
        }

        emit PaymentSent(msg.sender, receiver, amount, token, messageId, destinationType, destinationChainSelector);
        return messageId;
    }

    function _buildExtraArgs(
        DestinationType destinationType,
        bytes memory additionalData
    ) internal pure returns (bytes memory) {
        if (destinationType == DestinationType.CCIP_SVM) {
            return Client._argsToBytes(
                Client.EVMExtraArgsV1({
                    gasLimit: SVM_COMPUTE_UNITS
                })
            );
        } else {
            return Client._argsToBytes(
                Client.EVMExtraArgsV1({
                    gasLimit: GAS_LIMIT
                })
            );
        }
    }

    function _getDefaultSolanaReceiver() internal pure returns (bytes memory) {
        return abi.encode(address(0x1111111111111111111111111111111111111111));
    }

    function quoteCrossChainTransfer(
        address token,
        uint256 amount,
        uint64 destinationChainSelector,
        PayFeesIn payFeesIn,
        DestinationType destinationType
    ) external view returns (uint256 cost) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: token, amount: amount});

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: destinationType == DestinationType.CCIP_SVM 
                ? _getDefaultSolanaReceiver() 
                : abi.encode(address(0)),
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: _buildExtraArgs(destinationType, ""),
            feeToken: payFeesIn == PayFeesIn.LINK ? address(linkToken) : address(0)
        });

        return ccipRouter.getFee(destinationChainSelector, message);
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