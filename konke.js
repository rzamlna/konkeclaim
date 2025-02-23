import { useState, useEffect } from "react";
import { useAccount, useBalance, useContractWrite, usePrepareContractWrite } from "wagmi";
import { parseEther } from "viem";
import { Button } from "@/components/ui/button";

const CONTRACT_ADDRESS = "0xAFDc1B430B8250C43F39aF2C6eE32baFD2b1Cb9Cnpm"; // Replace with the correct contract address
const ABI = [
  {
    "inputs": [],
    "name": "claim",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getEligibleAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [eligibility, setEligibility] = useState(null);
  
  const { config } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "claim",
    value: parseEther("0.0002") // Matches CLAIM_FEE in the contract
  });
  const { write, isLoading, isSuccess } = useContractWrite(config);

  useEffect(() => {
    if (!address) return;
    
    async function checkEligibility() {
      try {
        const response = await fetch(`/api/check-eligibility?address=${address}`);
        const data = await response.json();
        setEligibility(data.amount);
      } catch (error) {
        console.error("Error checking eligibility:", error);
      }
    }
    
    checkEligibility();
  }, [address]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Claim KONKE Token</h1>
      {isConnected ? (
        <>
          <p className="mt-2">Address: {address}</p>
          {eligibility !== null ? (
            <p className="mt-2">You can claim: {eligibility} KONKE</p>
          ) : (
            <p className="mt-2">Checking eligibility...</p>
          )}
          <Button 
            onClick={() => write?.()} 
            disabled={!write || isLoading} 
            className="mt-4 bg-blue-500 hover:bg-blue-700">
            {isLoading ? "Processing..." : "Claim Now"}
          </Button>
          {isSuccess && <p className="mt-2 text-green-500">Claim successful!</p>}
        </>
      ) : (
        <p className="mt-4">Please connect your wallet</p>
      )}
    </div>
  );
}

// API handler for Vercel
export async function getServerSideProps({ query }) {
  const { address } = query;
  if (!address) {
    return { props: { amount: 0 } };
  }

  try {
    const response = await fetch(`https://base-rpc-url/api?module=proxy&action=eth_call&to=${CONTRACT_ADDRESS}&data=0x${address}`);
    const data = await response.json();
    const amount = parseInt(data.result, 16) / 1e18;
    return { props: { amount } };
  } catch (error) {
    console.error("Error fetching eligibility:", error);  }
}
