import { providers, Signer } from "ethers";
import { SongOrAlbumNFT } from "~/src/types/SongOrAlbumNFT";

import { Context } from "./contract.spec";

/**
 *
 * @param address
 * @param context
 * @returns An instance of the contract from the perspective of the user. Subsequent calls on the contract
 * are executed by the address passed in.
 */
export function connectAsUser(
  address: string | Signer | providers.Provider,
  context: Context
): SongOrAlbumNFT {
  return context.soa.connect(address);
}
