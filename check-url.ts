
import { getExplorerURL } from 'x402-stacks';

const txId = '0x1234567890abcdef';
const testnetUrl = getExplorerURL(txId, 'testnet');
const mainnetUrl = getExplorerURL(txId, 'mainnet');

console.log('Testnet URL:', testnetUrl);
console.log('Mainnet URL:', mainnetUrl);
