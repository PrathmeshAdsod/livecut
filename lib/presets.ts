export type Renderer =
  | "news"
  | "caption"
  | "cinema"
  | "documentary"
  | "sports"
  | "memo";
export type Preset = {
  id: string;
  name: string;
  category: string;
  renderer: Renderer;
  icon: string;
  prompt: string;
  label: string;
  detailLabel: string;
  example: string;
  detailExample: string;
  badge: string;
};
const specs: [string, Renderer, string, string, string, string][][] = [
  [
    [
      "Funny Caption",
      "caption",
      "😂",
      "Find the perfectly timed punchline.",
      "Rescue complete. Hero missing.",
      "When all your skill points went into friendship",
    ],
    [
      "Inner Monologue",
      "caption",
      "💭",
      "Give the character a thought they regret.",
      "I have made a small tactical error.",
      "Internal voice. External consequences.",
    ],
    [
      "Reaction Meme",
      "caption",
      "🎭",
      "Escalate calm into chaos.",
      "Everything is absolutely under control.",
      "Me, three seconds before disaster",
    ],
    [
      "POV Caption",
      "caption",
      "👀",
      "Reframe the moment from an unexpected viewpoint.",
      "POV: you are the safety instructor.",
      "Your first day was also your last",
    ],
    [
      "Friendly Roast",
      "caption",
      "🔥",
      "Roast the gameplay, never the person.",
      "The landing tutorial remains undefeated.",
      "A masterclass in missing the point",
    ],
    [
      "Wrong Answers Only",
      "news",
      "❓",
      "Explain the scene with an absurd fictional theory.",
      "Player demonstrates advanced reverse flying.",
      "Experts describe the technique as falling",
    ],
    [
      "Sarcastic Subtitle",
      "caption",
      "🙃",
      "Write the least convincing reassuring subtitle.",
      "Exactly as rehearsed.",
      "No rehearsals were held",
    ],
    [
      "Meme Poster",
      "cinema",
      "🖼️",
      "Give a tiny mistake an epic movie poster.",
      "GRAVITY: THE REMATCH",
      "This time, it is still personal.",
    ],
    [
      "Expectation vs Reality",
      "caption",
      "⚡",
      "Put reality in the main line and the plan in the setup.",
      "An express trip to the bottom.",
      "A graceful rescue mission",
    ],
    [
      "Character Dialogue",
      "caption",
      "🎙️",
      "Put the reply in the main line and first speaker in the setup.",
      "Define safe.",
      "I thought you said this was safe.",
    ],
  ],
  [
    [
      "Breaking News",
      "news",
      "📰",
      "Write a fictional headline that makes this moment ridiculous.",
      "Local hero saves friend, forgets gravity.",
      "Rescue successful • Landing under investigation",
    ],
    [
      "Live Reporter",
      "news",
      "🎤",
      "Report from the fictional scene with unnecessary urgency.",
      "Reports of a disappearing hero are coming in.",
      "Back to our studio, where the floor is stable",
    ],
    [
      "Weather Alert",
      "news",
      "🌦️",
      "Forecast chaos in this fictional game world.",
      "High chance of heroes, followed by a sudden drop.",
      "Gravity advisory remains in effect",
    ],
    [
      "Tabloid Headline",
      "news",
      "✍️",
      "Make a harmless moment absurdly sensational.",
      "ONE JUMP. ZERO PLANS. SEVERAL QUESTIONS.",
      "Fictional exclusive: the cliff tells all",
    ],
    [
      "Investigation Report",
      "memo",
      "🔎",
      "Investigate the mishap like a formal commission.",
      "The ground was not consulted.",
      "The jump occurred before the plan",
    ],
    [
      "Talk Show",
      "news",
      "📺",
      "Create the fictional talk-show segment nobody requested.",
      "Tonight: can friendship defeat physics?",
      "Our guest could not make the landing",
    ],
    [
      "Fake Interview",
      "news",
      "🎥",
      "Invent a post-game interview. No real-person impersonation.",
      "I stand by my decision. From very far below.",
      "Would you try that rescue again?",
    ],
    [
      "Traffic Report",
      "news",
      "🚦",
      "Describe the movement as an unhelpful traffic bulletin.",
      "One-way traffic down the canyon.",
      "No delays. No return route either.",
    ],
    [
      "Historical Headline",
      "news",
      "📜",
      "Write a fictional history-textbook headline.",
      "A giant leap for one very confused hero.",
      "Historians disagree on whether there was a plan",
    ],
    [
      "Emergency Bulletin",
      "news",
      "🚨",
      "Issue a clearly fictional game-world notice.",
      "The rescue team requires a rescue team.",
      "Parody bulletin about a fictional game",
    ],
  ],
  [
    [
      "Movie Trailer",
      "cinema",
      "🎬",
      "Give the clip an epic title and overdramatic tagline.",
      "THE LAST JUMP",
      "One friend. One chance. No landing plan.",
    ],
    [
      "Documentary",
      "documentary",
      "🌍",
      "Narrate a tiny disaster with serious gravitas.",
      "Here, the hero discovers the limits of optimism.",
      "The extraordinary lives of ordinary mistakes",
    ],
    [
      "Villain Origin",
      "cinema",
      "🦹",
      "Make the mishap a fictional villain’s origin.",
      "THE FALL OF A HERO",
      "They trusted the platform. Their first mistake.",
    ],
    [
      "Nature Documentary",
      "documentary",
      "🦋",
      "Observe the player as an imaginary species.",
      "The rescuer performs its annual leap of questionable judgment.",
      "The common overconfident jumper",
    ],
    [
      "Fantasy Narrator",
      "documentary",
      "🧙",
      "Tell a miniature fantasy legend.",
      "And so the brave one descended ahead of schedule.",
      "The fellowship of the missing platform",
    ],
    [
      "Horror Trailer",
      "cinema",
      "🌑",
      "Make an ordinary mechanic feel ominous.",
      "BELOW",
      "Some floors are better left unfound.",
    ],
    [
      "Romantic Comedy",
      "cinema",
      "💌",
      "Make the game mishap a sweet fictional romcom.",
      "FALLING FOR YOU",
      "The chemistry was real. So was the drop.",
    ],
    [
      "Space Opera",
      "cinema",
      "🚀",
      "Set the moment in an imaginary space epic.",
      "A NEW FALL",
      "In a canyon not particularly far away…",
    ],
    [
      "Bedtime Story",
      "documentary",
      "🌙",
      "Write the ending and opening of a gentle absurd bedtime story.",
      "Everyone slept soundly, except the rescue coordinator.",
      "There lived a hero with too much confidence",
    ],
    [
      "Plot Twist",
      "cinema",
      "🌀",
      "Reveal the twist that reframes everything.",
      "THE FLOOR WAS OPTIONAL",
      "It was supposed to be a rescue.",
    ],
  ],
  [
    [
      "Corporate Disaster",
      "memo",
      "🏢",
      "Translate the mistake into painfully professional language.",
      "Unscheduled vertical relocation.",
      "Friendship KPIs achieved. Landing targets remain outstanding.",
    ],
    [
      "Fake Advertisement",
      "news",
      "📢",
      "Advertise an imaginary product to prevent this.",
      "Introducing Landing Plan Plus.",
      "100% more thinking before jumping. Fictional product.",
    ],
    [
      "Patch Notes",
      "memo",
      "🛠️",
      "Write imaginary patch notes for the exact mistake.",
      "Hero 2.0: landing now supported.",
      "Fixed confidence exceeding available platform.",
    ],
    [
      "Product Review",
      "memo",
      "⭐",
      "Review an imaginary item or game mechanic.",
      "Gravity: reliable, poor customer service.",
      "One star. Worked exactly as described.",
    ],
    [
      "Group Chat",
      "caption",
      "💬",
      "Write the two-message chat immediately after the clip.",
      "Can someone pick me up? Literally.",
      "Good news: I saved them.",
    ],
    [
      "Loading Screen Tip",
      "caption",
      "⌛",
      "Write a game tip that arrived too late.",
      "Try landing on the platform.",
      "PRO TIP #404",
    ],
    [
      "Terms & Conditions",
      "memo",
      "📄",
      "Write fictional fine print for the situation.",
      "Rescue excludes return travel.",
      "The hero accepts that gravity is non-refundable.",
    ],
    [
      "Search History",
      "memo",
      "🔍",
      "Invent the character’s next search and suggested result.",
      "how to undo a jump",
      "Did you mean: learn from your mistakes?",
    ],
    [
      "Support Ticket",
      "memo",
      "🎫",
      "File a fictional support request about the mishap.",
      "Floor missing after successful rescue.",
      "Expected: applause. Actual: prolonged descent.",
    ],
    [
      "Social Status",
      "caption",
      "📱",
      "Write the character’s painfully optimistic status.",
      "Taking time to find myself. Below the map.",
      "Feeling: gravitational",
    ],
  ],
  [
    [
      "Sports Commentary",
      "sports",
      "🏆",
      "Call the play with over-the-top enthusiasm.",
      "WHAT A SAVE! WHAT AN UNNECESSARY FALL!",
      "Friendship 1 — Gravity 1",
    ],
    [
      "Achievement Unlocked",
      "sports",
      "🏅",
      "Invent an accidentally earned achievement.",
      "SELFLESS. ALSO FLOORLESS.",
      "Save a friend while losing platform privileges.",
    ],
    [
      "Mission Failed",
      "sports",
      "🎯",
      "Grade the mission’s mixed results.",
      "TASK FAILED SUCCESSFULLY",
      "Objective complete. Hero retrieval pending.",
    ],
    [
      "Speedrun Split",
      "sports",
      "⏱️",
      "Name an absurd new speedrun record.",
      "ANY% RETURN TO CHECKPOINT",
      "A personal best in immediate consequences.",
    ],
    [
      "Coach Review",
      "sports",
      "📋",
      "Give practical, funny fictional coaching.",
      "Great commitment. Questionable geography.",
      "Next session: identifying the ground.",
    ],
    [
      "Mock Incident Report",
      "memo",
      "📝",
      "Log the game incident with bureaucratic precision.",
      "Case 004: hero temporarily unavailable.",
      "Root cause: ambitious interpretation of jump distance.",
    ],
    [
      "Boss Introduction",
      "cinema",
      "👑",
      "Reveal an everyday mechanic as the final boss.",
      "GRAVITY",
      "It has never lost a match.",
    ],
    [
      "Tutorial Voice",
      "documentary",
      "🎮",
      "Write an instructional voiceover losing confidence.",
      "Simply jump to the other—actually, never mind.",
      "Advanced rescue: an incomplete guide",
    ],
    [
      "Match MVP",
      "sports",
      "🥇",
      "Award the least likely participant the MVP.",
      "THE CHECKPOINT",
      "For being there when nobody else was.",
    ],
    [
      "Community Challenge",
      "sports",
      "⚔️",
      "Invent a repeatable challenge inspired by the moment.",
      "THE NO-PLAN RESCUE",
      "Save the friend. Bonus points for surviving.",
    ],
  ],
];
export const categories = [
  "Comedy & Memes",
  "News & Broadcast",
  "Cinema & Story",
  "Internet Culture",
  "Challenges & Commentary",
];
const labels: Record<Renderer, [string, string]> = {
  news: ["Your headline", "News ticker"],
  caption: ["Your punchline", "The setup"],
  cinema: ["Movie title", "Tagline"],
  documentary: ["Narration", "Episode title"],
  sports: ["The call", "Scoreboard / commentary"],
  memo: ["Memo subject", "Executive summary"],
};
export const presets: Preset[] = specs.flatMap((g, i) =>
  g.map(([name, renderer, icon, prompt, example, detailExample]) => ({
    id: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, ""),
    name,
    renderer,
    icon,
    prompt,
    example,
    detailExample,
    category: categories[i],
    label: labels[renderer][0],
    detailLabel: labels[renderer][1],
    badge:
      renderer === "news"
        ? "PARODY"
        : renderer === "memo"
          ? "FICTIONAL MEMO"
          : renderer === "cinema"
            ? "COMMUNITY CINEMA"
            : "COMMUNITY CREATION",
  })),
);
export const flagshipIds = [
  "breaking-news",
  "funny-caption",
  "movie-trailer",
  "documentary",
  "sports-commentary",
  "corporate-disaster",
];
export function getPreset(id: string) {
  return (
    presets.find((p) => p.id === id) ??
    presets.find((p) => p.id === "breaking-news")!
  );
}
