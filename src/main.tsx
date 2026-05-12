import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Play,
  RotateCcw,
  Shuffle,
  Users,
} from "lucide-react";

import "./styles.css";
import clubLogo from "../images/pennyante-og.png";

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
  isBye?: boolean;
};

const MAX_PLAYERS = 32;

const roundNames = [
  "Round of 32",
  "Sweet 16",
  "Elite 8",
  "Final Four",
  "Finals",
];

function shuffleArray<T>(
  array: T[]
): T[] {
  const cloned = [...array];

  for (
    let i = cloned.length - 1;
    i > 0;
    i -= 1
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [cloned[i], cloned[j]] = [
      cloned[j],
      cloned[i],
    ];
  }

  return cloned;
}

function getBracketSize(
  playerCount: number
): number {
  if (playerCount <= 2) return 2;
  if (playerCount <= 4) return 4;
  if (playerCount <= 8) return 8;
  if (playerCount <= 16) return 16;

  return 32;
}

function getStartRound(
  bracketSize: number
): number {
  if (bracketSize === 32)
    return 1;

  if (bracketSize === 16)
    return 2;

  if (bracketSize === 8)
    return 3;

  if (bracketSize === 4)
    return 4;

  return 5;
}

function createEmptyMatches(): Match[] {
  const matches: Match[] = [];

  for (
    let round = 1;
    round <= 5;
    round += 1
  ) {
    const matchCount =
      2 ** (5 - round);

    for (
      let index = 0;
      index < matchCount;
      index += 1
    ) {
      matches.push({
        id: `r${round}-m${
          index + 1
        }`,
        round,
        index,
        isBye: false,
      });
    }
  }

  return matches;
}

function createBalancedByeSlots(
  slotCount: number,
  byeCount: number
): Set<number> {
  const byeSlots =
    new Set<number>();

  if (byeCount <= 0)
    return byeSlots;

  const matchCount =
    slotCount / 2;

  const halfMatchCount =
    matchCount / 2;

  const leftHalfMatches =
    Array.from(
      {
        length: halfMatchCount,
      },
      (_, index) => index
    );

  const rightHalfMatches =
    Array.from(
      {
        length: halfMatchCount,
      },
      (_, index) =>
        index + halfMatchCount
    );

  const leftBase = Math.floor(
    byeCount / 2
  );

  const extraBye =
    byeCount % 2;

  const leftTotal =
    leftBase +
    (extraBye &&
    Math.random() < 0.5
      ? 1
      : 0);

  const rightTotal =
    byeCount - leftTotal;

  shuffleArray(leftHalfMatches)
    .slice(0, leftTotal)
    .forEach((matchIndex) => {
      byeSlots.add(
        matchIndex * 2 +
          (Math.random() < 0.5
            ? 0
            : 1)
      );
    });

  shuffleArray(rightHalfMatches)
    .slice(0, rightTotal)
    .forEach((matchIndex) => {
      byeSlots.add(
        matchIndex * 2 +
          (Math.random() < 0.5
            ? 0
            : 1)
      );
    });

  return byeSlots;
}

function buildTournamentPlayers(
  names: string[],
  randomize: boolean
): Player[] {
  const cleanNames = names
    .map((name) =>
      name.trim()
    )
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);

  const orderedNames =
    randomize
      ? shuffleArray(cleanNames)
      : cleanNames;

  return orderedNames.map(
    (name, index) => ({
      seed: index + 1,
      name,
    })
  );
}

function createMatches(
  players: Player[]
): Match[] {
  const matches =
    createEmptyMatches();

  const activePlayers =
    players.filter((player) =>
      player.name.trim()
    );

  if (activePlayers.length === 0)
    return matches;

  const bracketSize =
    getBracketSize(
      activePlayers.length
    );

  const startRound =
    getStartRound(bracketSize);

  const byeCount =
    bracketSize -
    activePlayers.length;

  const byeSlots =
    createBalancedByeSlots(
      bracketSize,
      byeCount
    );

  const slots: Array<
    Player | null
  > = Array.from(
    { length: bracketSize },
    () => null
  );

  let playerIndex = 0;

  for (
    let slotIndex = 0;
    slotIndex < bracketSize;
    slotIndex += 1
  ) {
    if (
      byeSlots.has(slotIndex)
    )
      continue;

    slots[slotIndex] =
      activePlayers[playerIndex] ||
      null;

    playerIndex += 1;
  }

  const startRoundMatches =
    matches.filter(
      (match) =>
        match.round ===
        startRound
    );

  startRoundMatches.forEach(
    (match) => {
      const leftPlayer =
        slots[match.index * 2];

      const rightPlayer =
        slots[
          match.index * 2 + 1
        ];

      match.leftName =
        leftPlayer?.name || "";

      match.leftSeed =
        leftPlayer?.seed;

      match.rightName =
        rightPlayer?.name || "";

      match.rightSeed =
        rightPlayer?.seed;

      const hasLeft = Boolean(
        match.leftName
      );

      const hasRight = Boolean(
        match.rightName
      );

      if (
        hasLeft &&
        !hasRight
      ) {
        match.winnerName =
          match.leftName;

        match.winnerSeed =
          match.leftSeed;

        match.isBye = true;
      }

      if (
        !hasLeft &&
        hasRight
      ) {
        match.winnerName =
          match.rightName;

        match.winnerSeed =
          match.rightSeed;

        match.isBye = true;
      }
    }
  );

  return advanceWinners(
    matches
  );
}

