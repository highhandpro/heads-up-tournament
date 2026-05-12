import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  RotateCcw,
  Shuffle,
  Users,
} from "lucide-react";

import "./styles.css";

type Player = {
  seed: number;
  name: string;
};

type Match = {
  id: string;
  round: number;
  index: number;
  leftSeed?: number;
  rightSeed?: number;
  leftName?: string;
  rightName?: string;
  winnerSeed?: number;
  winnerName?: string;
};

const seedPairs = [
  [1, 32],
  [16, 17],
  [8, 25],
  [9, 24],
  [4, 29],
  [13, 20],
  [5, 28],
  [12, 21],
  [2, 31],
  [15, 18],
  [7, 26],
  [10, 23],
  [3, 30],
  [14, 19],
  [6, 27],
  [11, 22],
];

const roundNames = [
  "Round of 32",
  "Sweet 16",
  "Elite 8",
  "Final Four",
  "Finals",
];

function createPlayers(): Player[] {
  return Array.from({ length: 32 }, (_, index) => ({
    seed: index + 1,
    name: "",
  }));
}

function shuffleArray<T>(array: T[]): T[] {
  const cloned = [...array];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}

function playerName(players: Player[], seed: number): string {
  return players.find((player) => player.seed === seed)?.name || "";
}

function createMatches(players: Player[]): Match[] {
  const matches: Match[] = [];

  seedPairs.forEach(([leftSeed, rightSeed], index) => {
    matches.push({
      id: `r1-m${index + 1}`,
      round: 1,
      index,
      leftSeed,
      rightSeed,
      leftName: playerName(players, leftSeed),
      rightName: playerName(players, rightSeed),
    });
  });

  for (let round = 2; round <= 5; round += 1) {
    const matchCount = 2 ** (5 - round);

    for (let index = 0; index < matchCount; index += 1) {
      matches.push({
        id: `r${round}-m${index + 1}`,
        round,
        index,
      });
    }
  }

  return advanceWinners(matches);
}

function advanceWinners(input: Match[]): Match[] {
  const matches = input.map((match) => ({ ...match }));

  for (let round = 2; round <= 5; round += 1) {
    const roundMatches = matches.filter((match) => match.round === round);

    roundMatches.forEach((match) => {
      const leftSource = matches.find(
        (source) =>
          source.round === round - 1 &&
          source.index === match.index * 2
      );

      const rightSource = matches.find(
        (source) =>
          source.round === round - 1 &&
          source.index === match.index * 2 + 1
      );

      match.leftName = leftSource?.winnerName || "";
      match.leftSeed = leftSource?.winnerSeed;

      match.rightName = rightSource?.winnerName || "";
      match.rightSeed = rightSource?.winnerSeed;

      const winnerStillValid =
        match.winnerName &&
        (match.winnerName === match.leftName ||
          match.winnerName === match.rightName);

      if (!winnerStillValid) {
        match.winnerName = undefined;
        match.winnerSeed = undefined;
      }
    });
  }

  return matches;
}

function updateRoundOneNames(
  players: Player[],
  matches: Match[]
): Match[] {
  const updated = matches.map((match) => {
    if (match.round !== 1) return { ...match };

    return {
      ...match,
      leftName: match.leftSeed
        ? playerName(players, match.leftSeed)
        : "",
      rightName: match.rightSeed
        ? playerName(players, match.rightSeed)
        : "",
    };
  });

  return advanceWinners(updated);
}

