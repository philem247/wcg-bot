// Hand-written hard FPL questions (2026-10). Plausible decoys, settled
// facts only; rules that have changed are pinned to a season.
const q = (template, text, correct, wrong) => ({ template, q: text, correct, wrong })

export const PACK = {
  category: 'fpl',
  questions: [
    // ── Scoring ─────────────────────────────
    q('hard-scoring', 'How many FPL points does a midfielder get for scoring a goal?', '5', ['4', '6', '3']),
    q('hard-scoring', 'How many FPL points does a forward get for scoring a goal?', '4', ['5', '6', '3']),
    q('hard-scoring', 'How many FPL points does a defender get for scoring a goal?', '6', ['5', '4', '7']),
    q('hard-scoring', 'How many FPL points does a midfielder get for a clean sheet?', '1', ['0', '2', '4']),
    q('hard-scoring', 'How many FPL points does a defender get for a clean sheet?', '4', ['3', '5', '6']),
    q('hard-scoring', 'How many FPL points is an assist worth?', '3', ['2', '1', '4']),
    q('hard-scoring', 'How many FPL appearance points does a player get for playing 60 minutes or more?', '2', ['1', '3', '4']),
    q('hard-scoring', 'How many FPL appearance points does a player get for playing under 60 minutes?', '1', ['0', '2', '3']),
    q('hard-scoring', 'How many FPL points are deducted for a red card?', '3', ['1', '2', '4']),
    q('hard-scoring', 'How many FPL points are deducted for a yellow card?', '1', ['2', '3', '0']),
    q('hard-scoring', 'How many FPL points are deducted for missing a penalty?', '2', ['1', '3', '4']),
    q('hard-scoring', 'How many FPL points does a goalkeeper get for saving a penalty?', '5', ['3', '4', '6']),
    q('hard-scoring', 'How many FPL points are deducted for an own goal?', '2', ['1', '3', '4']),
    q('hard-scoring', 'In FPL, a goalkeeper earns 1 point for every how many saves?', '3', ['2', '4', '5']),
    q('hard-scoring', 'A defender loses 1 FPL point for every how many goals conceded?', '2', ['1', '3', '4']),
    q('hard-scoring', 'What is the most bonus points one player can earn in a single match?', '3', ['2', '4', '5']),
    q('hard-scoring', 'In FPL, what does BPS stand for?', 'Bonus Points System', ['Best Player Score', 'Bonus Performance Scale', 'Base Points System']),
    q('hard-scoring', 'Which new scoring category did FPL introduce for 2025/26?', 'Defensive contributions', ['Key passes', 'Shots on target', 'Successful dribbles']),
    q('hard-scoring', 'Under 2025/26 rules, how many points does a defender earn for 10 defensive contributions?', '2', ['1', '3', '4']),

    // ── Rules ─────────────────────────────
    q('hard-rules', 'How much money does every FPL manager start the season with?', '£100m', ['£90m', '£110m', '£105m']),
    q('hard-rules', 'What is the most players you can pick from a single Premier League club?', '3', ['2', '4', '5']),
    q('hard-rules', 'How many points does each FPL transfer beyond your free ones cost?', '4', ['2', '3', '6']),
    q('hard-rules', 'From 2024/25, what is the most free transfers an FPL manager can bank?', '5', ['2', '3', '4']),
    q('hard-rules', 'How many goalkeepers must an FPL squad contain?', '2', ['1', '3', '4']),
    q('hard-rules', 'How many forwards must an FPL squad contain?', '3', ['2', '4', '5']),
    q('hard-rules', 'How many midfielders must an FPL squad contain?', '5', ['4', '3', '6']),
    q('hard-rules', 'What is the fewest defenders an FPL starting XI can field?', '3', ['2', '4', '1']),
    q('hard-rules', 'Which of these formations is NOT allowed in FPL?', '2-5-3', ['5-2-3', '3-5-2', '4-5-1']),
    q('hard-rules', 'When you sell a player whose price has risen, how much of the rise do you keep?', 'Half', ['All of it', 'None', 'A quarter']),
    q('hard-rules', 'If your skipper does not play, whose points are doubled instead?', 'The vice-captain', ['The top scorer', 'The first sub', 'Nobody']),
    q('hard-rules', 'How long before the first kick-off of a gameweek is the FPL deadline?', '90 minutes', ['60 minutes', '30 minutes', '24 hours']),
    q('hard-rules', 'How many free transfers does an FPL manager normally get each gameweek?', '1', ['2', '0', '3']),

    // ── Chips ─────────────────────────────
    q('hard-chips', 'Which chip triples your armband player\'s points for one gameweek?', 'Triple Captain', ['Bench Boost', 'Wildcard', 'Free Hit']),
    q('hard-chips', 'Which chip adds your four substitutes\' points to your score for one gameweek?', 'Bench Boost', ['Triple Captain', 'Free Hit', 'Wildcard']),
    q('hard-chips', 'Which chip lets you rebuild your squad for one gameweek before it reverts?', 'Free Hit', ['Wildcard', 'Bench Boost', 'Triple Captain']),
    q('hard-chips', 'Which chip makes all your transfers permanent and free for that gameweek?', 'Wildcard', ['Free Hit', 'Bench Boost', 'Triple Captain']),
    q('hard-chips', 'In 2024/25, how many Wildcards did each manager get?', 'Two', ['One', 'Three', 'Four']),
    q('hard-chips', 'Which chip, added in 2024/25, let you pick a Premier League boss for three gameweeks?', 'Assistant Manager', ['Free Hit', 'Bench Boost', 'Triple Captain']),

    // ── Terms ─────────────────────────────
    q('hard-terms', 'In FPL, what is a "blank gameweek" for a team?', 'They have no fixture', ['They play twice', 'They play at home', 'They score no goals']),
    q('hard-terms', 'In FPL, what does a "double gameweek" mean for a team?', 'They play twice', ['They have no fixture', 'Their points double', 'They play at home']),
    q('hard-terms', 'In FPL slang, what is a "differential"?', 'A low-owned player', ['A premium captain', 'A bench player', 'A price-rise target']),
    q('hard-terms', 'What is the FPL "Dream Team"?', "The gameweek's best XI", ['Your highest-value XI', "The season's top managers", 'A mini-league prize']),
    q('hard-terms', 'In FPL, what is a "hit"?', 'A transfer points cost', ['A captain who blanks', 'A price drop', 'A red card deduction']),

    // ── History and records ─────────────────────────────
    q('hard-history', 'In which year was Fantasy Premier League launched?', '2002', ['2000', '2004', '1998']),
    q('hard-history', 'Which player was the first to score over 300 FPL points in a season?', 'Mohamed Salah', ['Harry Kane', 'Kevin De Bruyne', 'Erling Haaland']),
    q('hard-history', 'As of the end of 2024/25, which player held the record for FPL points in a season?', 'Mohamed Salah', ['Erling Haaland', 'Harry Kane', 'Son Heung-min']),
    q('hard-history', 'In which FPL position is Mohamed Salah listed?', 'Midfielder', ['Forward', 'Defender', 'Winger']),
    q('hard-history', 'How many Premier League goals did Erling Haaland score in 2022/23?', '36', ['34', '32', '38']),
    q('hard-history', 'Who won the Premier League Golden Boot in 2023/24?', 'Erling Haaland', ['Cole Palmer', 'Ollie Watkins', 'Alexander Isak']),
    q('hard-history', 'Who won the Premier League Golden Boot in 2024/25?', 'Mohamed Salah', ['Alexander Isak', 'Erling Haaland', 'Chris Wood']),
  ],
}