function advanceWinners(
  input: Match[]
): Match[] {
  const matches = input.map(
    (match) => ({
      ...match,
    })
  );

  for (
    let round = 2;
    round <= 5;
    round += 1
  ) {
    const currentRoundMatches =
      matches.filter(
        (match) =>
          match.round === round
      );

    currentRoundMatches.forEach(
      (match) => {
        const leftSource =
          matches.find(
            (source) =>
              source.round ===
                round - 1 &&
              source.index ===
                match.index * 2
          );

        const rightSource =
          matches.find(
            (source) =>
              source.round ===
                round - 1 &&
              source.index ===
                match.index * 2 +
                  1
          );

        match.leftName =
          leftSource?.winnerName ||
          "";

        match.leftSeed =
          leftSource?.winnerSeed;

        match.rightName =
          rightSource?.winnerName ||
          "";

        match.rightSeed =
          rightSource?.winnerSeed;

        const winnerStillValid =
          match.winnerName &&
          (match.winnerName ===
            match.leftName ||
            match.winnerName ===
              match.rightName);

        if (!winnerStillValid) {
          match.winnerName =
            undefined;

          match.winnerSeed =
            undefined;
        }

        match.isBye = false;
      }
    );
  }

  return matches;
}

function App() {
  const [title, setTitle] =
    useState(
      "HEADS UP MAY 16, 2026"
    );

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [matches, setMatches] =
    useState<Match[]>(
      createEmptyMatches()
    );

  const [activeTab, setActiveTab] =
    useState<
      "bracket" | "players" | number
    >("players");

  const [bulkPlayers, setBulkPlayers] =
    useState("");

  const [
    isTournamentStarted,
    setIsTournamentStarted,
  ] = useState(false);

  const champion = useMemo(
    () =>
      matches.find(
        (match) =>
          match.round === 5
      )?.winnerName || "",
    [matches]
  );

  const registeredPlayers =
    players.filter((player) =>
      player.name.trim()
    ).length;

  function selectWinner(
    match: Match,
    side: "left" | "right"
  ) {
    if (match.isBye) return;

    const selectedName =
      side === "left"
        ? match.leftName
        : match.rightName;

    const selectedSeed =
      side === "left"
        ? match.leftSeed
        : match.rightSeed;

    if (!selectedName) return;

    setMatches((current) => {
      const updated =
        current.map((item) => {
          if (
            item.id !== match.id
          )
            return {
              ...item,
            };

          const isSameWinner =
            item.winnerName ===
            selectedName;

          return {
            ...item,
            winnerName:
              isSameWinner
                ? undefined
                : selectedName,
            winnerSeed:
              isSameWinner
                ? undefined
                : selectedSeed,
          };
        });

      return advanceWinners(
        updated
      );
    });
  }

  function applyBulkPlayers() {
    if (isTournamentStarted)
      return;

    const names = bulkPlayers
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean)
      .slice(0, MAX_PLAYERS);

    const updatedPlayers =
      buildTournamentPlayers(
        names,
        false
      );

    setPlayers(
      updatedPlayers
    );

    setMatches(
      createMatches(
        updatedPlayers
      )
    );

    setActiveTab("bracket");
  }

  function randomizeBracket() {
    if (isTournamentStarted)
      return;

    const names =
      players.length > 0
        ? players
            .map(
              (player) =>
                player.name
            )
            .filter(Boolean)
        : bulkPlayers
            .split("\n")
            .map((line) =>
              line.trim()
            )
            .filter(Boolean)
            .slice(
              0,
              MAX_PLAYERS
            );

    if (names.length === 0)
      return;

    const randomizedPlayers =
      buildTournamentPlayers(
        names,
        true
      );

    setPlayers(
      randomizedPlayers
    );

    setMatches(
      createMatches(
        randomizedPlayers
      )
    );

    setBulkPlayers(
      randomizedPlayers
        .map(
          (player) =>
            player.name
        )
        .join("\n")
    );

    setActiveTab("bracket");
  }

  function startTournament() {
    if (isTournamentStarted)
      return;

    const names =
      players.length > 0
        ? players
            .map(
              (player) =>
                player.name
            )
            .filter(Boolean)
        : bulkPlayers
            .split("\n")
            .map((line) =>
              line.trim()
            )
            .filter(Boolean)
            .slice(
              0,
              MAX_PLAYERS
            );

    if (names.length < 2) {
      alert(
        "Add at least 2 players before starting the tournament."
      );

      return;
    }

    if (players.length === 0) {
      const updatedPlayers =
        buildTournamentPlayers(
          names,
          false
        );

      setPlayers(
        updatedPlayers
      );

      setMatches(
        createMatches(
          updatedPlayers
        )
      );
    }

    setIsTournamentStarted(
      true
    );

    setActiveTab("bracket");
  }

  function resetTournament() {
    const confirmed =
      window.confirm(
        "Are you sure you want to reset the tournament? This will clear all players, seating, winners, and bracket progress."
      );

    if (!confirmed) return;

    setTitle(
      "HEADS UP MAY 16, 2026"
    );

    setPlayers([]);

    setMatches(
      createEmptyMatches()
    );

    setBulkPlayers("");

    setIsTournamentStarted(
      false
    );

    setActiveTab("players");
  }

  return (
    <main>
      <header className="app-header">
        <input
          className="title-input"
          value={title}
          disabled={
            isTournamentStarted
          }
          onChange={(
            event
          ) =>
            setTitle(
              event.target.value
            )
          }
        />

        <div className="toolbar">
          <div className="player-count">
            Registered:
            {" "}
            <strong>
              {
                registeredPlayers
              }
            </strong>
            {" / "}
            {MAX_PLAYERS}
          </div>

          {!isTournamentStarted && (
            <button
              onClick={
                randomizeBracket
              }
            >
              <Shuffle size={16} />
              Randomize
            </button>
          )}

          {!isTournamentStarted && (
            <button
              onClick={
                startTournament
              }
            >
              <Play size={16} />
              Start Tournament
            </button>
          )}

          <button
            onClick={
              resetTournament
            }
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={
            activeTab ===
            "bracket"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "bracket"
            )
          }
        >
          Full Bracket
        </button>

        {roundNames.map(
          (
            roundName,
            index
          ) => (
            <button
              key={roundName}
              className={
                activeTab ===
                index + 1
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  index + 1
                )
              }
            >
              {roundName}
            </button>
          )
        )}

        <button
          className={
            activeTab ===
            "players"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "players"
            )
          }
        >
          <Users size={16} />
          Players
        </button>
      </nav>

      {champion && (
        <section className="champion-banner">
          Tournament
          Champion:
          {" "}
          <strong>
            {champion}
          </strong>
        </section>
      )}

      {activeTab ===
        "bracket" && (
        <BracketView
          title={title}
          matches={matches}
          selectWinner={
            selectWinner
          }
        />
      )}

      {typeof activeTab ===
        "number" && (
        <RoundView
          round={activeTab}
          matches={matches.filter(
            (match) =>
              match.round ===
              activeTab
          )}
          selectWinner={
            selectWinner
          }
        />
      )}

      {activeTab ===
        "players" && (
        <PlayersView
          bulkPlayers={
            bulkPlayers
          }
          setBulkPlayers={
            setBulkPlayers
          }
          applyBulkPlayers={
            applyBulkPlayers
          }
          isTournamentStarted={
            isTournamentStarted
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
    side:
      | "left"
      | "right"
  ) => void;
}) {
  const leftWinner = Boolean(
    match.leftName &&
      match.winnerName ===
        match.leftName
  );

  const rightWinner =
    Boolean(
      match.rightName &&
        match.winnerName ===
          match.rightName
    );

  return (
    <div className="match-card">
      <button
        className={`match-slot ${
          leftWinner
            ? "winner"
            : ""
        }`}
        onClick={() =>
          selectWinner(
            match,
            "left"
          )
        }
      >
        {leftWinner && (
          <span className="winner-tag">
            {match.isBye
              ? "BYE"
              : "WINNER"}
          </span>
        )}

        <span className="player-number">
          {match.leftSeed
            ? match.leftSeed
            : ""}
        </span>

        <strong>
          {match.leftName ||
            ""}
        </strong>
      </button>

      <button
        className={`match-slot ${
          rightWinner
            ? "winner"
            : ""
        }`}
        onClick={() =>
          selectWinner(
            match,
            "right"
          )
        }
      >
        {rightWinner && (
          <span className="winner-tag">
            {match.isBye
              ? "BYE"
              : "WINNER"}
          </span>
        )}

        <span className="player-number">
          {match.rightSeed
            ? match.rightSeed
            : ""}
        </span>

        <strong>
          {match.rightName ||
            ""}
        </strong>
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
    side:
      | "left"
      | "right"
  ) => void;
}) {
  const roundMatches = (
    round: number
  ) =>
    matches.filter(
      (match) =>
        match.round === round
    );

  const final =
    roundMatches(5)[0];

  return (
    <section className="bracket-screen">
      <h1>{title}</h1>

      <div className="bracket-canvas">
        <div className="half left-half">
          <BracketColumn
            matches={roundMatches(
              1
            ).slice(0, 8)}
            round={1}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              2
            ).slice(0, 4)}
            round={2}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              3
            ).slice(0, 2)}
            round={3}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              4
            ).slice(0, 1)}
            round={4}
            selectWinner={
              selectWinner
            }
          />
        </div>

        <div className="finals-panel">
          <img
            src={clubLogo}
            alt="Club Logo"
            className="club-logo"
          />

          <h2>FINALS</h2>

          {final && (
            <MatchCard
              match={final}
              selectWinner={
                selectWinner
              }
            />
          )}

          <div className="champion-card">
            {final?.winnerName ||
              ""}
          </div>

          <p>
            TOURNAMENT
            CHAMPION
          </p>
        </div>

        <div className="half right-half">
          <BracketColumn
            matches={roundMatches(
              4
            ).slice(1, 2)}
            round={4}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              3
            ).slice(2, 4)}
            round={3}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              2
            ).slice(4, 8)}
            round={2}
            selectWinner={
              selectWinner
            }
          />

          <BracketColumn
            matches={roundMatches(
              1
            ).slice(8, 16)}
            round={1}
            selectWinner={
              selectWinner
            }
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
    side:
      | "left"
      | "right"
  ) => void;
}) {
  return (
    <div
      className={`bracket-column round-${round}`}
    >
      {matches.map(
        (match) => (
          <MatchCard
            key={match.id}
            match={match}
            selectWinner={
              selectWinner
            }
          />
        )
      )}
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
    side:
      | "left"
      | "right"
  ) => void;
}) {
  return (
    <section className="round-screen">
      <h2>
        {
          roundNames[
            round - 1
          ]
        }
      </h2>

      <div
        className={`round-grid round-grid-${round}`}
      >
        {matches.map(
          (match) => (
            <MatchCard
              key={match.id}
              match={match}
              selectWinner={
                selectWinner
              }
            />
          )
        )}
      </div>
    </section>
  );
}