function App() {
  const initialPlayers = createPlayers();

  const [title, setTitle] = useState(
    "HEADS UP MAY 16, 2026"
  );

  const [players, setPlayers] =
    useState<Player[]>(initialPlayers);

  const [matches, setMatches] = useState<Match[]>(
    createMatches(initialPlayers)
  );

  const [activeTab, setActiveTab] =
    useState<"bracket" | "players" | number>("bracket");

  const [bulkPlayers, setBulkPlayers] = useState("");

  const champion = useMemo(
    () =>
      matches.find((match) => match.round === 5)?.winnerName || "",
    [matches]
  );

  function selectWinner(
    match: Match,
    side: "left" | "right"
  ) {
    const name =
      side === "left" ? match.leftName : match.rightName;

    const seed =
      side === "left" ? match.leftSeed : match.rightSeed;

    if (!name && !seed) return;

    setMatches((current) => {
      const updated = current.map((item) => {
        if (item.id !== match.id) return { ...item };

        const selectedName = name || `Seed ${seed}`;

        const isSameWinner =
          item.winnerName === selectedName;

        return {
          ...item,
          winnerName: isSameWinner
            ? undefined
            : selectedName,
          winnerSeed: isSameWinner
            ? undefined
            : seed,
        };
      });

      return advanceWinners(updated);
    });
  }

  function changePlayerName(
    seed: number,
    name: string
  ) {
    const updatedPlayers = players.map((player) =>
      player.seed === seed
        ? { ...player, name }
        : player
    );

    setPlayers(updatedPlayers);

    setMatches((current) =>
      updateRoundOneNames(updatedPlayers, current)
    );
  }

  function applyBulkPlayers() {
    const lines = bulkPlayers
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 32);

    const updatedPlayers = players.map(
      (player, index) => ({
        ...player,
        name: lines[index] || "",
      })
    );

    setPlayers(updatedPlayers);

    setMatches((current) =>
      updateRoundOneNames(updatedPlayers, current)
    );
  }

  function randomizeBracket() {
    const names = players
      .map((player) => player.name)
      .filter(Boolean);

    const shuffled = shuffleArray(names);

    const randomizedPlayers = players.map(
      (player, index) => ({
        ...player,
        name: shuffled[index] || "",
      })
    );

    setPlayers(randomizedPlayers);

    const freshMatches = createMatches(randomizedPlayers);

    setMatches(freshMatches);

    setBulkPlayers(
      randomizedPlayers
        .map((player) => player.name)
        .join("\n")
    );
  }

  function resetTournament() {
    const blankPlayers = createPlayers();

    setTitle("HEADS UP MAY 16, 2026");

    setPlayers(blankPlayers);

    setMatches(createMatches(blankPlayers));

    setBulkPlayers("");
  }

  return (
    <main>
      <header className="app-header">
        <input
          className="title-input"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          aria-label="Tournament title"
        />

        <div className="toolbar">
          <button onClick={randomizeBracket}>
            <Shuffle size={16} /> Randomize
          </button>

          <button onClick={resetTournament}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={
            activeTab === "bracket"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("bracket")
          }
        >
          Full Bracket
        </button>

        {roundNames.map(
          (roundName, index) => (
            <button
              key={roundName}
              className={
                activeTab === index + 1
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(index + 1)
              }
            >
              {roundName}
            </button>
          )
        )}

        <button
          className={
            activeTab === "players"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("players")
          }
        >
          <Users size={16} /> Players
        </button>
      </nav>

      {champion && (
        <section className="champion-banner">
          Tournament Champion:
          {" "}
          <strong>{champion}</strong>
        </section>
      )}

      {activeTab === "bracket" && (
        <BracketView
          title={title}
          matches={matches}
          selectWinner={selectWinner}
        />
      )}

      {typeof activeTab === "number" && (
        <RoundView
          round={activeTab}
          matches={matches.filter(
            (match) =>
              match.round === activeTab
          )}
          selectWinner={selectWinner}
        />
      )}

      {activeTab === "players" && (
        <PlayersView
          players={players}
          changePlayerName={
            changePlayerName
          }
          bulkPlayers={bulkPlayers}
          setBulkPlayers={
            setBulkPlayers
          }
          applyBulkPlayers={
            applyBulkPlayers
          }
        />
      )}
    </main>
  );
}

function MatchCard({
  match,
  selectWinner,
}: {
  match: Match;
  selectWinner: (
    match: Match,
    side: "left" | "right"
  ) => void;
}) {
  const leftLabel =
    match.leftName ||
    (match.leftSeed ? "" : "TBD");

  const rightLabel =
    match.rightName ||
    (match.rightSeed ? "" : "TBD");

  const leftWinner =
    match.winnerName ===
    (match.leftName ||
      `Seed ${match.leftSeed}`);

  const rightWinner =
    match.winnerName ===
    (match.rightName ||
      `Seed ${match.rightSeed}`);

  return (
    <div className="match-card">
      <button
        className={`match-slot ${
          leftWinner ? "winner" : ""
        }`}
        onClick={() =>
          selectWinner(match, "left")
        }
      >
        {leftWinner && (
          <span className="winner-tag">
            WINNER
          </span>
        )}

        <span>{match.leftSeed ?? ""}</span>

        <strong>{leftLabel}</strong>
      </button>

      <button
        className={`match-slot ${
          rightWinner ? "winner" : ""
        }`}
        onClick={() =>
          selectWinner(match, "right")
        }
      >
        {rightWinner && (
          <span className="winner-tag">
            WINNER
          </span>
        )}

        <span>{match.rightSeed ?? ""}</span>

        <strong>{rightLabel}</strong>
      </button>
    </div>
  );
}

