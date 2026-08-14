import { getDatabaseAsync } from "@/db/database";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";

export type SeasonMatchHighlight = {
  opponent: string;
  matchDate: string;
  ownScore: number;
  opponentScore: number;
  location: "home" | "away";
};

export type SeasonTeamStats = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  trainings: number;
  fineAmountCents: number;
  highestWin: SeasonMatchHighlight | null;
  biggestLoss: SeasonMatchHighlight | null;
};

type MatchRow = {
  opponent: string;
  match_date: string;
  location: string;
  own_score: number;
  opponent_score: number;
};

export async function getSeasonTeamStatsAsync(seasonId: number): Promise<SeasonTeamStats> {
  const db = await getDatabaseAsync();
  const settings = await getTeamSettingsAsync();
  const includeFriendlies = settings?.includeFriendlyMatchesInStats ?? true;
  const [matches, trainingRow, fineRow] = await Promise.all([
    db.getAllAsync<MatchRow>(
      `SELECT opponent, match_date, location, own_score, opponent_score
       FROM match_day_matches
       WHERE season_id = ?
         AND own_score IS NOT NULL
         AND opponent_score IS NOT NULL
         AND (? = 1 OR category <> 'friendly')`,
      [seasonId, includeFriendlies ? 1 : 0],
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM events
       WHERE season_id = ? AND type = 'training'`,
      [seasonId],
    ),
    db.getFirstAsync<{ amount_cents: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0) AS amount_cents
       FROM player_fines
       WHERE season_id = ? AND is_carried_over = 0`,
      [seasonId],
    ),
  ]);

  const wins = matches.filter((match) => match.own_score > match.opponent_score);
  const losses = matches.filter((match) => match.own_score < match.opponent_score);

  return {
    matches: matches.length,
    wins: wins.length,
    draws: matches.filter((match) => match.own_score === match.opponent_score).length,
    losses: losses.length,
    goalsFor: matches.reduce((total, match) => total + match.own_score, 0),
    goalsAgainst: matches.reduce((total, match) => total + match.opponent_score, 0),
    trainings: Number(trainingRow?.count ?? 0),
    fineAmountCents: Number(fineRow?.amount_cents ?? 0),
    highestWin: mapHighlight(pickLargestMargin(wins, "win")),
    biggestLoss: mapHighlight(pickLargestMargin(losses, "loss")),
  };
}

function pickLargestMargin(matches: MatchRow[], type: "win" | "loss") {
  return [...matches].sort((left, right) => {
    const leftMargin = type === "win"
      ? left.own_score - left.opponent_score
      : left.opponent_score - left.own_score;
    const rightMargin = type === "win"
      ? right.own_score - right.opponent_score
      : right.opponent_score - right.own_score;
    return rightMargin - leftMargin || right.own_score - left.own_score;
  })[0] ?? null;
}

function mapHighlight(row: MatchRow | null): SeasonMatchHighlight | null {
  if (!row) return null;
  return {
    opponent: row.opponent,
    matchDate: row.match_date,
    ownScore: row.own_score,
    opponentScore: row.opponent_score,
    location: row.location === "away" ? "away" : "home",
  };
}