function PlayersView({
  bulkPlayers,
  setBulkPlayers,
  applyBulkPlayers,
  isTournamentStarted,
}: {
  bulkPlayers: string;

  setBulkPlayers: (
    value: string
  ) => void;

  applyBulkPlayers: () => void;

  isTournamentStarted: boolean;
}) {
  return (
    <section className="players-screen">
      <h2>Players</h2>

      <div className="bulk-import-card">
        <div className="bulk-import-header">
          <div>
            <h3>
              Paste Players
            </h3>

            <p>
              {isTournamentStarted
                ? "Tournament is locked. Reset to edit players."
                : "Paste one player per line. Supports 1 to 32 players."}
            </p>
          </div>

          {!isTournamentStarted && (
            <button
              onClick={
                applyBulkPlayers
              }
            >
              Apply Player
              List
            </button>
          )}
        </div>

        <textarea
          className="bulk-player-textarea"
          placeholder={`John Smith\nMike Johnson\nSarah Wilson`}
          value={
            bulkPlayers
          }
          disabled={
            isTournamentStarted
          }
          onChange={(
            event
          ) =>
            setBulkPlayers(
              event.target
                .value
            )
          }
        />
      </div>
    </section>
  );
}

createRoot(
  document.getElementById(
    "root"
  )!
).render(<App />);