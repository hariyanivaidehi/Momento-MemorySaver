import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Memory, { IMemory } from "@/models/Memory";

const STOP_WORDS = new Set([
  "the", "is", "a", "of", "to", "and", "in", "it", "you", "that", "he", "was", "for", "on", "are", "as", 
  "with", "his", "they", "i", "my", "me", "how", "what", "where", "who", "when", "why", "about", "your"
]);

// Helper to tokenize and score text relevance
function calculateRelevance(query: string, memory: IMemory): number {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  if (queryWords.length === 0) return 0;
  
  let score = 0;
  const titleLower = memory.title.toLowerCase();
  const contentLower = memory.content.toLowerCase();
  const tagsLower = memory.tags.map(t => t.toLowerCase());

  queryWords.forEach(word => {
    if (titleLower.includes(word)) {
      score += 8;
    }
    tagsLower.forEach(tag => {
      if (tag.includes(word)) {
        score += 4;
      }
    });
    if (contentLower.includes(word)) {
      const occurrences = (contentLower.match(new RegExp(word, "g")) || []).length;
      score += occurrences * 2;
    }
  });

  return score;
}

// Generate warm, reflective, first-person human speech
function synthesizeResponse(memory: IMemory, score: number, query: string): { response: string; telemetry: any } {
  const congruence = Math.min(75 + score * 3, 99.8).toFixed(1);
  
  // Natural human reflective preambles
  const responses = [
    `Thinking about that... I remember "${memory.title}". Looking back, here is what comes to mind: "${memory.content}". I recall feeling a deep sense of ${memory.emotion} during that moment, especially when I think about how it relates to ${memory.tags.length > 0 ? memory.tags.join(" and ") : "life"}.`,
    `I have a clear memory of "${memory.title}" that relates to this. I wrote: "${memory.content}". It was a very ${memory.emotion} moment for me, tied closely to ${memory.tags.length > 0 ? memory.tags.join(" and ") : "my journey"}.`,
    `Ah, that reminds me of "${memory.title}". I remember: "${memory.content}". When I reflect on it now, it brings back a ${memory.emotion} feeling, connected to ${memory.tags.length > 0 ? memory.tags.join(" and ") : "my thoughts"}.`
  ];

  const responseText = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    response: responseText,
    telemetry: {
      congruence: `${congruence}%`,
      synapseId: memory._id ? memory._id.toString().substring(18) : "local-node-" + Math.floor(Math.random() * 1000),
      resonance: memory.emotion.toUpperCase(),
      concepts: memory.tags,
      timestamp: memory.timestamp
    }
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, clientMemories } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: "Synaptic input query is empty." }, { status: 400 });
    }

    let memories: IMemory[] = [];
    let isOffline = false;

    // Attempt to query MongoDB
    try {
      await connectToDatabase();
      memories = await Memory.find({});
    } catch (dbError) {
      console.warn("Database offline. Defaulting to client memories configuration.");
      isOffline = true;
      if (clientMemories && Array.isArray(clientMemories)) {
        memories = clientMemories;
      }
    }

    if (memories.length === 0) {
      return NextResponse.json({
        success: true,
        response: "I don't have any memories saved in my archive yet. Please go to the Memoir Deck and write down some of your stories or thoughts. That way, I can begin learning who you are and speak with your voice.",
        telemetry: {
          congruence: "0.0%",
          synapseId: "N/A",
          resonance: "VOID",
          concepts: [],
          isOffline
        }
      });
    }

    // Score memories
    const scoredMemories = memories.map(mem => ({
      memory: mem,
      score: calculateRelevance(message, mem)
    }));

    // Sort by highest score
    scoredMemories.sort((a, b) => b.score - a.score);
    const topMatch = scoredMemories[0];

    // If score is 0, return fallback
    if (!topMatch || topMatch.score === 0) {
      const randomMem = memories[Math.floor(Math.random() * memories.length)];
      return NextResponse.json({
        success: true,
        response: `I don't have a direct memory of "${message}", but it makes me think of "${randomMem.title}", where I remember: "${randomMem.content}". That was a very ${randomMem.emotion} time in my life.`,
        telemetry: {
          congruence: "55.0% (Associative Reflection)",
          synapseId: randomMem._id ? randomMem._id.toString().substring(18) : "divergent-node",
          resonance: randomMem.emotion.toUpperCase(),
          concepts: randomMem.tags,
          isOffline
        }
      });
    }

    // Synthesize response
    const { response, telemetry } = synthesizeResponse(topMatch.memory, topMatch.score, message);
    
    return NextResponse.json({
      success: true,
      response,
      telemetry: {
        ...telemetry,
        isOffline
      }
    });

  } catch (error: any) {
    console.error("Error running local heuristic NLP AI simulation:", error);
    return NextResponse.json({
      success: false,
      response: "I am having trouble accessing my memory core right now. Please try again in a moment.",
      telemetry: {
        congruence: "0.0%",
        synapseId: "ERROR",
        resonance: "CRITICAL_FAILURE",
        concepts: []
      }
    }, { status: 500 });
  }
}
