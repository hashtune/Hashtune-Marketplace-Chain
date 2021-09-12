import { providers, Signer } from "ethers";
import { SongOrAlbum } from "~/src/types/SongOrAlbum";
import { Context } from "./sample-test";

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
): SongOrAlbum {
  return context.soa.connect(address);
}
