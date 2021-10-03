/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ArtistControl, ArtistControlInterface } from "../ArtistControl";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "artist",
        type: "address",
      },
    ],
    name: "ArtistApprovalRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "artist",
        type: "address",
      },
    ],
    name: "ArtistApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "artists",
        type: "address[]",
      },
    ],
    name: "ArtistBatchApprovalRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address[]",
        name: "artists",
        type: "address[]",
      },
    ],
    name: "ArtistBatchApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address",
      },
    ],
    name: "approveArtist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "artists",
        type: "address[]",
      },
    ],
    name: "approveArtistBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "approvedArtists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "artist",
        type: "address",
      },
    ],
    name: "revokeArtistApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "artists",
        type: "address[]",
      },
    ],
    name: "revokeArtistBatchApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061001a3361001f565b61006f565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6107108061007e6000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806371fc88411161005b57806371fc8841146100d0578063889c6116146100e35780638da5cb5b1461011b578063f2fde38b1461013657600080fd5b8063261b6f081461008d57806359424b78146100a2578063705ede3c146100b5578063715018a6146100c8575b600080fd5b6100a061009b366004610554565b610149565b005b6100a06100b0366004610533565b61022d565b6100a06100c3366004610554565b6102ac565b6100a061037b565b6100a06100de366004610533565b6103b1565b6101066100f1366004610533565b60016020526000908152604090205460ff1681565b60405190151581526020015b60405180910390f35b6000546040516001600160a01b039091168152602001610112565b6100a0610144366004610533565b61042c565b6000546001600160a01b0316331461017c5760405162461bcd60e51b815260040161017390610668565b60405180910390fd5b60005b81518110156101f2576000600160008484815181106101ae57634e487b7160e01b600052603260045260246000fd5b6020908102919091018101516001600160a01b03168252810191909152604001600020805460ff1916911515919091179055806101ea8161069d565b91505061017f565b507f2562d5bb4eb1b6b4d2c161edf2d21dded6c582bd1e60b5a7e14c3fa71f18c07081604051610222919061061b565b60405180910390a150565b6000546001600160a01b031633146102575760405162461bcd60e51b815260040161017390610668565b6001600160a01b038116600081815260016020818152604092839020805460ff191690921790915590519182527f7a6f91276a418f3cf3b4fc9df1f37747fc8c9e84d25f644b22de8eae751f8d959101610222565b6000546001600160a01b031633146102d65760405162461bcd60e51b815260040161017390610668565b60005b815181101561034b57600180600084848151811061030757634e487b7160e01b600052603260045260246000fd5b6020908102919091018101516001600160a01b03168252810191909152604001600020805460ff1916911515919091179055806103438161069d565b9150506102d9565b507f6c86e6599f381ea3fcef040370b6f0672314c7efbb1cdccc5f96bef495c9e32681604051610222919061061b565b6000546001600160a01b031633146103a55760405162461bcd60e51b815260040161017390610668565b6103af60006104c7565b565b6000546001600160a01b031633146103db5760405162461bcd60e51b815260040161017390610668565b6001600160a01b038116600081815260016020908152604091829020805460ff1916905590519182527f23d4d09651cfe4afd3afd9707a61b7f002f740560b25a740920231acc4b1eaaf9101610222565b6000546001600160a01b031633146104565760405162461bcd60e51b815260040161017390610668565b6001600160a01b0381166104bb5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b6064820152608401610173565b6104c4816104c7565b50565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b80356001600160a01b038116811461052e57600080fd5b919050565b600060208284031215610544578081fd5b61054d82610517565b9392505050565b60006020808385031215610566578182fd5b823567ffffffffffffffff8082111561057d578384fd5b818501915085601f830112610590578384fd5b8135818111156105a2576105a26106c4565b8060051b604051601f19603f830116810181811085821117156105c7576105c76106c4565b604052828152858101935084860182860187018a10156105e5578788fd5b8795505b8386101561060e576105fa81610517565b8552600195909501949386019386016105e9565b5098975050505050505050565b6020808252825182820181905260009190848201906040850190845b8181101561065c5783516001600160a01b031683529284019291840191600101610637565b50909695505050505050565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b60006000198214156106bd57634e487b7160e01b81526011600452602481fd5b5060010190565b634e487b7160e01b600052604160045260246000fdfea2646970667358221220a624bd6c5ab2d699c65e96c6d65be3fad881f0c59e9e79ff2a5cf4869a34e29064736f6c63430008040033";

export class ArtistControl__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ArtistControl> {
    return super.deploy(overrides || {}) as Promise<ArtistControl>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): ArtistControl {
    return super.attach(address) as ArtistControl;
  }
  connect(signer: Signer): ArtistControl__factory {
    return super.connect(signer) as ArtistControl__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ArtistControlInterface {
    return new utils.Interface(_abi) as ArtistControlInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ArtistControl {
    return new Contract(address, _abi, signerOrProvider) as ArtistControl;
  }
}