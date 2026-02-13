"use client";

import { useState } from "react";
import { ethers } from "ethers";
import governorData from "./contracts/Governor.json";

const GOVERNOR_ADDRESS = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS as string;


export default function Home() {
  const [account, setAccount] = useState<string>("");
  const [governor, setGovernor] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
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

  // LOAD PROPOSALS
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

  // VOTE FUNCTION
  const vote = async (proposalId: string, support: number) => {
    if (!governor) return;

    try {
      const tx = await governor.castVote(proposalId, support);
      await tx.wait();
      alert("Vote submitted!");

      // reload proposals after voting
      const provider = new ethers.BrowserProvider(window.ethereum);
      loadProposals(provider);
    } catch (error) {
      console.error(error);
      alert("Voting failed!");
    }
  };

  // STATE TEXT
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
    <div
      style={{
        padding: 40,
        background: "white",
        color: "black",
        minHeight: "100vh",
        fontFamily: "Arial",
      }}
    >
      <h1>DAO Governance DApp</h1>

      {!account ? (
        <button
          data-testid="connect-wallet-button"
          onClick={connectWallet}
          style={{
            padding: 10,
            background: "blue",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <div>
          <p data-testid="user-address">
            <strong>Connected:</strong> {account}
          </p>

          <h2>Proposals</h2>

          {proposals.length === 0 && <p>No proposals found</p>}

          {proposals.map((p) => (
            <div
              key={p.id}
              data-testid="proposal-list-item"
              style={{
                border: "1px solid black",
                padding: 15,
                marginTop: 15,
                borderRadius: 6,
              }}
            >
              <p><strong>ID:</strong> {p.id}</p>
              <p><strong>Description:</strong> {p.description}</p>
              <p><strong>State:</strong> {getStateText(p.state)}</p>

              <p>For: {p.forVotes}</p>
              <p>Against: {p.againstVotes}</p>
              <p>Abstain: {p.abstainVotes}</p>

              {p.state === 1 && (
                <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                  <button
                    style={{
                      padding: 8,
                      background: "green",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => vote(p.id, 1)}
                  >
                    Vote For
                  </button>

                  <button
                    style={{
                      padding: 8,
                      background: "red",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => vote(p.id, 0)}
                  >
                    Vote Against
                  </button>

                  <button
                    style={{
                      padding: 8,
                      background: "gray",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => vote(p.id, 2)}
                  >
                    Abstain
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
