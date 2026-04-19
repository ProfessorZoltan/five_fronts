// Context-specific instructions content used inside InfoButton overlays.
// The Home screen gets a brief summary of variants and options. Other screens
// show detailed instructions tuned to the variant and options of the active
// game.

import { getVariant } from '../game/variants.js'

function Section({ title, children }) {
  return (
    <section>
      {title && (
        <h3 className="text-gold-400 font-semibold text-base mb-1 leading-tight">{title}</h3>
      )}
      <div className="space-y-2">{children}</div>
    </section>
  )
}

// --- Home screen: brief overview of variants and the Cannon Fodder option ---

export function HomeInstructions() {
  return (
    <>
      <Section title="Overview">
        <p>
          Two players, one deck. Each is dealt a pool of cards and builds 5-card
          poker hands from it. Players take turns playing hands against each
          other; the stronger poker hand wins the round. Whoever wins more
          rounds wins the game.
        </p>
      </Section>
      <Section title="Variants">
        <p><b className="text-gold-300">Standard</b> — 25 cards dealt each. Build 5 hands of 5. Game is 5 rounds.</p>
        <p><b className="text-gold-300">Three-Hand</b> — 18 cards dealt each. Build 3 hands of 5 (3 cards discarded). Game is 3 rounds.</p>
      </Section>
      <Section title="Option">
        <p>
          <b className="text-amber-400">Cannon Fodder ★</b> — Each player also
          gets a Joker. Playing a hand containing your Joker reverses the stakes
          for that round: if opponent's hand is weaker, they win the whole game;
          if stronger, they lose. If both players play a Joker in the same
          round, the reversal cancels. A hand with a Joker can't be played as
          the final hand.
        </p>
      </Section>
      <p className="text-xs text-gold-200/60">
        Tap the <span className="font-serif italic font-semibold">i</span> on
        any screen during a game for detailed instructions.
      </p>
    </>
  )
}

// --- Lobby screen ---

export function LobbyInstructions({ game }) {
  const v = getVariant(game?.variant)
  return (
    <>
      <Section title="Waiting Room">
        <p>
          Share your game code with your opponent (tap the code to copy). Once
          they join, you'll both be dealt cards and move to the Setting phase.
        </p>
      </Section>
      <Section title="This game">
        <p><b className="text-gold-300">{v.name}</b> — {v.tagline}. Game is {v.handCount} rounds.</p>
        {game?.cannonFodder && (
          <p>
            <b className="text-amber-400">Cannon Fodder ★</b> is on. Each player
            will receive an extra Joker and can choose to use it as a trap
            during matching.
          </p>
        )}
      </Section>
    </>
  )
}

// --- Setting phase ---

export function SettingInstructions({ game }) {
  const v = getVariant(game?.variant)
  const cf = game?.cannonFodder === true
  const targetCards = v.handCount * 5
  const hasDiscards = v.discardCount > 0 || cf
  return (
    <>
      <Section title="Setting Phase">
        <p>
          You've been dealt your pool. Arrange {targetCards} of them into
          {' '}{v.handCount} hands of 5 cards each.
        </p>
      </Section>
      <Section title="How to place">
        <ul className="list-disc ml-5 space-y-1">
          <li>Tap a card in your pool to select it.</li>
          <li>Tap an empty slot in a hand to place the selected card there.</li>
          <li>Tap a placed card to send it back to your pool.</li>
          <li>With a card selected, tap another card to swap positions.</li>
        </ul>
      </Section>
      {hasDiscards && (
        <Section title="Discards">
          <p>
            Any card left in your pool after every hand slot is filled will be
            discarded when you lock in. They don't come back.
          </p>
        </Section>
      )}
      <Section title="Face-up cards come later">
        <p>
          There's no face-up choice here — you'll pick which 3 of 5 cards to
          reveal when you actually play each hand during matching.
        </p>
      </Section>
      <Section title="Lock In">
        <p>
          Once every slot is filled, tap Lock In. The game starts when both
          players have locked in.
        </p>
      </Section>
      {cf && (
        <Section title="Cannon Fodder ★ — Joker">
          <p>
            Your Joker sits at the right end of your pool (it has no value or
            suit). You can place it in any hand, or leave it unplaced to
            discard it.
          </p>
          <p>
            A hand that contains the Joker <b>can't be played as the final
            hand</b>. Plan to play it in an earlier round — see the Matchup
            instructions during play for how the Joker changes a round.
          </p>
        </Section>
      )}
      <Section title="Poker hand ranks">
        <p>Strongest to weakest:</p>
        <p className="text-xs text-gold-200/80">
          Royal Flush · Straight Flush · Four of a Kind · Full House · Flush ·
          Straight · Three of a Kind · Two Pair · One Pair · High Card.
        </p>
        <p className="text-xs text-gold-200/60">Aces are high or low for straights (A-2-3-4-5 or 10-J-Q-K-A).</p>
      </Section>
    </>
  )
}

