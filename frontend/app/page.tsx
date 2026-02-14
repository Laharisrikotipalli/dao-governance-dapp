"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import governorData from "./contracts/Governor.json";

const GOVERNOR_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export default function Home() {
  const [account, setAccount] = useState("");
  const [governor, setGovernor] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // Prevent SSR window errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const connectWallet = async () => {
    if (typeof window === "undefined") return;

    if (!(window as any).ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(
      (window as any).ethereum
    );

    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const gov = new ethers.Contract(
      GOVERNOR_ADDRESS,
      governorData.abi,
      signer
    );

    setAccount(address);
    setGovernor(gov);

    loadProposals(provider);
  };

  const loadProposals = async (provider: any) => {
    const gov = new ethers.Contract(
      GOVERNOR_ADDRESS,
      governorData.abi,
      provider
    );

    const events = await gov.queryFilter(
      gov.filters.ProposalCreated()
    );

    const formatted = await Promise.all(
      events.map(async (event: any) => {
        const id = event.args.proposalId.toString();
        const state = await gov.state(id);
        const votes = await gov.proposalVotes(id);

        return {
          id,
          description: event.args.description,
          state: Number(state),
          forVotes: votes.forVotes.toString(),
          againstVotes: votes.againstVotes.toString(),
          abstainVotes: votes.abstainVotes.toString(),
        };
      })
    );

    setProposals(formatted);
  };

  const vote = async (proposalId: string, support: number) => {
    if (!governor) return;

    const tx = await governor.castVote(proposalId, support);
    await tx.wait();

    const provider = new ethers.BrowserProvider(
      (window as any).ethereum
    );
    loadProposals(provider);
  };

  const getStateText = (state: number) => {
    const states = [
      "Pending",
      "Active",
      "Canceled",
      "Defeated",
      "Succeeded",
      "Queued",
      "Expired",
      "Executed",
    ];
    return states[state] || "Unknown";
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>DAO Governance DApp</h1>

      {!account ? (
        <button onClick={connectWallet}>
          Connect Wallet
        </button>
      ) : (
        <>
          <p>Connected: {account}</p>

          {proposals.map((p) => (
            <div key={p.id} style={{ marginTop: 20 }}>
              <p>{p.description}</p>
              <p>State: {getStateText(p.state)}</p>

              {p.state === 1 && (
                <>
                  <button onClick={() => vote(p.id, 1)}>
                    Vote For
                  </button>
                  <button onClick={() => vote(p.id, 0)}>
                    Vote Against
                  </button>
                  <button onClick={() => vote(p.id, 2)}>
                    Abstain
                  </button>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