function BracketView({
  title,
  matches,
  selectWinner,
}: {
  title: string;
  matches: Match[];
  selectWinner: (
    match: Match,
    side: "left" | "right"
  ) => void;
}) {
  const roundMatches = (round: number) =>
    matches.filter(
      (match) => match.round === round
    );

  const final = roundMatches(5)[0];

  return (
    <section className="bracket-screen">
      <h1>{title}</h1>

      <div className="bracket-canvas">
        <div className="half left-half">
          <BracketColumn
            matches={roundMatches(1).slice(
              0,
              8
            )}
            round={1}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(2).slice(
              0,
              4
            )}
            round={2}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(3).slice(
              0,
              2
            )}
            round={3}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(4).slice(
              0,
              1
            )}
            round={4}
            selectWinner={selectWinner}
          />
        </div>

        <div className="finals-panel">
          <h2>FINALS</h2>

          {final && (
            <MatchCard
              match={final}
              selectWinner={selectWinner}
            />
          )}

          <div className="champion-card">
            {final?.winnerName || ""}
          </div>

          <p>TOURNAMENT CHAMPION</p>
        </div>

        <div className="half right-half">
          <BracketColumn
            matches={roundMatches(4).slice(
              1,
              2
            )}
            round={4}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(3).slice(
              2,
              4
            )}
            round={3}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(2).slice(
              4,
              8
            )}
            round={2}
            selectWinner={selectWinner}
          />

          <BracketColumn
            matches={roundMatches(1).slice(
              8,
              16
            )}
            round={1}
            selectWinner={selectWinner}
          />
        </div>
      </div>
    </section>
  );
}

function BracketColumn({
  matches,
  round,
  selectWinner,
}: {
  matches: Match[];
  round: number;
  selectWinner: (
    match: Match,
    side: "left" | "right"
  ) => void;
}) {
  return (
    <div
      className={`bracket-column round-${round}`}
    >
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          selectWinner={selectWinner}
        />
      ))}
    </div>
  );
}

function RoundView({
  round,
  matches,
  selectWinner,
}: {
  round: number;
  matches: Match[];
  selectWinner: (
    match: Match,
    side: "left" | "right"
  ) => void;
}) {
  return (
    <section className="round-screen">
      <h2>{roundNames[round - 1]}</h2>

      <div
        className={`round-grid round-grid-${round}`}
      >
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            selectWinner={selectWinner}
          />
        ))}
      </div>
    </section>
  );
}

function PlayersView({
  players,
  changePlayerName,
  bulkPlayers,
  setBulkPlayers,
  applyBulkPlayers,
}: {
  players: Player[];

  changePlayerName: (
    seed: number,
    name: string
  ) => void;

  bulkPlayers: string;

  setBulkPlayers: (
    value: string
  ) => void;

  applyBulkPlayers: () => void;
}) {
  return (
    <section className="players-screen">
      <h2>Players</h2>

      <div className="bulk-import-card">
        <div className="bulk-import-header">
          <div>
            <h3>Paste Players</h3>

            <p>
              Paste one player per line.
              The first 32 names will
              fill seeds 1 through 32.
            </p>
          </div>

          <button onClick={applyBulkPlayers}>
            Apply Player List
          </button>
        </div>

        <textarea
          className="bulk-player-textarea"
          placeholder={`Paste one player per line...\n\nJohn Smith\nMike Johnson\nSarah Wilson`}
          value={bulkPlayers}
          onChange={(event) =>
            setBulkPlayers(
              event.target.value
            )
          }
        />
      </div>

      <div className="players-grid">
        {players.map((player) => (
          <label
            className="player-input"
            key={player.seed}
          >
            <span>{player.seed}</span>

            <input
              value={player.name}
              placeholder={`Seed ${player.seed}`}
              onChange={(event) =>
                changePlayerName(
                  player.seed,
                  event.target.value
                )
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

createRoot(
  document.getElementById("root")!
).render(<App />);