import { formatUnits, parseUnits } from '@ethersproject/units';
import { multicall } from '../../utils';

export const author = 'codingsh';
export const version = '0.1.0';

const abi = [
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

export async function strategy(
  space,
  network,
  provider,
  addresses,
  options,
  snapshot
) {
  const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';

  const response = await multicall(
    network,
    provider,
    abi,
    [
      [options.token,'balanceOf',[options.pancake]],
      [[options.pancake],'totalSupply'],
      ...addresses.map((address: any) => [
        options.pancake,
        'balanceOf',
        [address]
      ]),
      ...addresses.map((address: any) => [
        options.sharePool,
        'balanceOf',
        [address]
      ]),
      ...addresses.map((address: any) => [
        options.token,
        'balanceOf',
        [address]
      ])
    ],
    { blockTag }
  );

  const dittoPerLP = parseUnits(response[0][0].toString(), 18).div(
    response[1][0]
  );
  const lpBalances = response.slice(2, addresses.length + 2);
  const stakedLpBalances = response.slice(
    addresses.length + 2,
    addresses.length * 2 + 2
  );
  const tokenBalances = response.slice(
    addresses.length * 2 + 2,
    addresses.length * 3 + 2
  );

  return Object.fromEntries(
    Array(addresses.length)
      .fill('')
      .map((_, i) => {
        const lpBalance = lpBalances[i][0].add(stakedLpBalances[i][0]);
        const dittoLpBalance = lpBalance.mul(dittoPerLP).div(parseUnits('1', 18));

        return [
          addresses[i],
          parseFloat(
            formatUnits(
              dittoLpBalance
                .add(tokenBalances[i][0]),
              options.decimals
            )
          )
        ];
      })
  );
}