// --- Matchup phase (includes reveal) ---

export function MatchupInstructions({ game }) {
  const v = getVariant(game?.variant)
  const cf = game?.cannonFodder === true
  return (
    <>
      <Section title="Matchup Phase">
        <p>
          You play hands against each other one round at a time, for
          {' '}{v.handCount} rounds total. Whoever wins more rounds wins the game.
        </p>
      </Section>
      <Section title="Each round">
        <ol className="list-decimal ml-5 space-y-1">
          <li>
            <b>Play</b> — the playing player picks one of their remaining
            hands. On non-final rounds, they choose 3 of the 5 cards to show
            face-up; the other 2 stay hidden until reveal. On the final round,
            all 5 are shown automatically.
          </li>
          <li>
            <b>Respond</b> — the other player sees the face-up cards and picks
            one of their own hands to respond with. The responder reveals all
            5 cards — no face-up choice to make.
          </li>
          <li>
            <b>Reveal</b> — face-down cards flip. The stronger poker hand wins
            the round. Both tap Continue to advance.
          </li>
        </ol>
      </Section>
      <Section title="Turn order">
        <p>
          A coin flip picks who plays first. Roles alternate each round. In a
          {' '}{v.handCount}-round game, the first player plays in rounds
          {' '}{oddIndices(v.handCount)} and responds in rounds
          {' '}{evenIndices(v.handCount)}.
        </p>
      </Section>
      <Section title="Poker hand ranks">
        <p className="text-xs text-gold-200/80">
          Royal Flush · Straight Flush · Four of a Kind · Full House · Flush ·
          Straight · Three of a Kind · Two Pair · One Pair · High Card.
        </p>
        <p className="text-xs text-gold-200/60">Aces are high or low for straights (A-2-3-4-5 or 10-J-Q-K-A).</p>
      </Section>
      {cf && (
        <Section title="Cannon Fodder ★ — Joker">
          <p>
            Each player has one Joker. If you placed yours in a hand, that's
            your "Joker hand." A Joker contributes nothing to hand strength —
            it never pairs, never joins a flush or straight, and acts as the
            lowest possible kicker.
          </p>
          <p>Playing a Joker hand reverses the round's stakes:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>If opponent's hand is the <b>weaker</b> of the two, opponent wins the <i>entire game</i>.</li>
            <li>If opponent's hand is the <b>stronger</b> of the two, opponent <i>loses</i> the entire game.</li>
            <li>If both players play a Joker in the same round, the reversal cancels and the round resolves normally.</li>
          </ul>
          <p>
            A Joker hand can't be played as the final hand. If you still hold
            it going into the second-to-last round, you'll be forced to play
            it that round.
          </p>
          <p className="text-xs text-gold-200/60">
            Bluff tip: hiding the Joker face-down turns the hand into a trap —
            opponent can't tell and may play a strong response, triggering
            their loss. Countering with your own Joker cancels the trap.
          </p>
        </Section>
      )}
    </>
  )
}

// --- Results screen ---

export function ResultsInstructions({ game }) {
  const v = getVariant(game?.variant)
  return (
    <>
      <Section title="Game Over">
        <p>
          The game is complete. The final score is at the top and each round's
          outcome is listed below.
        </p>
        {game?.cannonFodderEnding && (
          <p className="text-amber-300">
            This game ended by <b>Cannon Fodder ★</b> — a Joker hand was played
            and the reversal took effect before the full {v.handCount} rounds
            were played.
          </p>
        )}
      </Section>
      <Section title="What next">
        <ul className="list-disc ml-5 space-y-1">
          <li><b>Rematch</b> — new game with the same opponent, same variant and options, fresh deal.</li>
          <li><b>New Game</b> — return home. Create or join a different game from there.</li>
        </ul>
      </Section>
    </>
  )
}

// Helpers for turn-order sentence in the MatchupInstructions.
function oddIndices(n) {
  // rounds where first player plays (currentPlayer === firstPlayer), 1-indexed
  const list = []
  for (let i = 1; i <= n; i++) if (i % 2 === 1) list.push(i)
  return humanList(list)
}
function evenIndices(n) {
  const list = []
  for (let i = 1; i <= n; i++) if (i % 2 === 0) list.push(i)
  return humanList(list)
}
function humanList(nums) {
  if (nums.length === 0) return '(none)'
  if (nums.length === 1) return String(nums[0])
  if (nums.length === 2) return `${nums[0]} and ${nums[1]}`
  return `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`
}
